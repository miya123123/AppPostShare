import test from 'node:test';
import assert from 'node:assert/strict';
import {Texture} from '../dist/vendor/three.module.js';
import {GLTFExporter} from '../dist/vendor/GLTFExporter.js';
import {buildTree} from '../dist/tree-model.js';
import {DEFAULTS,parseSettings,serializeSettings} from '../dist/tree-config.mjs';
import {lightLevel,createLightPreview,createStaticSnapshot} from '../dist/light-animation.mjs';

test('blink has distinct on/off states, stays synchronized, and speed changes its timing',()=>{
 for(const phase of [0,.17,.82])for(const path of [0,.5,1]){
  assert.equal(lightLevel('blink',0,1,phase,path),1);
  assert.equal(lightLevel('blink',1.2,1,phase,path),0);
  assert.equal(lightLevel('blink',2.4,1,phase,path),1);
 }
 assert.equal(lightLevel('blink',.6,.5),1);
 assert.equal(lightLevel('blink',.6,2),0);
 for(const mode of ['blink','twinkle','wave'])for(const t of [.1,.7,1.6,5]){
  assert.ok(Math.abs(lightLevel(mode,t,2,.38,.57)-lightLevel(mode,t*2,1,.38,.57))<1e-12);
 }
});

test('twinkles differ by bulb, waves travel along the strand, and reduced motion is steady',()=>{
 assert.equal(lightLevel('twinkle',0,1,0),0);
 assert.equal(lightLevel('twinkle',0,1,.3),1);
 assert.equal(lightLevel('wave',0,1,0,.25),0);
 assert.equal(lightLevel('wave',0,1,0,.75),1);
 assert.equal(lightLevel('wave',1.2,1,0,.25),1);
 assert.equal(lightLevel('wave',1.2,1,0,.75),0);
 for(const mode of ['steady','blink','twinkle','wave'])for(let t=0;t<12;t+=.13){
  const level=lightLevel(mode,t,2,.34,.72);
  assert.ok(Number.isFinite(level)&&level>=0&&level<=1);
  assert.equal(lightLevel(mode,t,2,.34,.72,true),1);
  assert.equal(lightLevel('steady',t),1);
 }
});

test('bulb cores and halos turn off together without replacing geometry or instance positions',()=>{
 const model=buildTree({...DEFAULTS,lightDensity:100}),texture=new Texture();
 const preview=createLightPreview(model,texture),cores=preview.root.getObjectByName('PreviewLightBulbs'),halos=preview.root.getObjectByName('PreviewLightHalos');
 assert.equal(preview.root.children.length,2);assert.equal(cores.count,218);
 assert.equal(model.root.getObjectByName('Lights').visible,false);
 const coreGeometry=cores.geometry,haloGeometry=halos.geometry,matrixVersion=cores.instanceMatrix.version;
 const blink={...DEFAULTS,motion:'blink'};
 preview.update(blink,0);
 const onCore=cores.instanceColor.array.slice(),onHalo=halos.geometry.attributes.color.array.slice();
 preview.update(blink,1.2);
 const intensity=1.4+DEFAULTS.glow*.028;
 for(let i=0;i<onHalo.length;i++){
  assert.ok(Math.abs(onCore[i]-onHalo[i]*(.025+intensity))<1e-6);
  assert.equal(halos.geometry.attributes.color.array[i],0);
  assert.ok(Math.abs(cores.instanceColor.array[i]-onHalo[i]*.025)<1e-7);
 }
 preview.update({...blink,motion:'wave',motionSpeed:2,glow:95},2);
 assert.equal(cores.geometry,coreGeometry);assert.equal(halos.geometry,haloGeometry);assert.equal(cores.instanceMatrix.version,matrixVersion);
 preview.update(blink,1.2,true);
 assert.deepEqual(cores.instanceColor.array,onCore);
 const version=cores.instanceColor.version;preview.update({...blink,motion:'steady'},9);
 assert.equal(cores.instanceColor.version,version,'steady lights avoid redundant buffer uploads');
 let disposed=0;
 for(const resource of [cores,coreGeometry,cores.material,haloGeometry,halos.material])resource.addEventListener('dispose',()=>disposed++);
 preview.dispose();assert.equal(disposed,5);model.dispose();texture.dispose();
});

