import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGarden,walkable,findPath,goTo,interact,updateGarden,snapshot,DISCOVERIES} from '../dist/garden-core.js';
const obj=(g,id)=>[...g.objects,...g.seeds].find(o=>o.id===id);
function touch(g,id){const o=obj(g,id);g.player.x=o.x-1;g.player.z=o.z;g.cooldown=0;return interact(g,o);}
function frames(g,count=200,input){for(let i=0;i<count;i++)updateGarden(g,1/60,input);}

test('small garden is safe and opening the flower admits a valid route to the meadow',()=>{
  const g=makeGarden();assert(walkable(g,7,23));assert(!walkable(g,14,20));assert.equal(findPath(g,g.player,{x:20,z:20}).length,0);
  touch(g,'bloom');assert.equal(g.stage,1);assert(walkable(g,14,20));const route=findPath(g,g.player,{x:21,z:20});assert(route.length>5);assert(route.every(p=>walkable(g,p.x,p.z)));
  assert(!walkable(g,31.5,20));assert(!walkable(g,35,20));
});
test('tap a prop walks to it and triggers the initial discovery',()=>{
  const g=makeGarden();goTo(g,10,19,'bloom');frames(g,220);assert.equal(g.stage,1);assert(g.found.has('bloom'));assert.equal(g.target,null);
});
test('bridge route opens the grove and both directions can be walked',()=>{
  const g=makeGarden({stage:1});touch(g,'bridge');assert.equal(g.stage,2);assert(g.found.has('bridge'));
  for(const [a,b]of[[{x:28,z:25},{x:36,z:24}],[{x:36,z:24},{x:28,z:25}]]){const p=findPath(g,a,b);assert(p.length>2);assert(p.every(q=>walkable(g,q.x,q.z)));}
});
test('mushroom provides an independent route and lands safely with a return bridge',()=>{
  const g=makeGarden({stage:1});touch(g,'mushroom-big');assert(g.player.flight);assert.equal(g.stage,2);frames(g);assert.equal(g.player.flight,null);assert(g.player.x>33);assert(walkable(g,g.player.x,g.player.z));assert(walkable(g,31,25));assert(!g.found.has('bridge'));
});
test('rolling a seed into a bed grows a flower without exhausting future play',()=>{
  const g=makeGarden({stage:1});const s=g.seeds[0],soil=obj(g,'soil-a');s.x=soil.x-.95;s.z=soil.z;s.vx=3;frames(g,90);assert(g.grown.has('soil-a'));assert(g.found.has('seed'));assert.equal(g.seeds.length,3);assert(walkable(g,s.x,s.z));
});
test('repeated experiments open the stone and all discoveries do not end play',()=>{
  const g=makeGarden({stage:2});touch(g,'stone');assert.equal(g.stoneTaps,1);touch(g,'stone');assert(!g.found.has('stone'));touch(g,'stone');assert(g.found.has('stone'));
  for(const id of DISCOVERIES)g.found.add(id);touch(g,'tree');assert(g.treeReply?.full);const startZ=g.player.z;frames(g,30,{x:0,z:1});assert(g.player.z>startZ+1);
});
test('save state restores discoveries, grown beds, position and unlocks',()=>{
  const g=makeGarden({stage:2,found:['bloom','bridge'],grown:['soil-a'],stoneTaps:2,watered:true,player:{x:36,z:23}});const restored=makeGarden(JSON.parse(JSON.stringify(snapshot(g))));assert.equal(restored.stage,2);assert.equal(restored.player.x,36);assert(restored.found.has('bridge'));assert(restored.grown.has('soil-a'));assert.equal(restored.stoneTaps,2);assert(restored.watered);
});
test('manual movement cannot cross a closed hedge or stream and malformed saves recover',()=>{
  const g=makeGarden({stage:1,player:{x:29.9,z:20},seeds:[{x:Infinity,z:0}]});frames(g,240,{x:1,z:0});assert(g.player.x<=30.15);assert(walkable(g,g.player.x,g.player.z));const fresh=makeGarden({player:{x:999,z:999},found:['not-real']});assert.equal(fresh.player.x,7);assert.equal(fresh.found.size,0);
});

