import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGarden,snapshot,DISCOVERIES} from '../dist/garden-core.js';
import {debugEntries} from '../dist/garden-debug.js';
test('debug reflects persisted discovery categories and groups repeated objects',()=>{
  const g=makeGarden({found:['bloom','music'],stoneTaps:2});
  const before=snapshot(g),all=debugEntries(g);
  assert.deepEqual(all.map(e=>e.id),DISCOVERIES);
  assert.equal(debugEntries(g,'done').length,2);assert.equal(debugEntries(g,'todo').length,6);
  assert.equal(all.find(e=>e.id==='mushroom').locations.length,3);
  assert.equal(all.find(e=>e.id==='stone').complete,false);
  g.found.add('stone');assert.equal(debugEntries(g,'done').length,3);
  g.found.delete('stone');assert.deepEqual(snapshot(g),before);
  assert.equal(all.find(e=>e.id==='tree').locations[0].x,40.5,'locked areas remain inspectable');
});

import {setDebugCompletion} from '../dist/garden-debug.js';
import {interact,updateGarden} from '../dist/garden-core.js';
import {chooseHint} from '../dist/garden-hints.js';
import {beginTreeReply} from '../dist/garden-finale.js';
test('debug can complete all categories consistently without emitting gameplay effects',()=>{
  const g=makeGarden(),position={x:g.player.x,z:g.player.z},seeds=structuredClone(g.seeds);
  for(const id of DISCOVERIES)assert(setDebugCompletion(g,id,true));
  assert.equal(g.found.size,8);assert.equal(g.stage,2);assert.equal(g.stoneTaps,3);assert(g.watered);assert(g.grown.size>0);
  assert.deepEqual(snapshot(makeGarden(snapshot(g))),snapshot(g));
  assert.deepEqual({x:g.player.x,z:g.player.z},position);assert.deepEqual(g.seeds,seeds);
  assert.equal(g.effects.length,0);assert.equal(g.treeReply,null);assert.equal(g.endingPending,false);assert.equal(g.ending,null);
});
test('uncompleting seed, stone and water makes them testable while preserving other progress and seeds',()=>{
  const g=makeGarden({stage:2,found:DISCOVERIES,grown:['soil-a','soil-b','soil-c'],stoneTaps:3,watered:true,carrying:'seed-0',player:{x:18,z:26}});
  const seeds=structuredClone(g.seeds),player=structuredClone(g.player);
  setDebugCompletion(g,'seed',false);assert.equal(g.grown.size,0);assert(g.found.has('water'));assert(g.found.has('stone'));
  setDebugCompletion(g,'stone',false);assert.equal(g.stoneTaps,0);
  setDebugCompletion(g,'water',false);assert.equal(g.watered,false);assert.equal(g.waves.length,0);
  assert.deepEqual(g.seeds,seeds);assert.deepEqual(g.player,player);assert.equal(g.stage,2);
  g.player.carrying=null;g.player.x=38;g.player.z=25.6;
  const stone=g.objects.find(o=>o.id==='stone');for(let i=0;i<3;i++){g.cooldown=0;interact(g,stone);}
  assert(g.found.has('stone'));assert.equal(g.stoneTaps,3);
});
test('resetting the tree re-arms its complete reply and ending without moving anything',()=>{
  const g=makeGarden({stage:2,found:DISCOVERIES,treeCelebrated:true,endingSeen:true});
  const before=snapshot(g);setDebugCompletion(g,'tree',false);
  assert.equal(g.treeCelebrated,false);assert.equal(g.endingSeen,false);assert.equal(g.found.size,7);
  assert.deepEqual(snapshot(g).seeds,before.seeds);assert.deepEqual(snapshot(g).player,before.player);
  const t=g.objects.find(o=>o.id==='tree');g.player.x=t.x-1;g.player.z=t.z;interact(g,t);assert(g.treeReply.full);
  for(let i=0;i<620;i++)updateGarden(g,1/60);
  assert(g.ending);assert(g.endingSeen);
});
test('opened routes remain open after removing discovery flags, including after reload',()=>{
  const g=makeGarden({stage:2,found:DISCOVERIES});setDebugCompletion(g,'bridge',false);setDebugCompletion(g,'bloom',false);
  assert.equal(g.stage,2);assert.equal(makeGarden(snapshot(g)).stage,2);
  const before=snapshot(g);assert.equal(setDebugCompletion(g,'unknown',true),false);assert.equal(setDebugCompletion(g,'stone','false'),false);assert.deepEqual(snapshot(g),before);
});
test('hints reflect changed completion state and turning a target complete clears its active reaction',()=>{
  const g=makeGarden({stage:2,found:DISCOVERIES,player:{x:18,z:26}});g.hintsEnabled=true;
  assert.equal(chooseHint(g),null);setDebugCompletion(g,'water',false);assert.equal(chooseHint(g).object.id,'water');
  g.hint={id:'water'};setDebugCompletion(g,'water',true);assert.equal(g.hint,null);assert.equal(chooseHint(g),null);assert(g.hintsEnabled);
});
