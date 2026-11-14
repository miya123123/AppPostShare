import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGarden,interact,updateGarden,snapshot,DISCOVERIES,walkable,distance} from '../dist/garden-core.js';
import {beginTreeReply,updateTreeReply,treeReplyPose,spiritReplyPosition} from '../dist/garden-finale.js';
const tree=g=>g.objects.find(o=>o.id==='tree');
const touch=g=>{g.player.x=39.2;g.player.z=13.2;g.cooldown=0;interact(g,tree(g));};
const fullGarden=()=>makeGarden({stage:2,found:DISCOVERIES,stoneTaps:3,player:{x:39.2,z:13.2},grown:['soil-a']});
const frames=(g,n,input)=>{for(let i=0;i<n;i++)updateGarden(g,1/60,input);};
test('tree gives a short reply before all discoveries, then a single saved full reply',()=>{
  const g=makeGarden({stage:2});touch(g);assert.equal(g.treeReply.duration,2.8);assert.equal(g.treeCelebrated,false);
  assert(g.found.has('tree'));frames(g,170);assert.equal(g.treeReply,null);
  for(const id of DISCOVERIES)g.found.add(id);
  touch(g);assert.equal(g.treeReply.duration,10);assert.equal(g.treeReply.full,true);assert.equal(g.treeCelebrated,true);
  const first=g.treeReply,sounds=g.effects.filter(e=>e.kind==='sound').length;
  touch(g);assert.equal(g.treeReply,first);assert.equal(g.effects.filter(e=>e.kind==='sound').length,sounds,'touching again never stacks the score');
  const restored=makeGarden(JSON.parse(JSON.stringify(snapshot(g))));assert.equal(restored.treeReply,null);assert.equal(restored.treeCelebrated,true);
  touch(restored);assert.equal(restored.treeReply.duration,10);assert.equal(restored.treeReply.full,true,'the ending remains available until reached');
  assert.equal(makeGarden().treeCelebrated,false,'restart restores the first celebration');
});
test('the final tree discovery starts the full reply and legacy completed saves can see it once',()=>{
  const g=makeGarden({stage:2,found:DISCOVERIES.filter(v=>v!=='tree')});touch(g);
  assert.equal(g.found.size,8);assert(g.treeReply.full);assert.equal(g.allPulse,0);assert(!g.effects.some(e=>e.kind==='rainbow'));
  const legacy=fullGarden();assert.equal(legacy.treeCelebrated,false);touch(legacy);assert(legacy.treeReply.full);
});
test('garden response cues are ordered, bounded and never trigger gameplay physics',()=>{
  const g=fullGarden(),before=snapshot(g);beginTreeReply(g);g.effects=[];
  const heard=[],kinds=[];
  for(let i=0;i<605;i++){
    updateTreeReply(g,1/60);
    for(const e of g.effects){kinds.push(e.kind);if(e.kind==='sound')heard.push(e.notes);}
    g.effects=[];
  }
  assert.deepEqual(heard,[[72],[76],[79],[60,67,72,76],[48,55,60,64]]);
  assert(!kinds.some(k=>['spores','rainbow','water','discovery'].includes(k)));
  assert.equal(g.waves.length,0);assert(g.seeds.every(s=>!s.flight));assert.equal(g.treeReply,null);
  assert.deepEqual({...snapshot(g),treeCelebrated:before.treeCelebrated,endingSeen:before.endingSeen},before,'only the first-view flags are persisted');
});
test('player remains free and rabbit safely crosses to sit nearby without a teleport',()=>{
  const g=fullGarden();beginTreeReply(g);const start={x:g.rabbit.x,z:g.rabbit.z};let previous={...start};
  for(let i=0;i<550;i++){
    updateGarden(g,1/60);
    assert(walkable(g,g.rabbit.x,g.rabbit.z));assert(distance(previous,g.rabbit)<.08);
    previous={x:g.rabbit.x,z:g.rabbit.z};
  }
  assert(distance(g.rabbit,g.player)<1.8);assert.equal(g.rabbit.mode,'rest');
  assert(distance(start,g.rabbit)>10);
  const z=g.player.z;frames(g,20,{x:0,z:1});assert(g.player.z>z+1,'controls remain live during the reply');
});
test('reduced motion keeps warm glow with no camera expansion, branch sway or spirit orbit',()=>{
  const g=fullGarden();beginTreeReply(g);g.treeReply.age=6.5;
  const pose=treeReplyPose(g,true);assert(pose.glow>0);assert.equal(pose.sway,0);assert.equal(pose.panorama,0);
  const spirit=spiritReplyPosition(g,true);g.treeReply.age=8;assert.deepEqual(spiritReplyPosition(g,true),spirit);
  g.treeReply=null;assert.equal(treeReplyPose(g).glow,0);assert.equal(spiritReplyPosition(g),null);
});
