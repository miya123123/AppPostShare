import test from 'node:test';import assert from 'node:assert/strict';import {Box3,Vector3} from '../dist/vendor/three.module.js';import {buildTree} from '../dist/tree-model.js';import {DEFAULTS,parseSettings,serializeSettings} from '../dist/tree-config.mjs';
const box=(model,part)=>new Box3().setFromObject(part?model.root.getObjectByName(part):model.root);
test('longer exposed trunk shortens canopy without changing total height or width',()=>{
 for(const height of [2.5,4.6,7]){
  const a=buildTree({...DEFAULTS,height,trunkHeight:5}),b=buildTree({...DEFAULTS,height,trunkHeight:40});
  const leafA=box(a,'Foliage'),leafB=box(b,'Foliage');assert.ok(leafB.min.y>leafA.min.y);assert.ok(leafB.getSize(new Vector3()).y<leafA.getSize(new Vector3()).y);assert.ok(Math.abs(leafA.max.y-leafB.max.y)<1e-5);
  assert.ok(box(b,'Trunk').max.y>box(a,'Trunk').max.y);assert.ok(Math.abs(box(b,'Trunk').min.y)<1e-6);
  for(const axis of ['x','z']){assert.ok(Math.abs(leafA.min[axis]-leafB.min[axis])<1e-6);assert.ok(Math.abs(leafA.max[axis]-leafB.max[axis])<1e-6);}
  assert.ok(Math.abs(box(a).max.y-box(b).max.y)<1e-5);assert.deepEqual(box(a,'Topper'),box(b,'Topper'));
  for(let i=0;i<a.lightPositions.length;i++){assert.ok(b.lightPositions[i].y>a.lightPositions[i].y);for(const axis of ['x','z'])assert.ok(Math.abs(a.lightPositions[i][axis]-b.lightPositions[i][axis])<1e-8);}
  assert.equal(a.stats.ornaments,b.stats.ornaments);a.dispose();b.dispose();
 }
});
test('trunk height is preserved in saved settings and old files default to 12 percent',()=>{
 const legacy=JSON.parse(serializeSettings(DEFAULTS));delete legacy.settings.trunkHeight;assert.equal(parseSettings(JSON.stringify(legacy)).trunkHeight,12);
 for(const trunkHeight of [5,12,40])assert.equal(parseSettings(serializeSettings({...DEFAULTS,trunkHeight})).trunkHeight,trunkHeight);
 const model=buildTree({...DEFAULTS,trunkHeight:35});assert.equal(model.root.userData.settings.trunkHeight,35);model.dispose();
});