test('touching the waterside mushroom launches a nearby seed, splashes once and opens flowers in order',()=>{
  const g=makeGarden({stage:1});touch(g,'mushroom-chain');
  const seed=g.seeds.find(s=>s.flight);assert(seed);
  frames(g,65);assert.equal(g.waves.length,0);assert(seed.h>1);
  frames(g,15);assert.equal(g.waves.length,1);assert(g.watered);
  frames(g,35);assert(g.chainFlowers[0].bloom>0);assert.equal(g.chainFlowers.at(-1).bloom,0);
  frames(g,100);assert(g.chainFlowers.every(f=>f.bloom>0&&f.butterflies>0));
  assert.equal(seed.flight,null);assert(walkable(g,seed.x,seed.z));assert.equal(seed.h,.3);
  frames(g,100);touch(g,'mushroom-chain');assert(g.seeds.some(s=>s.flight));
});
test('rolling into the mushroom triggers the chain without touching it',()=>{
  const g=makeGarden({stage:1}),m=obj(g,'mushroom-chain'),s=g.seeds[0];
  s.x=m.x-1.05;s.z=m.z;s.vx=4;frames(g,8);assert(s.flight);assert(s.h>.3);
});
test('direct water experiments work, waves stay bounded and flowers settle for replay',()=>{
  const g=makeGarden({stage:1});for(let i=0;i<15;i++)touch(g,'water');assert.equal(g.waves.length,3);
  frames(g,200);assert.equal(g.waves.length,0);assert(g.chainFlowers.every(f=>f.bloom>0));
  frames(g,900);assert(g.chainFlowers.every(f=>f.bloom===0&&f.butterflies===0&&f.open<.001));
});
test('saving mid-flight restores the seed safely on shore and preserves original progress',()=>{
  const g=makeGarden({stage:1,found:['bloom'],grown:['soil-a']});touch(g,'mushroom-chain');frames(g,40);
  const restored=makeGarden(snapshot(g));assert(restored.grown.has('soil-a'));assert(restored.found.has('bloom'));
  assert(restored.seeds.every(s=>!s.flight&&walkable(restored,s.x,s.z)));assert.equal(restored.stage,1);
});

test('a seed can be picked up by approach, carried over beds without planting and placed to grow',()=>{
  const g=makeGarden({stage:1,player:{x:18,z:23}}),s=g.seeds[0];
  goTo(g,s.x,s.z,s.id);frames(g,80);assert.equal(g.player.carrying,s.id);
  const soil=obj(g,'soil-a');g.player.x=soil.x;g.player.z=soil.z;frames(g,30);
  assert.equal(g.player.carrying,s.id);assert(!g.grown.has(soil.id));assert.equal(s.vx,0);assert(s.h>.7);
  g.cooldown=0;interact(g,soil);frames(g,2);assert.equal(g.player.carrying,null);assert(g.grown.has(soil.id));
});
test('carrying follows manual movement, drops safely at boundaries and permits picking up again',()=>{
  const g=makeGarden({stage:1});touch(g,'seed-0');const s=g.seeds[0];
  const start=g.player.x;frames(g,40,{x:1,z:0});assert(g.player.x>start+2);assert.equal(s.x,g.player.x);assert.equal(s.vx,0);
  g.player.x=30.1;g.player.z=20;g.player.dirX=1;g.player.dirZ=0;g.cooldown=0;
  assert(interact(g,null));assert.equal(g.player.carrying,null);assert(walkable(g,s.x,s.z));
  g.cooldown=0;assert(interact(g,s));assert.equal(g.player.carrying,s.id);
});
test('a held seed can be handed to the chain mushroom or dropped into water',()=>{
  const g=makeGarden({stage:1});touch(g,'seed-0');const s=g.seeds[0],m=obj(g,'mushroom-chain');
  g.player.x=m.x;g.player.z=m.z+1;g.cooldown=0;interact(g,m);assert.equal(g.player.carrying,null);assert(s.flight);
  frames(g,200);assert(g.chainFlowers.some(f=>f.bloom>0));
  touch(g,s.id);const w=obj(g,'water');g.player.x=w.x+1;g.player.z=w.z;g.cooldown=0;interact(g,w);assert(s.flight);
  frames(g,50);assert(g.waves.length>0);
});
test('a held seed follows walking and survives save/restore',()=>{
  const g=makeGarden({stage:1});touch(g,'seed-0');const s=g.seeds[0];
  const start=g.player.z;frames(g,60,{x:0,z:-1});assert(g.player.z<start-3);assert.equal(g.player.carrying,s.id);
  const restored=makeGarden(JSON.parse(JSON.stringify(snapshot(g))));assert.equal(restored.player.carrying,s.id);
  assert.equal(restored.seeds[0].x,restored.player.x);assert.equal(restored.seeds[0].h,.82);
  restored.cooldown=0;interact(restored,null);assert.equal(restored.player.carrying,null);assert(walkable(restored,restored.seeds[0].x,restored.seeds[0].z));
});

