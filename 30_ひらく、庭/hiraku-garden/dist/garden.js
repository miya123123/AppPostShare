import {makeGarden,updateGarden,goTo,interact,nearest,allObjects,snapshot,clamp,DISCOVERIES} from './garden-core.js';
import {leaveEnding} from './garden-ending.js';
import {makeRenderer} from './garden-render.js';
import {installDebug} from './garden-debug.js';
import {toggleHint,stopHint,updateHint} from './garden-hints.js';

const SAVE='hiraku-garden-v1',SETTINGS='hiraku-garden-sound',HINT_SETTINGS='hiraku-garden-hints';
let saved={};try{saved=JSON.parse(localStorage.getItem(SAVE)||'{}')||{};}catch{}
const canvas=document.getElementById('garden'),g=makeGarden(saved),r=makeRenderer(canvas,g);
try{g.hintsEnabled=localStorage.getItem(HINT_SETTINGS)==='on';}catch{}
const action=document.getElementById('touch'),overview=document.getElementById('overview'),soundButton=document.getElementById('sound'),fullscreen=document.getElementById('fullscreen');
const joystick=document.getElementById('joystick'),stick=document.getElementById('stick');
const restartButton=document.getElementById('restart'),restartProgress=document.getElementById('restart-progress'),renewal=document.getElementById('renewal');
const hintButton=document.getElementById('hint');
const endingPanel=document.getElementById('ending'),endingReturn=document.getElementById('ending-return'),hud=document.querySelector('.hud');
let endingOpen=false;const endingVoices=new Set();
let restartHold=null,restartTransition=null;
let muted=false;try{muted=localStorage.getItem(SETTINGS)==='off';}catch{}
let audio=null,master=null,started=false,lastAmbient=0;
function audioStart(){
  if(!audio){try{audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=muted?0:.42;master.connect(audio.destination);}catch{return;}}
  if(audio.state==='suspended')audio.resume().catch(()=>{});started=true;
}
function play(notes,type='soft'){
  if(!audio||muted||!started)return;
  notes.forEach((n,i)=>{
    const endingTone=type==='ending',warm=type==='warm'||endingTone,gentle=warm||type==='warm-bell';
    const t=audio.currentTime+i*(warm?.18:.105),f=440*Math.pow(2,(n-69)/12),duration=type==='bell'||type==='chime'?1.4:endingTone?3.4:warm?3:type==='warm-bell'?2:type==='wood'?.2:.85;
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=type==='wood'?'triangle':'sine';osc.frequency.setValueAtTime(f,t);
    if(type==='spring')osc.frequency.exponentialRampToValueAtTime(f*1.45,t+.16);
    if(type==='water')osc.frequency.exponentialRampToValueAtTime(f*.7,t+.22);
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(endingTone?.024:warm?.035:gentle?.045:type==='wood'?.06:.065,t+(endingTone?.32:gentle?.16:.012));gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    osc.connect(gain);gain.connect(master);osc.start(t);osc.stop(t+duration+.03);
    if(endingTone){endingVoices.add(gain);osc.onended=()=>endingVoices.delete(gain);}
    if(type==='bell'||type==='chime'){
      const o2=audio.createOscillator(),g2=audio.createGain();o2.frequency.value=f*2.01;g2.gain.setValueAtTime(.012,t);g2.gain.exponentialRampToValueAtTime(.0001,t+.65);o2.connect(g2);g2.connect(master);o2.start(t);o2.stop(t+.7);
    }
  });
}
function setSound(){document.body.classList.toggle('muted',muted);soundButton.setAttribute('aria-pressed',String(!muted));if(master)master.gain.setTargetAtTime(muted?0:.42,audio.currentTime,.08);}
setSound();
hintButton.addEventListener('click',()=>{if(restartTransition||debug.paused||g.ending)return;audioStart();toggleHint(g);try{localStorage.setItem(HINT_SETTINGS,g.hintsEnabled?'on':'off');}catch{}syncHintButton();updatePetals();});
function syncHintButton(){hintButton.setAttribute('aria-pressed',String(g.hintsEnabled));hintButton.setAttribute('aria-label',g.hintsEnabled?'ヒントをOFFにする':'ヒントをONにする');}
soundButton.addEventListener('click',()=>{audioStart();muted=!muted;setSound();try{localStorage.setItem(SETTINGS,muted?'off':'on');}catch{}if(!muted)play([72,79]);});
overview.addEventListener('click',()=>{if(restartTransition||debug.paused||g.ending)return;audioStart();r.overview=!r.overview;overview.setAttribute('aria-pressed',String(r.overview));play([64,71]);});
if(!document.fullscreenEnabled)fullscreen.hidden=true;
fullscreen.addEventListener('click',async()=>{audioStart();try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{}});
document.addEventListener('fullscreenchange',()=>fullscreen.setAttribute('aria-pressed',String(!!document.fullscreenElement)));
action.addEventListener('pointerdown',e=>{e.preventDefault();if(restartTransition||debug.paused||g.ending)return;audioStart();interact(g);});
action.addEventListener('click',e=>{if(e.detail===0&&!restartTransition&&!debug.paused&&!g.ending){audioStart();interact(g);}});
let lastFound=-1,lastPetalState='';
function updatePetals(){
  const hint=g.hint,signature=DISCOVERIES.map(id=>Number(g.found.has(id))).join('')+':'+(hint?.category||'')+':'+!!hint?.undiscovered;
  if(lastFound===g.found.size&&lastPetalState===signature)return;lastFound=g.found.size;lastPetalState=signature;
  let html='';
  for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/2,x=32+Math.cos(a)*17,y=32+Math.sin(a)*17,deg=a*180/Math.PI+90,active=hint?.category===DISCOVERIES[i];html+=`<ellipse cx="${x}" cy="${y}" rx="6" ry="10" transform="rotate(${deg} ${x} ${y})" fill="${g.found.has(DISCOVERIES[i])?['#e8b58b','#e8c77d','#c8ce83','#9abd86','#83b9a0','#89bac2','#b0b6ce','#d1b3bd'][i]:'#d3d9bb'}"${active?` class="hint-petal ${hint.undiscovered?'unfound':'familiar'}"`:''}/>`;}
  html+='<circle cx="32" cy="32" r="6" fill="#f6dda1"/><circle cx="30.5" cy="30.5" r="1.8" fill="#fff5d2"/>';
  document.getElementById('petals').innerHTML=html;
}
const keys=new Set();let pointer=null,dragInput={x:0,z:0};
function finishPointer(){pointer=null;dragInput={x:0,z:0};joystick.classList.remove('active');joystick.style.left='';joystick.style.top='';joystick.style.bottom='';stick.style.transform='';}
function cancelRestartHold(){
  const hold=restartHold;restartHold=null;restartProgress.style.strokeDashoffset='1';restartButton.classList.remove('holding');
  if(hold?.pointerId!=null&&restartButton.hasPointerCapture(hold.pointerId))restartButton.releasePointerCapture(hold.pointerId);
}
function startRestartHold(source){
  if(restartHold||restartTransition||debug.paused||g.ending)return;
  audioStart();restartHold={...source,start:performance.now()};restartButton.classList.add('holding');
}
restartButton.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.isPrimary===false)return;
  e.preventDefault();restartButton.focus({preventScroll:true});startRestartHold({pointerId:e.pointerId});
  if(restartHold?.pointerId===e.pointerId)restartButton.setPointerCapture(e.pointerId);
});
restartButton.addEventListener('pointermove',e=>{
  if(restartHold?.pointerId!==e.pointerId)return;
  const b=restartButton.getBoundingClientRect();
  if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)cancelRestartHold();
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])restartButton.addEventListener(type,e=>{if(restartHold?.pointerId===e.pointerId)cancelRestartHold();});
restartButton.addEventListener('pointerleave',()=>{if(restartHold?.pointerId!=null)cancelRestartHold();});
restartButton.addEventListener('keydown',e=>{
  if(e.code==='Escape'){cancelRestartHold();return;}
  if(e.code!=='Space'&&e.code!=='Enter')return;
  e.preventDefault();if(!e.repeat)startRestartHold({code:e.code});
});
restartButton.addEventListener('keyup',e=>{if(e.code==='Space'||e.code==='Enter')e.preventDefault();if(restartHold?.code===e.code)cancelRestartHold();});
restartButton.addEventListener('blur',cancelRestartHold);
restartButton.addEventListener('click',e=>e.preventDefault());
restartButton.addEventListener('contextmenu',e=>e.preventDefault());
function resetGarden(fresh){
  fresh.hintsEnabled=g.hintsEnabled;
  Object.assign(g,fresh);r.reset();lastFound=-1;lastSave=0;lastAmbient=0;wasNear=false;
  overview.setAttribute('aria-pressed','false');action.classList.remove('carrying','ready');updatePetals();
  if(!r.reduced)r.emit({kind:'leaves',x:8,z:23});
  syncEnding();save();
}
function beginRestart(){
  stopHint(g);syncHintButton();
  cancelRestartHold();keys.clear();finishPointer();g.path=[];g.target=null;
  const fresh=makeGarden();play([67,72,79],'soft');
  if(r.reduced){resetGarden(fresh);canvas.focus({preventScroll:true});return;}
  restartTransition={fresh,start:performance.now(),swapped:false};document.body.classList.add('restarting');
  r.emit({kind:'leaves',x:g.player.x,z:g.player.z});save();
}
function updateRestart(now){
  let committed=false;
  if(restartHold){
    const progress=clamp((now-restartHold.start)/1500,0,1);restartProgress.style.strokeDashoffset=String(1-progress);
    if(progress===1){beginRestart();committed=true;}
  }
  if(!restartTransition)return committed;
  const transition=restartTransition,p=clamp((now-transition.start)/1100,0,1),smooth=t=>t*t*(3-2*t);
  if(!transition.swapped&&p>=.45){transition.swapped=true;resetGarden(transition.fresh);}
  renewal.style.opacity=String(p<.45?smooth(p/.45):1-smooth((p-.45)/.55));
  if(p===1){restartTransition=null;renewal.style.opacity='0';document.body.classList.remove('restarting');canvas.focus({preventScroll:true});}
  return true;
}
function screenInput(dx,dy){const z=dy/.65,x=dx+z*.18,d=Math.hypot(x,z);return d>.01?{x:x/d*Math.min(1,d/45),z:z/d*Math.min(1,d/45)}:{x:0,z:0};}
function hitObject(sx,sy){
  let best=null,bestD=1;
  for(const o of allObjects(g)){
    if(o.x>14&&g.stage<1||o.x>33&&g.stage<2)continue;
    const pp=r.project(o.x,o.z,(o.h||.3)*.62),radius=o.type==='tree'?2:o.type==='seed'?.62:o.type==='mushroom'&&o.big?1.3:1;
    const d=Math.hypot((sx-pp.x)/(r.s*radius),(sy-pp.y)/(r.s*radius*.85));
    if(d<bestD){bestD=d;best=o;}
  }
  return best;
}
canvas.addEventListener('pointerdown',e=>{
  if(restartTransition||debug.paused||g.ending)return;
  audioStart();canvas.focus({preventScroll:true});
  if(pointer)return;
  canvas.setPointerCapture(e.pointerId);
  const rect=joystick.getBoundingClientRect(),joy=e.clientX>rect.left-12&&e.clientX<rect.right+12&&e.clientY>rect.top-12&&e.clientY<rect.bottom+12;
  pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,drag:joy};
  if(joy){pointer.x=rect.left+rect.width/2;pointer.y=rect.top+rect.height/2;joystick.classList.add('active');dragInput=screenInput(e.clientX-pointer.x,e.clientY-pointer.y);}
});
canvas.addEventListener('pointermove',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;
  const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
  if(!pointer.drag&&Math.hypot(dx,dy)>8){
    pointer.drag=true;r.overview=false;overview.setAttribute('aria-pressed','false');
    joystick.classList.add('active');joystick.style.left=(pointer.x-45)+'px';joystick.style.top=(pointer.y-45)+'px';joystick.style.bottom='auto';
  }
  if(pointer.drag){dragInput=screenInput(dx,dy);const d=Math.hypot(dx,dy),f=d?Math.min(30,d)/d:0;stick.style.transform=`translate(${dx*f}px,${dy*f}px)`;}
});
canvas.addEventListener('pointerup',e=>{
  if(!pointer||e.pointerId!==pointer.id)return;
  if(!pointer.drag){
    const o=hitObject(e.clientX,e.clientY),p=r.unproject(e.clientX,e.clientY);
    if(o)goTo(g,o.x,o.z,o.id);else{goTo(g,p.x,p.z);if(g.path.length)r.mark(p.x,p.z);}
  }
  finishPointer();
});
canvas.addEventListener('pointercancel',finishPointer);
canvas.addEventListener('lostpointercapture',finishPointer);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
  if(g.ending){
    if(e.code==='Escape'){e.preventDefault();returnToGarden();}
    else if(e.code==='Tab'){e.preventDefault();endingReturn.focus({preventScroll:true});}
    else if(e.target!==endingReturn)e.preventDefault();
    return;
  }
  if(debug.paused)return;
  if(restartTransition){e.preventDefault();return;}
  if(e.code==='Escape')cancelRestartHold();
  if(e.target.tagName==='BUTTON'&&(e.code==='Space'||e.code==='Enter'))return;
  if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE'].includes(e.code)){
    e.preventDefault();audioStart();keys.add(e.code);
    if((e.code==='Space'||e.code==='KeyE')&&!e.repeat)interact(g);
    if(!['Space','KeyE'].includes(e.code)){r.overview=false;overview.setAttribute('aria-pressed','false');}
  }
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(restartHold?.code===e.code)cancelRestartHold();});
window.addEventListener('blur',()=>{cancelRestartHold();keys.clear();finishPointer();});
window.addEventListener('resize',()=>r.resize());
function save(){try{localStorage.setItem(SAVE,JSON.stringify(snapshot(restartTransition?.fresh||g)));g.dirty=false;}catch{}}
window.addEventListener('pagehide',()=>{cancelRestartHold();stopHint(g);save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelRestartHold();stopHint(g);syncHintButton();save();keys.clear();finishPointer();if(audio)audio.suspend().catch(()=>{});}else if(started&&audio)audio.resume().catch(()=>{});});
// Test-only debug integration (remove this block and import to uninstall).
const debug=installDebug({g,canvas,renderer:r,canOpen:()=>!restartTransition&&!g.ending,onChange:()=>{stopHint(g);updatePetals();save();},onPause:()=>{cancelRestartHold();keys.clear();finishPointer();}});
function fadeEndingAudio(){
  if(audio)for(const gain of endingVoices){gain.gain.cancelScheduledValues(audio.currentTime);gain.gain.setTargetAtTime(0,audio.currentTime,.18);}
  endingVoices.clear();
}
function syncEnding(){
  const open=!!g.ending;if(open===endingOpen)return;
  endingOpen=open;endingPanel.hidden=!open;document.body.classList.toggle('ending-open',open);
  hud.inert=open;action.inert=open;canvas.inert=open;canvas.setAttribute('aria-hidden',String(open));
  cancelRestartHold();keys.clear();finishPointer();g.path=[];g.target=null;
  if(open){stopHint(g);updatePetals();endingReturn.focus({preventScroll:true});}
  else{fadeEndingAudio();lastAmbient=g.t;canvas.focus({preventScroll:true});}
  save();
}
function returnToGarden(){if(leaveEnding(g))syncEnding();}
endingReturn.addEventListener('click',returnToGarden);
let prev=performance.now(),lastSave=0,wasNear=false,lastTreeCelebrated=g.treeCelebrated;
function frame(now){
  const elapsed=Math.max(0,(now-prev)/1000),dt=clamp(elapsed,0,.05);prev=now;
  let input=dragInput;
  const kx=(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))),ky=(Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp')));
  if(kx||ky)input=screenInput(kx*60,ky*60);
  const restarting=updateRestart(now);
  if(!restarting&&!debug.paused&&!document.hidden)updateGarden(g,dt,input);
  if(!restarting&&!debug.paused&&!g.ending&&!document.hidden)updateHint(g,elapsed);syncHintButton();
  syncEnding();
  while(g.effects.length){const e=g.effects.shift();if(e.kind==='sound')play(e.notes,e.type);else r.emit(e);}
  r.draw(dt);updatePetals();
  const near=nearest(g),carrying=!!g.player.carrying;action.classList.toggle('carrying',carrying);action.setAttribute('aria-label',carrying?'木の実を置く':near?.type==='seed'?'木の実を持つ':'触れる');
  const isNear=carrying||!!near;if(isNear!==wasNear){action.classList.toggle('ready',isNear);wasNear=isNear;}
  if(g.treeCelebrated!==lastTreeCelebrated){save();lastTreeCelebrated=g.treeCelebrated;}
  if(g.t-lastSave>4){save();lastSave=g.t;}
  if(!debug.paused&&!g.treeReply&&!g.ending&&started&&g.t-lastAmbient>9&&!document.hidden){lastAmbient=g.t;play(g.stage===0?[79]:g.stage===1?[72,79]:[67,74,79],'soft');}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
