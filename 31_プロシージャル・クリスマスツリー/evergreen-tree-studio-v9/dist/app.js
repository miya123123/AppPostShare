import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {GLTFExporter} from './vendor/GLTFExporter.js';
import {bindPreviewDismiss} from './preview-interactions.mjs';
import {buildTree} from './tree-model.js';
import {createLightPreview,createStaticSnapshot} from './light-animation.mjs';
import {DEFAULTS,PRESETS,LIMITS,normalizeConfig,parseSettings,serializeSettings,randomConfig,seededRandom} from './tree-config.mjs';

const $=id=>document.getElementById(id),all=selector=>[...document.querySelectorAll(selector)];
const KEY='evergreen-tree-studio:v1',motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reducedMotion=motionPreference.matches;
const previewOnlySettings=new Set(['motion','motionSpeed','glow']);
const presetDescriptions={classic:'あたたかな、いつものクリスマス。',snow:'ふわり、雪の森からの贈りもの。',legend:'物語の主役になる、黄金の輝き。',aurora:'夜空の色を、小さなツリーに。'};
let config={...DEFAULTS},model,renderer,scene,camera,controls,stageProps,flakes,lightPreview,lightTexture,envTarget,animationTime=0;
let autoRotate=!reducedMotion,theme='forest',scheduled=false,fitPending=false,toastTimer,expanded=false,previousFocus;
let showPedestal=true,rotationSpeed=1;
try{const preferences=JSON.parse(localStorage.getItem(KEY+':preview-options')||'{}');showPedestal=typeof preferences.showPedestal==='boolean'?preferences.showPedestal:true;rotationSpeed=typeof preferences.rotationSpeed==='number'&&Number.isFinite(preferences.rotationSpeed)?Math.round(Math.max(.1,Math.min(3,preferences.rotationSpeed))*10)/10:1;}catch{}
try{const saved=localStorage.getItem(KEY);if(saved)config=parseSettings(saved);}catch{}