for(const id of ['mushroom-small','mushroom-big'])test(`held seed bounces exactly three times on ${id}, lands safely and can be reused`,()=>{
  const g=makeGarden({stage:1});touch(g,'seed-0');const s=g.seeds[0],m=obj(g,id);
  g.player.x=m.x-1;g.player.z=m.z;g.cooldown=0;g.effects=[];
  assert(interact(g));assert.equal(g.player.carrying,null);assert.equal(g.player.flight,null);
  assert.equal(s.flight.phase,'place');let maxH=0,springs=0;const peaks=[0,0,0];
  for(let i=0;i<280;i++){
    updateGarden(g,1/60);maxH=Math.max(maxH,s.h);
    if(s.flight?.phase==='bounce')peaks[s.flight.index]=Math.max(peaks[s.flight.index],s.h);
    springs+=g.effects.filter(e=>e.kind==='sound'&&e.type==='spring').length;g.effects=[];
  }
  assert.equal(springs,3);assert(peaks[0]>peaks[1]&&peaks[1]>peaks[2]);
  assert(maxH>(m.big?5:3));assert.equal(s.flight,null);assert.equal(s.h,.3);assert(walkable(g,s.x,s.z));assert(distanceForTest(s,m)<3);
  assert.equal(g.stage,1);assert.equal(g.watered,false);assert.equal(g.waves.length,0);
  touch(g,s.id);assert.equal(g.player.carrying,s.id);touch(g,id);assert.equal(s.flight.mode,'mushroom');
});
function distanceForTest(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}

test('saving during placement and every mushroom bounce restores the seed by that mushroom',()=>{
  for(const id of ['mushroom-small','mushroom-big']){
    const g=makeGarden({stage:1,found:['bloom'],grown:['soil-a']});touch(g,'seed-0');touch(g,id);const s=g.seeds[0],m=obj(g,id),phases=new Set();
    for(let i=0;i<260;i++){
      if(s.flight){
        const phase=s.flight.phase==='place'?'place':s.flight.index;phases.add(phase);
        const restored=makeGarden(JSON.parse(JSON.stringify(snapshot(g))));const rs=restored.seeds[0];
        assert(!rs.flight);assert(walkable(restored,rs.x,rs.z));assert(distanceForTest(rs,m)<3);
        assert(restored.grown.has('soil-a'));assert.equal(restored.stage,1);
      }
      updateGarden(g,1/60);
    }
    assert.equal(phases.size,4);
  }
});
test('tapping another mushroom while carrying approaches it and bounces only the seed',()=>{
  const g=makeGarden({stage:1,carrying:'seed-0',player:{x:23,z:11}}),m=obj(g,'mushroom-small');
  goTo(g,m.x,m.z,m.id);frames(g,70);assert.equal(g.player.carrying,null);assert(g.seeds[0].flight);assert.equal(g.player.flight,null);
  frames(g,210);assert.equal(g.seeds[0].flight,null);assert(walkable(g,g.seeds[0].x,g.seeds[0].z));
});

