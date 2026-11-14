import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGarden,snapshot,updateGarden,interact,walkable,DISCOVERIES} from '../dist/garden-core.js';
import {chooseHint,toggleHint,updateHint,hintDiscovery,hintPose} from '../dist/garden-hints.js';
const atFlower=()=>makeGarden({player:{x:9,z:20}});

test('OFF is the default and never reacts even beside an undiscovered target',()=>{
  const g=atFlower(),before=snapshot(g);
  for(let i=0;i<100;i++)updateHint(g,.1);
  assert.equal(g.hintsEnabled,false);assert.equal(g.hint,null);assert.deepEqual(snapshot(g),before);assert.equal(g.effects.length,0);
});
test('ON waits at a distance, reacts on approach, lasts beyond ten seconds and stays ON after leaving',()=>{
  const g=makeGarden(),before=snapshot(g);assert(toggleHint(g));assert.equal(g.hint,null);
  g.player.x=9;g.player.z=20;updateHint(g,.1);assert.equal(g.hint.id,'bloom');
  for(let i=0;i<720;i++)updateHint(g,1/60);
  assert(g.hint.age>10);assert(walkable(g,g.hint.x,g.hint.z));assert.equal(g.stage,0);assert.equal(g.found.size,0);
  g.player.x=7;g.player.z=23;updateHint(g,.1);assert.equal(g.hint,null);assert(g.hintsEnabled);
  g.player.x=9;g.player.z=20;updateHint(g,.1);assert.equal(g.hint.id,'bloom');
  assert.equal(toggleHint(g),false);assert.equal(g.hint,null);updateHint(g,1);assert.equal(g.hint,null);
  assert.equal(before.found.length,0);
});
test('the nearest eligible target is selected and changes as the player moves',()=>{
  const g=makeGarden({stage:1,player:{x:18,z:18.5}});toggleHint(g);assert.equal(g.hint.id,'bell-a');
  g.player.x=21;g.player.z=10.5;updateHint(g,.05);assert.equal(g.hint.id,'mushroom-small');
  assert(g.hintsEnabled);
});
test('held seeds react to nearby unknown beds or mushrooms, using the closest one',()=>{
  const g=makeGarden({stage:1,carrying:'seed-0',player:{x:23,z:23}});
  toggleHint(g);assert.equal(g.hint.id,'soil-a');g.found.add('seed');g.player.x=20;g.player.z=24;updateHint(g,.1);assert.equal(g.hint.id,'mushroom-chain');
  g.player.x=21;g.player.z=10.5;updateHint(g,.1);assert.equal(g.hint.id,'mushroom-small');
  g.found.add('mushroom');updateHint(g,.1);assert.equal(g.hint,null);assert(g.hintsEnabled);
});
test('discovery stops its reaction without changing ON, while a partial stone touch keeps reacting',()=>{
  const g=atFlower();toggleHint(g);interact(g,g.objects.find(o=>o.id==='bloom'));updateHint(g,.01);
  assert.equal(g.hint,null);assert(g.hintsEnabled);
  const stone=makeGarden({stage:2,player:{x:38,z:25.6}});toggleHint(stone);assert.equal(stone.hint.id,'stone');
  interact(stone,stone.objects.find(o=>o.id==='stone'));updateHint(stone,.01);assert(stone.hint);assert.equal(stone.stoneTaps,1);
  stone.found.add('stone');updateHint(stone,.01);assert.equal(stone.hint,null);assert(stone.hintsEnabled);
});
test('fully discovered or locked targets stay silent while ON is retained',()=>{
  for(const carrying of [null,'seed-0']){
    const g=makeGarden({stage:2,found:DISCOVERIES,carrying,player:{x:23,z:23}}),before=snapshot(g);
    assert.equal(chooseHint(g),null);assert(toggleHint(g));assert.equal(g.hint,null);updateHint(g,30);assert(g.hintsEnabled);assert.equal(g.hint,null);assert.deepEqual(snapshot(g),before);
  }
  const locked=makeGarden({stage:1,found:DISCOVERIES.filter(v=>!['stone','tree'].includes(v)),player:{x:29,z:20}});
  locked.stage=1;toggleHint(locked);assert.equal(locked.hint,null);
});
test('seed pickup, carrying changes and flight reevaluate nearby reactions without switching OFF',()=>{
  const g=makeGarden({stage:1,found:DISCOVERIES.filter(v=>v!=='seed'),player:{x:20,z:23}});
  toggleHint(g);assert.equal(g.hint.id,'seed-0');interact(g,g.seeds[0]);updateHint(g,.01);
  assert.equal(g.hint.id,'soil-a');assert(g.hintsEnabled);
  g.player.flight={};updateHint(g,.01);assert.equal(g.hint,null);assert(g.hintsEnabled);
  g.player.flight=null;updateHint(g,.01);assert.equal(g.hint.id,'soil-a');
});
test('nearby reactions do not cross a river with a distant detour and never open a crossing',()=>{
  const g=makeGarden({stage:2,found:DISCOVERIES.filter(v=>v!=='seed'),player:{x:34,z:18.7},carrying:'seed-0'});
  assert.equal(chooseHint(g).object.id,'soil-c');
  g.player.x=30;g.player.z=18.7;assert.equal(chooseHint(g),null);assert.equal(g.stage,2);
});
test('mode and reactions do not alter progress snapshots and movement remains available',()=>{
  const g=atFlower(),before=snapshot(g);toggleHint(g);assert.deepEqual(snapshot(g),before);
  const restored=makeGarden(snapshot(g));assert.equal(restored.hint,null);assert.equal(restored.hintsEnabled,false);
  const x=g.player.x;updateGarden(g,.05,{x:1,z:0});updateHint(g,.05);assert(g.player.x>x);
  assert(!hintDiscovery(g,g.rabbit).undiscovered);
});
test('reduced motion retains gold while disabling added movement',()=>{
  const h={age:1},pose=hintPose(h),quiet=hintPose(h,true);
  assert(pose.lift>.1);assert.equal(quiet.x,0);assert.equal(quiet.z,0);assert.equal(quiet.lift,0);assert.equal(quiet.look,0);assert.equal(quiet.color,pose.color);
});