function toast(message,error=false){
 const box=$('toast');box.textContent=message;box.classList.toggle('error',error);box.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('visible'),error?6000:3300);
}
function persist(){
 try{localStorage.setItem(KEY,serializeSettings(config));$('saveStatus').innerHTML='<span></span>この端末に自動保存';}
 catch{$('saveStatus').innerHTML='<span></span>自動保存は利用できません';}
}
function currentPreset(){return Object.keys(PRESETS).find(key=>Object.keys(DEFAULTS).every(k=>PRESETS[key].config[k]===config[k]));}
function syncUI(){
 for(const [key,[min,max]] of Object.entries(LIMITS)){
  const el=$(key);if(!el)continue;el.value=config[key];
  if(el.type==='range'){
   el.style.setProperty('--progress',((config[key]-min)/(max-min)*100)+'%');
   const unit=key==='height'?'m':key==='layers'?'段':key==='motionSpeed'?'倍':'%';
   const value=key==='height'||key==='motionSpeed'?config[key].toFixed(1):config[key];
   $('out-'+key).innerHTML=value+' <small>'+unit+'</small>';
   el.setAttribute('aria-valuetext',value+unit);
  }
 }
 $('out-trunkHeight').innerHTML=config.trunkHeight+' <small>% · '+(config.height*config.trunkHeight/100).toFixed(2)+'m</small>';
 $('trunkHeight').setAttribute('aria-valuetext',config.trunkHeight+'％、'+(config.height*config.trunkHeight/100).toFixed(2)+'メートル');
 for(const group of all('[data-options]'))for(const button of group.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.value===config[group.dataset.options]));
 const preset=currentPreset();
 for(const button of all('[data-preset]')){const active=button.dataset.preset===preset;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
 $('treeTitle').textContent=preset?PRESETS[preset].en:'Your Christmas';
 $('treeSubtitle').textContent=preset?presetDescriptions[preset]:'あなたの、小さな冬のかたち。';
 $('density').disabled=$('ornamentSize').disabled=config.ornament==='none';
 $('topperSize').disabled=config.topper==='none';
 $('lightDensity').disabled=$('glow').disabled=config.lights==='none';
 for(const button of document.querySelectorAll('[data-options="motion"] button'))button.disabled=config.lights==='none';
 $('motionSpeed').disabled=config.lights==='none'||config.motion==='steady'||reducedMotion;
 $('motionNote').textContent=reducedMotion?'端末の「動きを減らす」設定に合わせ、常灯で表示しています。':config.lights==='none'?'電飾の色を選ぶと、光のアニメーションを楽しめます。':config.motion==='steady'?'常灯では、電球が点滅せずに光り続けます。':'電球と周囲の光が、同じタイミングで点滅します。';
}
function applyConfig(next,{fit=false,message}={}){
 const previous=config;config=normalizeConfig(next);syncUI();persist();
 const geometryChanged=Object.keys(DEFAULTS).some(key=>!previewOnlySettings.has(key)&&previous[key]!==config[key]);
 if(geometryChanged)scheduleBuild(fit);else if(fit)resetCamera();
 lightPreview?.update(config,animationTime,reducedMotion);
 if(message)toast(message);
}
function scheduleBuild(fit=false){
 fitPending=fitPending||fit;if(scheduled)return;scheduled=true;
 requestAnimationFrame(()=>{scheduled=false;const shouldFit=fitPending;fitPending=false;try{rebuild(shouldFit);}catch(error){console.error(error);toast('ツリーの生成に失敗しました。設定を戻してお試しください。',true);}});
}
function disposeObject(object){
 if(!object)return;
 const geos=new Set(),mats=new Set();object.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>mats.add(m));}});
 for(const g of geos)g.dispose();for(const m of mats)m.dispose();object.removeFromParent();
}
function glowTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');
 const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.12,'rgba(255,255,255,.7)');gradient.addColorStop(.45,'rgba(255,255,255,.15)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
 return new T.CanvasTexture(canvas);
}
function makeStageProps(){
 const group=new T.Group();group.name='PreviewOnly';
 const pedestal=new T.Group();pedestal.name='PreviewPedestal';pedestal.visible=showPedestal;group.add(pedestal);
 const h=4.6,r=Math.max(h*.32,h*.25*config.spread/100*1.3);
 const topMat=new T.MeshStandardMaterial({color:0xe5e9df,roughness:.95});
 const sideMat=new T.MeshStandardMaterial({color:0xbcccbf,roughness:.8});
 const bottom=new T.Mesh(new T.CylinderGeometry(r*.99,r*.94,h*.043,72),sideMat);bottom.position.y=-h*.031;bottom.receiveShadow=true;pedestal.add(bottom);
 const top=new T.Mesh(new T.CylinderGeometry(r,r*.99,h*.016,72),topMat);top.position.y=-h*.008;top.receiveShadow=true;top.castShadow=true;pedestal.add(top);
 const trim=new T.Mesh(new T.TorusGeometry(r*.981,h*.0028,6,80),new T.MeshStandardMaterial({color:0xb9c9b0,metalness:.3,roughness:.7}));trim.rotation.x=Math.PI/2;trim.position.y=-h*.02;pedestal.add(trim);
 const shadow=new T.Mesh(new T.PlaneGeometry(r*5,r*5),new T.ShadowMaterial({opacity:.15}));shadow.name='PreviewGround';shadow.rotation.x=-Math.PI/2;shadow.position.y=showPedestal?-h*.055:-.001;shadow.receiveShadow=true;group.add(shadow);
 const palette=config.palette==='ice'?[0x91bfc5,0xe4d5ac]:config.foliage==='gold'?[0xa8772e,0xdfc378]:[0xa9443e,0xe4d5ac];
 const boxGeo=new T.BoxGeometry(1,1,1),ribbonMat=new T.MeshStandardMaterial({color:0xc4a66c,metalness:.5,roughness:.4});
 for(let i=0;i<3;i++){
  const size=h*(i===0?.071:i===1?.054:.045),gift=new T.Group();
  gift.position.set(-r*.58+i*h*.08,size/2+h*.004,r*.42+(i===1?.11:0));gift.rotation.y=.24+i*.42;
  const body=new T.Mesh(boxGeo,new T.MeshStandardMaterial({color:palette[i%2],roughness:.55}));body.scale.set(size,size*.9,size*.85);body.castShadow=true;gift.add(body);
  const ribbon=new T.Mesh(boxGeo,ribbonMat);ribbon.scale.set(size*.14,size*.92,size*.87);gift.add(ribbon);
  const cross=new T.Mesh(boxGeo,ribbonMat);cross.scale.set(size*1.02,size*.14,size*.87);gift.add(cross);
  group.add(gift);
 }
 return group;
}
function rebuild(fit=false){
 if(!renderer)return;
 const next=buildTree(config);
 if(lightPreview){scene.remove(lightPreview.root);lightPreview.dispose();}
 if(model){scene.remove(model.root);model.dispose();}
 model=next;scene.add(model.root);
 lightPreview=createLightPreview(model,lightTexture);lightPreview.update(config,animationTime,reducedMotion);scene.add(lightPreview.root);
 disposeObject(stageProps);stageProps=makeStageProps();scene.add(stageProps);
 if(flakes){disposeObject(flakes);}
 const r=seededRandom(config.seed,55),positions=[];
 for(let i=0;i<140;i++)positions.push((r()-.5)*config.height*2.6,r()*config.height*1.5,(r()-.5)*config.height*1.3);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 flakes=new T.Points(geometry,new T.PointsMaterial({color:0xe3eadc,size:config.height*.0038,transparent:true,opacity:.48,depthWrite:false}));flakes.name='PreviewSnowfall';flakes.visible=config.snow>0;scene.add(flakes);
 $('modelStats').innerHTML=config.height.toFixed(1)+'m <b>·</b> '+config.layers+'段 <b>·</b> '+(model.stats.triangles/1000).toFixed(1)+'k tris';
 if(fit)resetCamera();
 renderer.render(scene,camera);
 $('loading').hidden=true;
}
function resetCamera(){
 if(!camera)return;const h=config.height,aspect=$('stage').clientWidth/Math.max(1,$('stage').clientHeight);
 const bounds=model?new T.Box3().setFromObject(model.root):new T.Box3(new T.Vector3(-h*.4,0,-h*.4),new T.Vector3(h*.4,h,h*.4));
 const center=bounds.getCenter(new T.Vector3()),radius=bounds.getBoundingSphere(new T.Sphere()).radius;
 const halfFov=T.MathUtils.degToRad(camera.fov/2),angle=Math.min(halfFov,Math.atan(Math.tan(halfFov)*aspect));
 const dist=radius/Math.sin(angle)*1.08;
 controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(.24,.23,.97).normalize().multiplyScalar(dist));camera.near=h*.01;camera.far=Math.max(h*20,dist+h*4);camera.updateProjectionMatrix();controls.minDistance=h*.42;controls.maxDistance=Math.max(h*5,dist*2);controls.update();
}
function resize(){
 if(!renderer)return;const stage=$('stage'),width=stage.clientWidth,height=stage.clientHeight;
 if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
 renderer.render(scene,camera);
}
function setupScene(){
 renderer=new T.WebGLRenderer({canvas:$('canvas'),antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<600?1.5:1.75));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 scene=new T.Scene();camera=new T.PerspectiveCamera(38,1,.05,100);
 controls=new OrbitControls(camera,$('canvas'));controls.enableDamping=true;controls.dampingFactor=.075;controls.autoRotate=autoRotate;controls.autoRotateSpeed=.48*rotationSpeed;controls.maxPolarAngle=Math.PI-.08;controls.minPolarAngle=.08;controls.enablePan=true;controls.screenSpacePanning=true;
 controls.addEventListener('start',()=>{if(autoRotate)setAutoRotate(false);});
 const hemi=new T.HemisphereLight(0xf7f5db,0x3b5d50,2.0);scene.add(hemi);
 const key=new T.DirectionalLight(0xffe8c0,3.2);key.position.set(4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=key.shadow.camera.bottom=-6;key.shadow.camera.right=key.shadow.camera.top=6;key.shadow.camera.far=25;key.shadow.normalBias=.012;key.shadow.bias=-.0004;scene.add(key);
 const underside=new T.DirectionalLight(0xd7e5df,.55);underside.position.set(-3,-2,4);scene.add(underside);
 const fill=new T.DirectionalLight(0xd1e7f7,1.4);fill.position.set(-5,4,-3);scene.add(fill);
 const room=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);envTarget=pmrem.fromScene(room,.04);scene.environment=envTarget.texture;room.dispose();pmrem.dispose();
 lightTexture=glowTexture();
 rebuild(true);resize();new ResizeObserver(resize).observe($('stage'));
 $('canvas').addEventListener('webglcontextlost',event=>{event.preventDefault();$('loading').hidden=false;$('loading').classList.add('error');$('loading').textContent='3D描画が一時停止しました。設定は保持されています。ページを再読み込みしてください。';});
 let last=0;
 function frame(now){
  requestAnimationFrame(frame);if(document.hidden)return;
  const delta=Math.min(.05,(now-last)/1000||.016);last=now;
  animationTime+=delta;
  controls.update(delta);
  if(model){
   lightPreview.update(config,animationTime,reducedMotion);
   if(flakes&&flakes.visible&&!reducedMotion){const attr=flakes.geometry.attributes.position;for(let i=0;i<attr.count;i++){const next=attr.getY(i)-delta*config.height*.025;attr.setY(i,next<-.1?config.height*1.5:next);}attr.needsUpdate=true;}
  }
  updateGround();renderer.render(scene,camera);
 }
 requestAnimationFrame(frame);
}
function setAutoRotate(value){autoRotate=value;if(controls)controls.autoRotate=value;$('autoRotate').setAttribute('aria-pressed',String(value));}
function updateGround(){
 const ground=stageProps?.getObjectByName('PreviewGround');if(!ground)return;
 ground.position.y=showPedestal?-4.6*.055:-.001;
 ground.visible=!camera||camera.position.y>ground.position.y+.002;
}
function updatePreviewOptions({save=true}={}){
 $('showPedestal').checked=showPedestal;
 $('rotationSpeed').value=rotationSpeed;
 $('out-rotationSpeed').textContent=rotationSpeed.toFixed(1)+'倍';
 $('rotationSpeed').setAttribute('aria-valuetext',rotationSpeed.toFixed(1)+'倍');
 $('rotationSpeed').style.setProperty('--progress',((rotationSpeed-.1)/2.9*100)+'%');
 if(controls)controls.autoRotateSpeed=.48*rotationSpeed;
 const pedestal=stageProps?.getObjectByName('PreviewPedestal');if(pedestal)pedestal.visible=showPedestal;
 updateGround();if(renderer&&scene&&camera)renderer.render(scene,camera);
 if(save)try{localStorage.setItem(KEY+':preview-options',JSON.stringify({showPedestal,rotationSpeed}));}catch{}
}
function toggleExpand(){
 expanded=!expanded;
 if(expanded)previousFocus=document.activeElement;
 $('viewportCard').classList.toggle('expanded',expanded);document.body.classList.toggle('preview-expanded',expanded);
 $('expand').setAttribute('aria-expanded',String(expanded));$('expand').setAttribute('aria-label',expanded?'プレビューを閉じる':'プレビューを拡大');$('expand').title=expanded?'プレビューを閉じる':'プレビューを拡大';$('expand').querySelector('use').setAttribute('href',expanded?'#i-close':'#i-expand');
 if(expanded)$('expand').focus();else previousFocus?.focus();
 requestAnimationFrame(()=>{resize();resetCamera();});
}
function setPreviewPinned(value,{save=true}={}){
 const card=$('viewportCard'),holder=$('pinnedPreview');
 $('pinPreview').checked=value;
 if(value){holder.hidden=false;holder.append(card);}else{$('previewHome').after(card);holder.hidden=true;}
 if(save)try{localStorage.setItem(KEY+':pin-preview',String(value));}catch{}
 requestAnimationFrame(()=>{resize();resetCamera();});
}
function download(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
}
function flushBuild(){if(scheduled){scheduled=false;fitPending=false;rebuild(false);}}
async function exportGLB(){
 const button=$('exportGLB'),markup=button.innerHTML;
 if(!model)return;
 button.disabled=true;button.textContent='書き出し中…';
 let snapshot;
 try{
  flushBuild();
  const settings={...config};snapshot=createStaticSnapshot(model,settings);
  const result=await new GLTFExporter().parseAsync(snapshot.root,{binary:true,onlyVisible:true});
  download(new Blob([result],{type:'model/gltf-binary'}),'evergreen-'+settings.seed+'.glb');toast('ツリーのGLBモデルを書き出しました。');
 }catch(error){console.error(error);toast('GLBを書き出せませんでした。もう一度お試しください。',true);}
 finally{snapshot?.dispose();button.disabled=false;button.innerHTML=markup;}
}
async function exportPNG(){
 if(!renderer)return;
 try{
  flushBuild();lightPreview?.update(config,animationTime,reducedMotion);renderer.render(scene,camera);
  const output=document.createElement('canvas');output.width=renderer.domElement.width;output.height=renderer.domElement.height;const ctx=output.getContext('2d');
  const colors=theme==='snow'?['#f0f2e9','#dce6db','#d0ddd3']:theme==='night'?['#404b66','#262e46','#20273c']:['#3d5a46','#274836','#153429'];
  const gradient=ctx.createRadialGradient(output.width*.55,output.height*.38,0,output.width*.5,output.height*.5,Math.max(output.width,output.height)*.72);gradient.addColorStop(0,colors[0]);gradient.addColorStop(.6,colors[1]);gradient.addColorStop(1,colors[2]);ctx.fillStyle=gradient;ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(renderer.domElement,0,0);
  const blob=await new Promise((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(new Error('PNG encode failed')),'image/png'));
  download(blob,'evergreen-'+config.seed+'.png');toast('現在のプレビューをPNG画像で保存しました。');
 }catch(error){console.error(error);toast('PNG画像を保存できませんでした。',true);}
}
function switchTab(tab){
 for(const button of all('[data-tab]')){const selected=button.dataset.tab===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('panel-'+button.dataset.tab).hidden=!selected;}
}
function bindUI(){
 bindPreviewDismiss($('stage'),$('previewSettings'));
 updatePreviewOptions({save:false});
 $('showPedestal').addEventListener('change',event=>{showPedestal=event.target.checked;updatePreviewOptions();});
 $('rotationSpeed').addEventListener('input',event=>{const value=Number(event.target.value);if(!Number.isFinite(value))return;rotationSpeed=Math.round(Math.max(.1,Math.min(3,value))*10)/10;updatePreviewOptions();});
 motionPreference.addEventListener('change',event=>{
  reducedMotion=event.matches;syncUI();
  if(reducedMotion&&controls)setAutoRotate(false);
  lightPreview?.update(config,animationTime,reducedMotion);
 });
 $('pinPreview').addEventListener('change',event=>setPreviewPinned(event.target.checked));
 try{setPreviewPinned(localStorage.getItem(KEY+':pin-preview')==='true',{save:false});}catch{}
 $('seed').addEventListener('change',syncUI);
 for(const key of Object.keys(LIMITS)){
  const input=$(key);if(!input)continue;
  input.addEventListener('input',()=>{
   if(input.value==='')return;
   const next=Number(input.value);if(!Number.isFinite(next))return;
   if(key==='seed'&&(!Number.isInteger(next)||next<0||next>999999))return;
   applyConfig({...config,[key]:next},{fit:false});
  });
 }
 for(const group of all('[data-options]'))group.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled)return;applyConfig({...config,[group.dataset.options]:button.dataset.value});});
 for(const button of all('[data-tab]')){
  button.addEventListener('click',()=>switchTab(button.dataset.tab));
  button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=all('[data-tab]'),index=tabs.indexOf(button);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;switchTab(tabs[next].dataset.tab);tabs[next].focus();});
 }
 for(const button of all('[data-preset]'))button.addEventListener('click',()=>applyConfig(PRESETS[button.dataset.preset].config,{fit:true,message:PRESETS[button.dataset.preset].name+'のツリーにしました。'}));
 $('randomize').addEventListener('click',()=>{const seed=crypto.getRandomValues(new Uint32Array(1))[0]%1000000;applyConfig(randomConfig(seed),{fit:true,message:'新しい冬のかたちが見つかりました。'});});
 $('newSeed').addEventListener('click',()=>applyConfig({...config,seed:crypto.getRandomValues(new Uint32Array(1))[0]%1000000},{message:'飾りと枝の配置を変えました。'}));
 $('reset').addEventListener('click',()=>applyConfig(DEFAULTS,{fit:true,message:'最初のツリーに戻しました。'}));
 $('resetView').addEventListener('click',resetCamera);$('expand').addEventListener('click',toggleExpand);$('autoRotate').addEventListener('click',()=>setAutoRotate(!autoRotate));
 $('autoRotate').setAttribute('aria-pressed',String(autoRotate));
 for(const button of all('[data-bg]'))button.addEventListener('click',()=>{theme=button.dataset.bg;$('stage').dataset.theme=theme;for(const b of all('[data-bg]'))b.setAttribute('aria-pressed',String(b===button));});
 $('exportPNG').addEventListener('click',exportPNG);$('exportGLB').addEventListener('click',exportGLB);
 $('exportSettings').addEventListener('click',()=>{download(new Blob([serializeSettings(config)],{type:'application/json'}),'evergreen-'+config.seed+'.json');toast('再現用の設定をJSONで保存しました。');});
 $('importSettings').addEventListener('click',()=>$('settingsFile').click());
 $('settingsFile').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{if(file.size>100000)throw new Error('設定ファイルが大きすぎます。');const next=parseSettings(await file.text());applyConfig(next,{fit:true,message:'保存したツリーを再現しました。'});}catch(error){toast(error instanceof SyntaxError?'JSONを読み取れませんでした。設定ファイルをご確認ください。':error.message,true);}finally{event.target.value='';}
 });
 $('helpButton').addEventListener('click',()=>$('helpDialog').showModal());$('closeHelp').addEventListener('click',()=>$('helpDialog').close());
 $('helpDialog').addEventListener('click',event=>{if(event.target===$('helpDialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)event.target.close();}});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('previewSettings').open){$('previewSettings').open=false;$('previewSettings').querySelector('summary').focus();return;}
  if(event.key==='Escape'&&expanded){toggleExpand();return;}
  if(expanded&&event.key==='Tab'){
   const focusable=[...$('viewportCard').querySelectorAll('summary,button:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(el=>el.getClientRects().length),first=focusable[0],last=focusable.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
 });
 $('stage').addEventListener('keydown',event=>{
  if(event.target!==$('stage')||!camera)return;
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','0'].includes(event.key))return;
  event.preventDefault();setAutoRotate(false);if(event.key==='0'){resetCamera();return;}
  const offset=camera.position.clone().sub(controls.target),spherical=new T.Spherical().setFromVector3(offset);
  if(event.key==='ArrowLeft')spherical.theta-=.12;if(event.key==='ArrowRight')spherical.theta+=.12;
  if(event.key==='ArrowUp')spherical.phi=Math.max(controls.minPolarAngle,spherical.phi-.1);if(event.key==='ArrowDown')spherical.phi=Math.min(controls.maxPolarAngle,spherical.phi+.1);
  if(['+','='].includes(event.key))spherical.radius=Math.max(controls.minDistance,spherical.radius*.9);if(event.key==='-')spherical.radius=Math.min(controls.maxDistance,spherical.radius*1.1);
  camera.position.copy(new T.Vector3().setFromSpherical(spherical).add(controls.target));controls.update();
 });
}

syncUI();bindUI();
try{setupScene();}catch(error){console.error(error);$('loading').hidden=false;$('loading').classList.add('error');$('loading').textContent='3Dプレビューを開始できませんでした。WebGL対応ブラウザでページを開き直してください。';for(const id of ['exportGLB','exportPNG','autoRotate','resetView','expand'])$(id).disabled=true;}