test('rabbit chases a nearby moving seed and noses it back towards the player',()=>{
  const g=makeGarden({stage:1,player:{x:20,z:20}}),r=g.rabbit,s=g.seeds[0];r.x=25;r.z=20;r.pause=0;s.x=22;s.z=20;s.vx=.3;
  const start=r.x;for(let i=0;i<200&&r.nudge===0;i++)updateGarden(g,1/60);
  assert(r.x<start-1);assert(r.nudge>0);assert(s.vx<0);assert.equal(g.player.carrying,null);assert(walkable(g,r.x,r.z));
});
test('rabbit follows a carried seed without stealing it, then plays after it is placed',()=>{
  const g=makeGarden({stage:1,carrying:'seed-0',player:{x:22,z:20}}),r=g.rabbit;r.x=27;r.z=20;r.pause=0;
  frames(g,130);assert.equal(g.player.carrying,'seed-0');assert(distanceForTest(r,g.player)<1.6);assert.equal(r.mode,'curious');
  g.cooldown=0;interact(g,null);assert.equal(g.player.carrying,null);
  for(let i=0;i<180&&r.nudge===0;i++)updateGarden(g,1/60);assert(r.nudge>0);
});
test('tapping the rabbit approaches and pets it without adding a progression requirement',()=>{
  const g=makeGarden({stage:1,player:{x:23,z:16}}),r=g.rabbit;goTo(g,r.x,r.z,r.id);frames(g,100);
  assert(r.pet>0);assert.equal(g.target,null);assert.equal(g.found.size,0);assert.equal(g.stage,1);
  assert(g.effects.some(e=>e.kind==='petals'));
});
test('rabbit imitates player and seed mushroom jumps, with a bigger response to large mushrooms',()=>{
  const g=makeGarden({stage:1}),r=g.rabbit,m=obj(g,'mushroom-small');r.x=m.x+2;r.z=m.z;touch(g,m.id);assert(r.ride);const small=r.hopHeight;
  g.player.flight=null;r.ride=null;r.jumpPriority=false;const big=obj(g,'mushroom-big');r.x=big.x-2;r.z=big.z;touch(g,big.id);assert(r.hopHeight>small);
  g.player.flight=null;r.ride=null;r.jumpPriority=false;touch(g,'seed-0');r.x=m.x+2;r.z=m.z;touch(g,m.id);frames(g,20);assert(r.hop>0);assert.equal(g.player.flight,null);
  const far=makeGarden({stage:1});far.rabbit.x=18;far.rabbit.z=29;touch(far,'mushroom-big');assert.equal(far.rabbit.hop,0);
});
test('rabbit stays on walkable land during long chases, rests between strolls and restores safely',()=>{
  const g=makeGarden({stage:1,carrying:'seed-0',player:{x:29.9,z:20}}),r=g.rabbit;r.x=29;r.z=20;r.pause=0;
  for(let i=0;i<900;i++){updateGarden(g,1/60);assert(walkable(g,r.x,r.z));assert(r.x<=30.15);}
  const saved=makeGarden(snapshot(g));assert.equal(saved.rabbit.x,r.x);assert.equal(saved.player.carrying,'seed-0');
  const invalid=makeGarden({stage:1,rabbit:{x:Infinity,z:999}});assert(walkable(invalid,invalid.rabbit.x,invalid.rabbit.z));
  const idle=makeGarden({stage:1});idle.seeds.forEach(s=>{s.x=5;s.z=24;});idle.rabbit.pause=0;
  let rested=false;for(let i=0;i<1500;i++){updateGarden(idle,1/60);if(idle.rabbit.pause>0)rested=true;assert(walkable(idle,idle.rabbit.x,idle.rabbit.z));}assert(rested);
});

