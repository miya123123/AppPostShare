import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGarden,updateGarden,interact,goTo,snapshot,walkable,DISCOVERIES} from '../dist/garden-core.js';
import {beginTreeReply} from '../dist/garden-finale.js';
import {beginEnding,leaveEnding,endingActors,endingPose,gardenMemoryFlowers} from '../dist/garden-ending.js';
const garden=(extra={})=>makeGarden({stage:2,found:DISCOVERIES,treeCelebrated:true,grown:['soil-a','soil-c'],stoneTaps:3,watered:true,potOpen:true,
  player:{x:39.2,z:13.2},rabbit:{x:38,z:14},carrying:'seed-0',seeds:[{x:39.2,z:13.2},{x:25,z:21},{x:40,z:24}],...extra});
const frames=(g,n,input)=>{for(let i=0;i<n;i++)updateGarden(g,1/60,input);};
test('ending flowers remain at the same positions after return and reload, including existing saves',()=>{
  const g=garden();assert.equal(gardenMemoryFlowers(g).length,0);beginEnding(g);frames(g,480);
  const flowers=endingPose(g).flowers;assert.equal(gardenMemoryFlowers(g).length,0);
  const saved=snapshot(g);leaveEnding(g);assert.deepEqual(gardenMemoryFlowers(g),flowers.map(({open,...f})=>f));
  assert.deepEqual(gardenMemoryFlowers(makeGarden(saved)),gardenMemoryFlowers(g));
  assert.deepEqual(snapshot(g),saved);assert.equal(gardenMemoryFlowers(makeGarden()).length,0);
});
test('full reply leads to ending, including old treeCelebrated saves; short replies do not',()=>{
  const g=garden();assert(beginTreeReply(g));assert(g.treeReply.full);
  frames(g,599);assert.equal(g.ending,null);frames(g,3);assert(g.ending);assert(g.endingSeen);
  const returned=garden({endingSeen:true});beginTreeReply(returned);assert.equal(returned.treeReply.duration,2.8);
  frames(returned,180);assert.equal(returned.ending,null);
  const incomplete=garden({found:['bloom','tree']});beginTreeReply(incomplete);frames(incomplete,180);assert.equal(incomplete.ending,null);
});
test('ending pauses the exact live garden and return preserves progress, positions and carried seed',()=>{
  const g=garden(),before=snapshot(g),x=g.player.x,z=g.player.z;
  g.hintsEnabled=true;g.seeds[1].vx=1;g.waves.push({x:18.3,z:27,radius:1,hit:new Set()});
  assert(beginEnding(g));const atEntry=snapshot(g),time=g.t,seedX=g.seeds[1].x;
  const actors=endingActors(g);actors.player.x=0;actors.rabbit.x=0;
  assert.equal(g.player.x,x);assert.equal(g.rabbit.x,38,'presentation actors are separate objects');
  goTo(g,10,19,'bloom');assert.equal(interact(g),false);
  frames(g,900,{x:1,z:1});assert.equal(g.t,time);assert.equal(g.ending.age,8);assert.equal(g.waves[0].radius,1);assert.equal(g.seeds[1].x,seedX);
  assert.deepEqual(snapshot(g),atEntry);assert(g.hintsEnabled);
  assert(leaveEnding(g));assert.equal(g.ending,null);assert.deepEqual(snapshot(g),atEntry);
  assert.equal(g.player.x,x);assert.equal(g.player.z,z);assert.equal(g.player.carrying,'seed-0');
  assert.deepEqual({...snapshot(g),endingSeen:before.endingSeen},before);
  frames(g,30,{x:0,z:1});assert(g.player.z>z+1);
});
test('reload during or after ending starts normal play at the saved position with all progress',()=>{
  const g=garden();beginEnding(g);frames(g,90);
  const stored=JSON.parse(JSON.stringify(snapshot(g))),restored=makeGarden(stored);
  assert.equal(restored.ending,null);assert.equal(restored.treeReply,null);assert.equal(restored.endingPending,false);
  assert.deepEqual(snapshot(restored),stored);assert(restored.endingSeen);
  beginTreeReply(restored);assert.equal(restored.treeReply.full,false);
  const fresh=makeGarden();assert.equal(fresh.endingSeen,false);assert.equal(fresh.treeCelebrated,false);
});
test('a jump finishing after the tree reply delays ending until exact safe positions can be saved',()=>{
  const g=garden({carrying:null});beginTreeReply(g);g.treeReply.age=9.9;
  g.player.flight={x0:39.2,z0:13.2,x1:38,z1:16,t:0,duration:1,height:2};
  frames(g,10);assert.equal(g.ending,null);assert(g.endingPending);assert(g.player.flight);
  assert.equal(interact(g),false,'no new jump can prolong the handoff');
  frames(g,60);assert(g.ending);assert.equal(g.player.flight,null);assert.deepEqual(snapshot(g).player,{x:38,z:16});
  assert.deepEqual(snapshot(makeGarden(snapshot(g))).player,{x:38,z:16});
});
test('eight petal colors settle into a flower and reduced motion uses stationary petals',()=>{
  const g=garden();beginEnding(g);g.ending.age=1;
  const early=endingPose(g),still=endingPose(g,true);assert.equal(early.petals.length,8);assert.equal(new Set(early.petals.map(p=>p.color)).size,8);
  g.ending.age=8;const last=endingPose(g),lastStill=endingPose(g,true);assert.equal(last.bloom,1);
  for(let i=0;i<8;i++){assert.equal(last.petals[i].z,13.4);assert.equal(still.petals[i].x,lastStill.petals[i].x);assert.equal(still.petals[i].h,lastStill.petals[i].h);}
});

