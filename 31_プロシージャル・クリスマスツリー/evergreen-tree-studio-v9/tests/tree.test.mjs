import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Box3,Vector3} from '../dist/vendor/three.module.js';
import {GLTFExporter} from '../dist/vendor/GLTFExporter.js';
import {buildTree} from '../dist/tree-model.js';
import {DEFAULTS,PRESETS,LIMITS,normalizeConfig,parseSettings,serializeSettings,randomConfig} from '../dist/tree-config.mjs';

function digest(object){const hash=createHash('sha256');object.traverse(o=>{if(o.isMesh){hash.update(o.name);hash.update(Buffer.from(o.geometry.attributes.position.array.buffer));}});return hash.digest('hex');}
function checkFinite(model){model.root.traverse(o=>{if(!o.isMesh)return;for(const attr of Object.values(o.geometry.attributes))for(const n of attr.array)assert.ok(Number.isFinite(n),'geometry values must be finite');});}
function countGroup(model,name){return model.root.getObjectByName(name).children.length;}

test('configuration round trip and unsafe input validation',()=>{
 assert.deepEqual(parseSettings(serializeSettings(DEFAULTS)),DEFAULTS);
 assert.throws(()=>parseSettings('{bad json'));
 assert.throws(()=>parseSettings(JSON.stringify({schemaVersion:99,settings:DEFAULTS})));
 assert.throws(()=>parseSettings(JSON.stringify({schemaVersion:1,settings:{...DEFAULTS,height:'4.6'}})));
 assert.throws(()=>parseSettings(JSON.stringify({schemaVersion:1,settings:{...DEFAULTS,seed:1000000}})));
 assert.equal(normalizeConfig({height:Infinity,layers:100,snow:-99}).height,DEFAULTS.height);
 assert.equal(normalizeConfig({layers:100}).layers,10);
 assert.equal(normalizeConfig({snow:-99}).snow,0);
});
test('every preset builds finite 3D geometry with a grounded trunk',()=>{
 for(const [name,preset] of Object.entries(PRESETS)){
  const model=buildTree(preset.config);checkFinite(model);
  assert.ok(model.stats.meshes<40,name+' must keep draw calls bounded');
  const trunk=new Box3().setFromObject(model.root.getObjectByName('Trunk'));
  assert.ok(Math.abs(trunk.min.y)<1e-5,'origin is the trunk base');
  const size=new Box3().setFromObject(model.root).getSize(new Vector3());
  assert.ok(size.y>preset.config.height*.85&&size.y<preset.config.height*1.04,'reported height matches geometry');
  assert.ok(model.stats.ornaments>0&&model.stats.bulbs>0);
  model.dispose();
 }
});
test('maximum and minimum controls remain finite',()=>{
 for(const side of [0,1]){
  const cfg={...DEFAULTS,...Object.fromEntries(Object.entries(LIMITS).map(([k,v])=>[k,v[side]]))};
  const model=buildTree(cfg);checkFinite(model);assert.ok(model.stats.triangles<85000);model.dispose();
 }
});
test('absence options omit all corresponding mesh groups',()=>{
 const model=buildTree({...DEFAULTS,snow:0,ornament:'none',lights:'none',topper:'none'});
 for(const name of ['Snow','Ornaments','Garland','Lights','Topper'])assert.equal(countGroup(model,name),0,name);
 assert.equal(model.stats.ornaments,0);assert.equal(model.stats.bulbs,0);model.dispose();
 const zero=buildTree({...DEFAULTS,density:0});assert.equal(countGroup(zero,'Ornaments'),0);zero.dispose();
});
test('same seed reproduces geometry and lighting changes preserve decoration layout',()=>{
 const a=buildTree(DEFAULTS),b=buildTree(DEFAULTS),c=buildTree({...DEFAULTS,lights:'aurora',lightDensity:100});
 assert.equal(digest(a.root),digest(b.root));
 assert.equal(digest(a.root.getObjectByName('Ornaments')),digest(c.root.getObjectByName('Ornaments')));
 assert.equal(digest(a.root.getObjectByName('Foliage')),digest(c.root.getObjectByName('Foliage')));
 const different=buildTree({...DEFAULTS,seed:123});assert.notEqual(digest(a.root.getObjectByName('Ornaments')),digest(different.root.getObjectByName('Ornaments')));
 for(const m of [a,b,c,different])m.dispose();
});
test('random configurations stay in bounds and all topper/ornament variants build',()=>{
 for(const seed of [0,1,12024,999999]){
  const c=randomConfig(seed);assert.deepEqual(parseSettings(serializeSettings(c)),c);
  const model=buildTree(c);checkFinite(model);model.dispose();
 }
 for(const topper of ['five','eight','crystal','none'])for(const ornament of ['mixed','ball','star','gift','none']){
  const model=buildTree({...DEFAULTS,topper,ornament,density:10});checkFinite(model);model.dispose();
 }
});

globalThis.FileReader=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result='data:'+blob.type+';base64,'+Buffer.from(value).toString('base64');this.onloadend?.();});}
};
test('GLB exporter produces a valid binary with named tree parts and reproducible settings',async()=>{
 const model=buildTree(PRESETS.legend.config);
 const binary=await new GLTFExporter().parseAsync(model.root,{binary:true});
 const view=new DataView(binary);assert.equal(view.getUint32(0,true),0x46546c67);assert.equal(view.getUint32(4,true),2);assert.equal(view.getUint32(8,true),binary.byteLength);
 const jsonLength=view.getUint32(12,true),json=JSON.parse(new TextDecoder().decode(new Uint8Array(binary,20,jsonLength)));
 assert.ok(json.meshes.length>0);
 const names=json.nodes.map(n=>n.name);
 for(const name of ['ChristmasTree','Trunk','Foliage','Ornaments','Lights','Topper'])assert.ok(names.includes(name));
 assert.ok(!names.some(n=>/Preview|Stage|Camera/i.test(n||'')));
 const metadata=json.nodes.find(n=>n.name==='ChristmasTree').extras;
 assert.equal(metadata.units,'meters');assert.equal(metadata.settings.seed,88888);
 for(const accessor of json.accessors)for(const n of [...(accessor.min||[]),...(accessor.max||[])])assert.ok(Number.isFinite(n));
 model.dispose();
});