for(const state of ['chase','rest','nose'])test(`rabbit interrupts ${state}, mounts the actual mushroom and resumes after landing`,()=>{
  const g=makeGarden({stage:1}),r=g.rabbit,m=obj(g,'mushroom-small'),s=g.seeds[0];
  r.x=m.x+3;r.z=m.z;r.mode=state;r.pause=state==='rest'?8:0;r.nudge=0;
  r.path=[{x:r.x+1,z:r.z}];s.x=r.x+.3;s.z=r.z;s.vx=0;s.vz=0;
  touch(g,m.id);assert(r.jumpPriority);assert.equal(r.ride.mushroomId,m.id);
  const phases=new Set();let stood=false,jumped=false;
  for(let i=0;i<500&&r.jumpPriority;i++){
    phases.add(r.ride.phase);updateGarden(g,1/60);assert.equal(r.nudge,0);assert.equal(s.vx,0);
    if(r.ride?.phase==='perch'){assert.equal(r.x,m.x);assert.equal(r.z,m.z);assert(r.lift>0);stood=true;}
    if(r.ride?.phase==='jump'&&r.lift>r.ride.capH+.2)jumped=true;
    assert(walkable(g,r.x,r.z));
  }
  assert.deepEqual([...phases],['approach','mount','perch','jump','recover']);assert(stood);assert(jumped);
  assert(!r.jumpPriority);assert.equal(r.lift,0);assert(distanceForTest(r,m)>1);assert(distanceForTest(r,m)<2);
  for(let i=0;i<120&&r.nudge===0;i++)updateGarden(g,1/60);assert(r.nudge>0);
});
test('a lower priority seed bounce cannot replace the selected mushroom or large jump',()=>{
  const g=makeGarden({stage:1,carrying:'seed-0'}),r=g.rabbit,big=obj(g,'mushroom-big'),small=obj(g,'mushroom-small');
  r.x=25;r.z=10;touch(g,small.id);assert(g.seeds[0].flight);
  touch(g,big.id);assert(r.jumpPriority);assert.equal(r.hopHeight,2.6);
  frames(g,22);assert.equal(r.hopHeight,2.6);assert(r.jumpPriority);assert.equal(r.ride.mushroomId,big.id);
});
test('a distant jump does not interrupt rabbit play and save/restore clears the temporary ride',()=>{
  const g=makeGarden({stage:1}),r=g.rabbit;r.x=18;r.z=28;r.mode='chase';r.pause=0;
  touch(g,'mushroom-big');assert(!r.jumpPriority);
  g.player.flight=null;r.x=27;r.z=10;touch(g,'mushroom-big');assert(r.jumpPriority);
  const restored=makeGarden(snapshot(g));assert(!restored.rabbit.jumpPriority);assert.equal(restored.rabbit.ride,null);assert(walkable(restored,restored.rabbit.x,restored.rabbit.z));
});
test('all three mushrooms give safe rides and save safely throughout every phase',()=>{
  const peaks=[];
  for(const id of ['mushroom-small','mushroom-big','mushroom-chain']){
    const g=makeGarden({stage:1}),r=g.rabbit,m=obj(g,id);r.x=m.x-2;r.z=m.z+1;touch(g,id);
    let peak=0;const phases=new Set();
    for(let i=0;i<550&&r.jumpPriority;i++){
      phases.add(r.ride.phase);updateGarden(g,1/60);peak=Math.max(peak,r.lift);
      const restored=makeGarden(JSON.parse(JSON.stringify(snapshot(g))));assert(walkable(restored,restored.rabbit.x,restored.rabbit.z));assert.equal(restored.rabbit.lift,0);assert.equal(restored.rabbit.ride,null);
      assert(walkable(g,r.x,r.z));
    }
    peaks.push(peak);assert.equal(phases.size,5);assert(!r.jumpPriority);assert(walkable(g,r.x,r.z));
  }
  assert(peaks[1]>peaks[0]+1);
});
test('rabbit uses the open crossing instead of jumping across the river to reach a mushroom',()=>{
  const g=makeGarden({stage:2}),r=g.rabbit,m=obj(g,'mushroom-big');r.x=35;r.z=10;touch(g,m.id);
  let crossed=false;
  for(let i=0;i<700&&r.jumpPriority;i++){
    updateGarden(g,1/60);assert(walkable(g,r.x,r.z));
    if(r.x>30.15&&r.x<33.2){assert(r.z>=8.3&&r.z<=9.9||r.z>=24.25&&r.z<=25.95);assert.equal(r.lift,0);crossed=true;}
  }
  assert(crossed);assert(!r.jumpPriority);assert(r.x<30.15);
});