test('flowering spreads after the central bloom, keeps the cast clear and adds no saved progress',()=>{
  const g=garden();beginEnding(g);const before=snapshot(g);
  g.ending.age=4.8;assert(endingPose(g).flowers.every(f=>f.open===0));
  g.ending.age=6.2;const middle=endingPose(g);assert(middle.flowers.some(f=>f.open>0));assert(middle.flowers.some(f=>f.open===0));
  g.ending.age=8;const last=endingPose(g);assert(last.flowers.length>=50);assert(last.flowers.some(f=>Math.hypot(f.x-39.15,f.z-14.4)<.65));assert(last.flowers.every(f=>f.open===1));
  for(const f of last.flowers){assert(Math.hypot(f.x-39.15,f.z-14.4)>.38);}
  assert.deepEqual(snapshot(g),before);assert.equal(last.rainbow,1);assert.equal(last.treeGlow,1);
});
test('stronger ending lights and flowers stay available with reduced motion',()=>{
  const g=garden();beginEnding(g);g.ending.age=8;
  const normal=endingPose(g),reduced=endingPose(g,true);
  assert.deepEqual(reduced.flowers,normal.flowers);assert.equal(reduced.rainbow,normal.rainbow);assert(reduced.light>=.35);
});

test('celebration starts after full flowering and keeps running beyond the eight-second intro',()=>{
  const g=garden();beginEnding(g);const start=endingActors(g);
  frames(g,450);assert.equal(g.ending.celebrationAge,0);
  assert.deepEqual(endingActors(g).spirit,start.spirit);assert.equal(endingActors(g).rabbit.x,start.rabbit.x);
  frames(g,90);assert.equal(g.ending.age,8);assert(g.ending.celebrationAge>.9);
  assert(endingPose(g).flowers.every(f=>f.open===1));
  const first=endingActors(g);assert.notEqual(first.rabbit.z,start.rabbit.z);assert.notEqual(first.spirit.x,start.spirit.x);
  frames(g,120);const next=endingActors(g);assert.notEqual(next.rabbit.x,first.rabbit.x);assert.notEqual(next.spirit.x,first.spirit.x);
  assert.equal(g.effects.filter(e=>e.kind==='sound'&&e.type==='ending').length,2,'no repeated ending chords');
});

test('rabbit alternates traveling hops and rests on a clear route; spirit follows its own slower loop',()=>{
  const g=garden();beginEnding(g);g.ending.age=8;
  let moving=0,resting=0,jumping=0,previous=null;
  for(let i=0;i<=3600;i++){
    g.ending.celebrationAge=i*.02;const cast=endingActors(g),r=cast.rabbit;
    assert(walkable(g,r.x,r.z));assert(Math.hypot(r.x-cast.player.x,r.z-cast.player.z)>.85);
    assert(Math.hypot(r.x-40.5,r.z-13.4)>1);

    if(r.moving)moving++;else{resting++;assert.equal(r.lift,0);}
    if(r.lift>.2)jumping++;
    if(previous){
      assert(Math.hypot(r.x-previous.rabbit.x,r.z-previous.rabbit.z)<.05,'rabbit does not teleport at curve or loop joins');
      assert(Math.abs(r.lift-previous.rabbit.lift)<.03,'hops land continuously');
      assert(Math.hypot(cast.spirit.x-previous.spirit.x,cast.spirit.z-previous.spirit.z)<.011,'spirit floats more slowly');
    }
    previous=cast;
  }
  assert(moving>0&&resting>0&&jumping>0);
  g.ending.celebrationAge=18;const rabbitLoop=endingActors(g);
  assert.equal(rabbitLoop.rabbit.x,38.25);assert.equal(rabbitLoop.rabbit.z,14.65);
  assert(Math.hypot(rabbitLoop.spirit.x-40.5,rabbitLoop.spirit.z-13.4)>1,'different loop periods');
});

test('repeating celebration stays transient and reduced motion keeps companions settled',()=>{
  const g=garden();beginEnding(g);const before=snapshot(g),still=endingActors(g,true);
  frames(g,5700);assert.equal(g.ending.age,8);assert(g.ending.celebrationAge>14&&g.ending.celebrationAge<16);
  assert.notEqual(endingActors(g).rabbit.x,still.rabbit.x);
  assert.deepEqual(endingActors(g,true),still);assert.deepEqual(snapshot(g),before);
  assert.equal(endingPose(g).rainbow,1);assert(endingPose(g).flowers.every(f=>f.open===1));
  leaveEnding(g);assert.deepEqual(snapshot(g),before);assert.deepEqual(snapshot(makeGarden(before)),before);
});