test('same seed reproduces individual twinkles and lights-none remains empty',()=>{
 const models=[buildTree(DEFAULTS),buildTree(DEFAULTS),buildTree({...DEFAULTS,seed:123})];
 const texture=new Texture(),previews=models.map(model=>createLightPreview(model,texture));
 for(const preview of previews)preview.update(DEFAULTS,.73);
 const colors=previews.map(preview=>preview.root.getObjectByName('PreviewLightHalos').geometry.attributes.color.array);
 assert.deepEqual(colors[0],colors[1]);assert.notDeepEqual(colors[0],colors[2]);
 for(const preview of previews){
  preview.update({...DEFAULTS,lights:'none'},1);assert.equal(preview.root.visible,false);
  preview.update(DEFAULTS,2);assert.equal(preview.root.visible,true);preview.dispose();
 }
 models.forEach(model=>model.dispose());
 const empty=buildTree({...DEFAULTS,lights:'none'}),preview=createLightPreview(empty,texture);
 assert.equal(preview.root.children.length,0);preview.update(empty.config,10);preview.dispose();empty.dispose();texture.dispose();
});

test('animation settings round-trip, legacy files default to 1x, and malformed speeds are rejected',()=>{
 const legacy=JSON.parse(serializeSettings({...DEFAULTS,motion:'wave',seed:12024}));delete legacy.settings.motionSpeed;
 const restored=parseSettings(JSON.stringify(legacy));
 assert.equal(restored.motionSpeed,1);assert.equal(restored.motion,'wave');assert.equal(restored.seed,12024);
 for(const motion of ['steady','blink','twinkle','wave'])for(const motionSpeed of [.5,1.3,2]){
  const config={...DEFAULTS,motion,motionSpeed};assert.deepEqual(parseSettings(serializeSettings(config)),config);
 }
 for(const speed of [null,'1',0,2.1]){
  assert.throws(()=>parseSettings(JSON.stringify({...legacy,settings:{...legacy.settings,motionSpeed:speed}})));
 }
});

globalThis.FileReader=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(result=>{this.result=result;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(result=>{this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64');this.onloadend?.();});}
};

test('GLB taken during an off frame still includes static bulbs and current animation settings',async()=>{
 const model=buildTree(DEFAULTS),texture=new Texture(),preview=createLightPreview(model,texture);
 const settings={...DEFAULTS,motion:'blink',motionSpeed:2,glow:95};preview.update(settings,.6);
 const snapshot=createStaticSnapshot(model,settings);
 assert.equal(snapshot.root.getObjectByName('Lights').visible,true);
 assert.equal(model.root.getObjectByName('Lights').visible,false);
 assert.notEqual(snapshot.root.userData.settings,model.root.userData.settings);
 const binary=await new GLTFExporter().parseAsync(snapshot.root,{binary:true,onlyVisible:true});
 const view=new DataView(binary),json=JSON.parse(new TextDecoder().decode(new Uint8Array(binary,20,view.getUint32(12,true))));
 const lights=json.nodes.find(node=>node.name==='Lights');assert.ok(lights.children.length>0);
 assert.ok(!json.nodes.some(node=>/Preview/.test(node.name)));
 assert.ok(!json.animations?.length);
 const exported=json.nodes.find(node=>node.name==='ChristmasTree').extras.settings;
 assert.equal(exported.motion,'blink');assert.equal(exported.motionSpeed,2);assert.equal(exported.glow,95);
 for(const material of snapshot.root.getObjectByName('Lights').children.map(mesh=>mesh.material)){
  assert.equal(material.isMeshStandardMaterial,true);assert.equal(material.emissiveIntensity,1.4+95*.028);
 }
 snapshot.dispose();preview.dispose();model.dispose();texture.dispose();
});
