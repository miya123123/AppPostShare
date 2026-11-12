import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {Box3,Vector3,SphereGeometry} from '../dist/vendor/three.module.js';import {buildTree} from '../dist/tree-model.js';import {DEFAULTS,parseSettings,serializeSettings} from '../dist/tree-config.mjs';
const size=object=>new Box3().setFromObject(object).getSize(new Vector3());
test('height changes only vertical geometry while widths and topper size stay fixed',()=>{
 const a=buildTree({...DEFAULTS,height:2.5}),b=buildTree({...DEFAULTS,height:7});
 const small=size(a.root),large=size(b.root);assert.ok(large.y>small.y*2);for(const axis of ['x','z'])assert.ok(Math.abs(large[axis]-small[axis])<1e-5);const tipA=size(a.root.getObjectByName('Topper')),tipB=size(b.root.getObjectByName('Topper'));for(const axis of ['x','y','z'])assert.ok(Math.abs(tipA[axis]-tipB[axis])<1e-5);assert.equal(a.lightPositions.length,b.lightPositions.length);for(let i=0;i<a.lightPositions.length;i++){assert.ok(Math.abs(a.lightPositions[i].x-b.lightPositions[i].x)<1e-8);assert.ok(Math.abs(a.lightPositions[i].z-b.lightPositions[i].z)<1e-8);}a.dispose();b.dispose();
});
test('all toppers scale independently without changing foliage',()=>{
 for(const topper of ['five','eight','crystal']){
  const a=buildTree({...DEFAULTS,topper,topperSize:50}),b=buildTree({...DEFAULTS,topper,topperSize:200});
  const small=size(a.root.getObjectByName('Topper')),large=size(b.root.getObjectByName('Topper'));
  for(const axis of ['x','y','z'])assert.ok(Math.abs(large[axis]/small[axis]-4)<1e-5);
  assert.deepEqual(a.root.getObjectByName('Foliage').children[0].geometry.attributes.position.array,b.root.getObjectByName('Foliage').children[0].geometry.attributes.position.array);a.dispose();b.dispose();
 }
});
test('individual ornaments scale fourfold from 50 to 200 percent',()=>{
 const sphere=new SphereGeometry(1,12,8),flat=sphere.toNonIndexed(),count=flat.attributes.position.count;flat.dispose();sphere.dispose();
 const models=[50,200].map(ornamentSize=>buildTree({...DEFAULTS,ornament:'ball',ornamentSize}));
 const widths=models.map(model=>{const attr=model.root.getObjectByName('Ornaments').children[0].geometry.attributes.position;const x=Array.from({length:count},(_,i)=>attr.getX(i));return Math.max(...x)-Math.min(...x);});
 assert.ok(Math.abs(widths[1]/widths[0]-4)<1e-5);assert.equal(models[0].stats.ornaments,models[1].stats.ornaments);models.forEach(m=>m.dispose());
});
test('old JSON defaults sizes to 100 percent and new sizes survive a round trip',()=>{
 const old=JSON.parse(serializeSettings(DEFAULTS));delete old.settings.topperSize;delete old.settings.ornamentSize;
 assert.equal(parseSettings(JSON.stringify(old)).topperSize,100);assert.equal(parseSettings(JSON.stringify(old)).ornamentSize,100);
 const next={...DEFAULTS,topperSize:175,ornamentSize:60};assert.deepEqual(parseSettings(serializeSettings(next)),next);
});
test('height input rebuilds without requesting automatic camera fitting',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8'),handlers={};let applied;
 const input={value:'7',addEventListener:(name,fn)=>handlers[name]=fn};
 const context=vm.createContext({LIMITS:{height:[2.5,7]},$:()=>input,config:DEFAULTS,applyConfig:(config,options)=>applied={config,options}});
 const start=source.indexOf(' for(const key of Object.keys(LIMITS))',source.indexOf('function bindUI()'));
 vm.runInContext(source.slice(start,source.indexOf(" for(const group of all('[data-options]'))group.addEventListener",start)),context);handlers.input();assert.equal(applied.config.height,7);assert.equal(applied.options.fit,false);
});
test('height does not resize individual ornaments or trunk thickness',()=>{
 const template=new SphereGeometry(1,12,8),flat=template.toNonIndexed(),count=flat.attributes.position.count;flat.dispose();template.dispose();
 const models=[2.5,7].map(height=>buildTree({...DEFAULTS,height,ornament:'ball'}));
 const dimensions=models.map(model=>{const attr=model.root.getObjectByName('Ornaments').children[0].geometry.attributes.position;return ['getX','getY','getZ'].map(method=>{const values=Array.from({length:count},(_,i)=>attr[method](i));return Math.max(...values)-Math.min(...values);});});
 for(let axis=0;axis<3;axis++)assert.ok(Math.abs(dimensions[0][axis]-dimensions[1][axis])<1e-6);
 for(const axis of ['x','z'])assert.ok(Math.abs(size(models[0].root.getObjectByName('Trunk'))[axis]-size(models[1].root.getObjectByName('Trunk'))[axis])<1e-6);
 models.forEach(model=>model.dispose());
});
