import {beginEnding,updateEnding} from './garden-ending.js';
import {beginTreeReply,updateTreeReply} from './garden-finale.js';
export const DISCOVERIES = ['bloom','seed','music','mushroom','bridge','water','stone','tree'];
export const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
export const TREE_SPOTS = [
  [3,14.3,1.4],[5.8,13.5,1.3],[2.3,26.9,1.25],[13,26.8,1.2],
  [16,6,1.55],[23.5,5.7,1.6],[29,5.5,1.4],[16,31.4,1.5],[27.8,31.4,1.6],
  [35,5.7,1.6],[44.8,6.2,1.65],[46.5,14.5,1.3],[45.8,23,1.5],[35,31.7,1.4],[44.5,32,1.6]
];
const H = .6;

export function makeGarden(saved = {}) {
  const validSaved = saved && typeof saved==='object' ? saved : {};
  const g = {
    t:0,ending:null,endingPending:false,endingSeen:!!validSaved.endingSeen,treeReply:null,treeCelebrated:!!validSaved.treeCelebrated, stage:clamp(Number(validSaved.stage)||0,0,2), found:new Set((Array.isArray(validSaved.found)?validSaved.found:[]).filter(v=>DISCOVERIES.includes(v))),
    grown:new Set((Array.isArray(validSaved.grown)?validSaved.grown:[]).filter(v=>['soil-a','soil-b','soil-c'].includes(v))),
    stoneTaps:clamp(Number(validSaved.stoneTaps)||0,0,3), watered:!!validSaved.watered, potOpen:!!validSaved.potOpen,
    player:{x:7,z:23,h:0,vx:0,vz:0,dirX:0,dirZ:1,walk:0,gesture:0,flight:null,carrying:null},
    rabbit:{id:'rabbit',type:'rabbit',x:24.7,z:15.2,h:.6,pulse:0,dir:1,moving:false,mode:'rest',pause:1.5,retarget:0,nudge:0,pet:0,hop:0,jumpPriority:false,ride:null,hopDuration:.7,hopHeight:.5,lift:0,path:[]},
    objects:[], seeds:[], effects:[], waves:[], chainFlowers:[], path:[], target:null, hint:null, hintsEnabled:false, cooldown:0, dirty:false, allPulse:0, musicPulse:0,
  };
  if(g.found.has('bloom'))g.stage=Math.max(1,g.stage);
  if(g.found.has('bridge'))g.stage=2;
  const add = (id,type,x,z,extra={}) => {const o={id,type,x,z,pulse:0,h:0,...extra};g.objects.push(o);return o;};
  add('bloom','bloom',10,19,{h:1.2});
  add('pot','pot',10.8,25,{h:.6});
  add('bell-a','bell',18,18.5,{h:1.8,note:60});
  add('bell-b','bell',20.2,17.6,{h:2.2,note:64});
  add('bell-c','bell',22.4,18.4,{h:1.55,note:67});
  add('mushroom-small','mushroom',21,10.5,{h:1.1});
  add('mushroom-big','mushroom',28.4,9.1,{h:1.8,big:true});
  add('bridge','log',29.1,25.1,{h:.6});
  add('water','water',18.3,27,{h:.65});
  add('mushroom-chain','mushroom',19.4,24.6,{h:1.1,chain:true});
  g.chainFlowers=[[16.9,27.8],[18,29],[19.8,28.8],[21.4,28.4],[22.4,26.7]].map(([x,z],i)=>({x,z,id:'chain-flower-'+i,bloom:0,open:0,butterflies:0}));
  add('soil-a','soil',23.1,23.2);
  add('soil-b','soil',23.7,27.4);
  add('soil-c','soil',36.8,18.7);
  add('stone','stone',39.1,25.6,{h:1});
  add('tree','tree',40.5,12.5,{h:3.7});
  [[20.2,23.1],[18.2,23.9],[35.4,20.5]].forEach(([x,z],i)=>{
    const s = validSaved.seeds?.[i];
    g.seeds.push({id:'seed-'+i,type:'seed',x:s&&Number.isFinite(s.x)?clamp(s.x,3,46):x,z:s&&Number.isFinite(s.z)?clamp(s.z,6,31):z,vx:0,vz:0,spin:0,pulse:0,h:.3});
  });
  const p=validSaved.player;
  if(p && Number.isFinite(p.x)&&Number.isFinite(p.z)&&walkable(g,p.x,p.z)){g.player.x=p.x;g.player.z=p.z;}
  for(const s of g.seeds)if(!walkable(g,s.x,s.z)){s.x=20;s.z=23;}
  if(g.seeds.some(s=>s.id===validSaved.carrying))g.player.carrying=validSaved.carrying;
  const rabbitSave=validSaved.rabbit;
  if(g.stage>=1&&rabbitSave&&walkable(g,rabbitSave.x,rabbitSave.z)){g.rabbit.x=rabbitSave.x;g.rabbit.z=rabbitSave.z;}
  syncCarried(g);
  return g;
}

export function walkable(g,x,z) {
  if(!Number.isFinite(x)||!Number.isFinite(z))return false;
  const nursery=x>=2.2&&x<=14.4&&z>=14.1&&z<=27.1;
  const meadow=g.stage>=1&&x>=13.4&&x<=30.15&&z>=5.5&&z<=32;
  const grove=g.stage>=2&&x>=33.2&&x<=46.4&&z>=5.5&&z<=32;
  const crossing=g.stage>=2&&x>=29.6&&x<=33.8&&((z>=24.25&&z<=25.95)||(z>=8.3&&z<=9.9));
  if(!nursery&&!meadow&&!grove&&!crossing)return false;
  if(x>13.1&&x<14.7&&!(g.stage>=1&&z>19&&z<22.4))return false;
  if(g.stage===0&&x>13.1)return false;
  if(Math.pow((x-40.3)/3.25,2)+Math.pow((z-28.6)/1.95,2)<1)return false;
  if(Math.hypot(x-40.5,z-12.5)<.95)return false;
  for(const [tx,tz] of TREE_SPOTS)if(Math.hypot(x-tx,z-tz)<.65)return false;
  return true;
}

export function findPath(g,from,to) {
  const key=(x,z)=>x+','+z;
  const sx=Math.round(from.x/H),sz=Math.round(from.z/H);
  let tx=Math.round(to.x/H),tz=Math.round(to.z/H);
  if(!walkable(g,tx*H,tz*H)){
    let best=Infinity;
    for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++){
      const x=tx+dx,z=tz+dz,d=Math.hypot(x*H-to.x,z*H-to.z);
      if(d<best&&walkable(g,x*H,z*H)){best=d;to={x:x*H,z:z*H};}
    }
    if(best===Infinity)return [];
    tx=Math.round(to.x/H);tz=Math.round(to.z/H);
  }
  const open=[{x:sx,z:sz,g:0,f:0}], costs=new Map([[key(sx,sz),0]]),parents=new Map(),closed=new Set();
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  let end=null;
  for(let n=0;open.length&&n<6000;n++){
    let best=0;for(let i=1;i<open.length;i++)if(open[i].f<open[best].f)best=i;
    const c=open.splice(best,1)[0],ck=key(c.x,c.z);
    if(closed.has(ck))continue;
    if(c.x===tx&&c.z===tz){end=c;break;}
    closed.add(ck);
    for(const [dx,dz] of dirs){
      const x=c.x+dx,z=c.z+dz,k=key(x,z);
      if(closed.has(k)||!walkable(g,x*H,z*H))continue;
      if(dx&&dz&&(!walkable(g,(c.x+dx)*H,c.z*H)||!walkable(g,c.x*H,(c.z+dz)*H)))continue;
      const cost=c.g+Math.hypot(dx,dz);
      if(cost>=(costs.get(k)??Infinity))continue;
      costs.set(k,cost);parents.set(k,ck);open.push({x,z,g:cost,f:cost+Math.hypot(x-tx,z-tz)});
    }
  }
  if(!end)return [];
  const result=[];let k=key(end.x,end.z);
  while(k!==key(sx,sz)){
    const [x,z]=k.split(',').map(Number);result.push({x:x*H,z:z*H});k=parents.get(k);if(!k)return [];
  }
  result.reverse();return result;
}

export function goTo(g,x,z,id=null) {
  if(g.player.flight||g.ending||g.endingPending)return;
  g.target=id;
  g.path=findPath(g,g.player,{x,z});
  const target=allObjects(g).find(o=>o.id===id);
  if(!g.path.length&&target&&distance(g.player,target)<2.1)interact(g,target);
  if(!g.path.length&&!target)g.target=null;
}
export const allObjects = g => [...g.objects,...(g.stage>=1?[g.rabbit]:[]),...g.seeds.filter(s=>s.id!==g.player.carrying&&!s.flight)];
export function nearest(g) {
  let best=null,d=2.15;
  for(const o of allObjects(g)){
    if(o.x>14&&g.stage<1||o.x>33&&g.stage<2)continue;
    const d0=distance(g.player,o);
    if(d0<d){d=d0;best=o;}
  }
  return best;
}
function fx(g,kind,x,z,extra={}){g.effects.push({kind,x,z,...extra});}
function note(g,notes,kind='soft'){g.effects.push({kind:'sound',notes,type:kind});}
function discover(g,id,x,z){
  if(g.found.has(id))return;
  g.found.add(id);g.dirty=true;
  if(id!=='tree'){fx(g,'discovery',x,z,{color:'#ffe7a0'});note(g,[72,76,79,84],'chime');}
  if(g.found.size===DISCOVERIES.length&&id!=='tree'){g.allPulse=9;note(g,[60,67,72],'warm');}
}
function openGrove(g){
  if(g.stage<2){g.stage=2;g.dirty=true;fx(g,'discovery',31.5,25,{color:'#d9efb0'});}
}

function launchSeed(g,s,m){
  if(s.id===g.player.carrying||s.flight||s.rest>0)return false;
  const water=g.objects.find(o=>o.type==='water');
  s.flight={x0:s.x,z0:s.z,x1:water.x,z1:water.z,t:0,duration:1.25,height:3};
  s.vx=0;s.vz=0;m.pulse=1;rabbitReact(g,m,true);
  fx(g,'spores',m.x,m.z);note(g,[55,67,79],'spring');
  return true;
}
function bounceOnMushroom(g,s,f,index){
  const m=g.objects.find(o=>o.id===f.mushroomId),last=index===2;
  const height=(m.big?3.8:1.8)*Math.pow(.62,index);
  s.flight={...f,phase:'bounce',index,x0:m.x,z0:m.z,x1:last?f.safeX:m.x,z1:last?f.safeZ:m.z,h0:f.capH,h1:last?.3:f.capH,t:0,duration:(m.big?1.15:.85)*Math.pow(.82,index),height};
  m.pulse=1;rabbitReact(g,m,m.big);fx(g,'spores',m.x,m.z);note(g,[55+index*4,m.big?79:72],'spring');
  discover(g,'mushroom',m.x,m.z);
}
function splash(g,o){
  if(g.waves.length>=3)return;
  o.pulse=1;g.watered=true;g.dirty=true;
  g.waves.push({x:o.x,z:o.z,radius:0,hit:new Set()});
  discover(g,'water',o.x,o.z);fx(g,'water',o.x,o.z,{color:'#d4f6ea'});note(g,[76,79,83,88],'water');
}

function syncCarried(g){
  const p=g.player,s=g.seeds.find(s=>s.id===p.carrying);
  if(s){s.x=p.x;s.z=p.z+.16;s.h=p.h+.82;s.vx=0;s.vz=0;s.spin=0;}
}
function putDown(g,target){
  const p=g.player,s=g.seeds.find(s=>s.id===p.carrying);
  if(!s)return false;
  const nearby=target&&distance(p,target)<=2.3;
  let spot=null;
  if(nearby&&target.type==='soil')spot={x:target.x,z:target.z};
  if(!spot){
    const angle=Math.atan2(p.dirZ,p.dirX);
    for(const turn of [0,.6,-.6,1.2,-1.2,Math.PI]){
      const x=p.x+Math.cos(angle+turn)*1.05,z=p.z+Math.sin(angle+turn)*1.05;
      if(walkable(g,x,z)){spot={x,z};break;}
    }
  }
  if(!spot)spot={x:p.x,z:p.z};
  if(!walkable(g,spot.x,spot.z))return false;
  s.inviteUntil=g.t+10;
  p.carrying=null;s.x=spot.x;s.z=spot.z;s.h=.3;s.vx=0;s.vz=0;s.rest=.4;
  p.gesture=.45;g.cooldown=.4;g.path=[];g.target=null;g.dirty=true;
  if(nearby&&target.type==='mushroom'){
    if(target.chain){s.rest=0;launchSeed(g,s,target);}
    else{
      const capH=(target.big?1.35:.9)*1.45+.3;
      s.x=p.x;s.z=p.z;s.h=.82;
      s.flight={mode:'mushroom',phase:'place',mushroomId:target.id,x0:p.x,z0:p.z,x1:target.x,z1:target.z,t:0,duration:.28,height:.3,h0:.82,h1:capH,capH,safeX:spot.x,safeZ:spot.z};
    }
  }
  else if(nearby&&target.type==='water'){
    s.flight={x0:p.x,z0:p.z,x1:target.x,z1:target.z,t:0,duration:.7,height:1.4};
    note(g,[67,74],'soft');
  }else{fx(g,'dust',s.x,s.z);note(g,[59,64],'wood');}
  return true;
}

export function interact(g,target=nearest(g)) {
  const p=g.player;
  if(g.cooldown>0||p.flight||g.ending||g.endingPending)return false;
  if(p.carrying)return putDown(g,target);
  if(!target){p.flight={x0:p.x,z0:p.z,x1:p.x,z1:p.z,t:0,duration:.55,height:.65};g.cooldown=.4;note(g,[64]);return true;}
  if(distance(p,target)>2.3)return false;
  g.cooldown=.4;p.gesture=.45;target.pulse=1;g.path=[];g.target=null;
  const o=target;
  switch(o.type){
    case 'rabbit':
      g.rabbit.pet=2.5;g.rabbit.pause=1;g.rabbit.path=[];g.rabbit.mode='happy';
      rabbitReact(g,o,false);fx(g,'petals',o.x,o.z,{color:'#f8d7b1'});note(g,[79,83,86],'soft');break;
    case 'bloom':
      if(g.stage===0){g.stage=1;g.dirty=true;fx(g,'trail',o.x,o.z,{toX:14,toZ:20.7});}
      discover(g,'bloom',o.x,o.z);fx(g,'petals',o.x,o.z,{color:'#fac6aa'});note(g,[67,72,76]);break;
    case 'seed':{
      if(o.flight)return false;
      p.carrying=o.id;o.vx=0;o.vz=0;o.rest=0;g.dirty=true;
      syncCarried(g);fx(g,'spores',p.x,p.z,{color:'#f5dfa2'});note(g,[64,71],'wood');break;
    }
    case 'bell':
      discover(g,'music',o.x,o.z);note(g,[o.note,o.note+12],'bell');g.musicPulse=3;fx(g,'music',o.x,o.z,{color:'#f6d681'});break;
    case 'mushroom':{
      if(o.chain){
        const seed=g.seeds.filter(s=>!s.flight&&!(s.rest>0)&&distance(s,o)<2.4).sort((a,b)=>distance(a,o)-distance(b,o))[0];
        if(seed)launchSeed(g,seed,o);
      }
      const crossing=o.big&&p.x<32;
      if(crossing)openGrove(g);
      p.flight={x0:p.x,z0:p.z,x1:crossing?35.2:p.x,z1:crossing?9.2:p.z,t:0,duration:crossing?1.65:1.05,height:crossing?4.3:2.5};
      rabbitReact(g,o,o.big,true);
      discover(g,'mushroom',o.x,o.z);fx(g,'spores',o.x,o.z);note(g,[55,67,79],'spring');break;
    }
    case 'log':openGrove(g);discover(g,'bridge',o.x,o.z);fx(g,'leaves',31,25);note(g,[43,55],'wood');break;
    case 'water':splash(g,o);break;
    case 'stone':
      g.stoneTaps=Math.min(3,g.stoneTaps+1);g.dirty=true;
      fx(g,g.stoneTaps>=3?'fireflies':'dust',o.x,o.z,{color:'#ffe899'});note(g,[55+g.stoneTaps*4,67+g.stoneTaps*4],'chime');
      if(g.stoneTaps>=3)discover(g,'stone',o.x,o.z);break;
    case 'tree':
      discover(g,'tree',o.x,o.z);beginTreeReply(g);break;
    case 'soil':fx(g,'spores',o.x,o.z,{color:'#a8dca4'});note(g,[62]);break;
    case 'pot':g.potOpen=!g.potOpen;g.dirty=true;fx(g,'fireflies',o.x,o.z);note(g,[76,83,88],'chime');break;
  }
  return true;
}
function move(g,dx,dz){
  const p=g.player,ox=p.x,oz=p.z;
  if(walkable(g,p.x+dx,p.z))p.x+=dx;
  if(walkable(g,p.x,p.z+dz))p.z+=dz;
  return Math.hypot(p.x-ox,p.z-oz);
}
function rabbitReact(g,source,big,priority=false){
  const r=g.rabbit;
  if(g.stage<1||distance(r,source)>8||r.jumpPriority&&!priority)return;
  if(priority){
    if(r.ride)return;
    const path=findPath(g,r,source);
    if(!path.length&&distance(r,source)>.8)return;
    const d=distance(r,source),dx=d>.01?(r.x-source.x)/d:-1,dz=d>.01?(r.z-source.z)/d:0;
    let land={x:r.x,z:r.z};
    for(const radius of [1.7,1.3,.9]){
      const x=source.x+dx*radius,z=source.z+dz*radius;
      if([.25,.5,.75,1].every(u=>walkable(g,source.x+(x-source.x)*u,source.z+(z-source.z)*u))){land={x,z};break;}
    }
    r.jumpPriority=true;r.path=path;r.retarget=0;r.moving=false;r.hop=0;r.lift=0;r.pause=0;
    r.hopHeight=big?2.6:1.25;
    r.ride={mushroomId:source.id,phase:'approach',t:0,capH:(source.big?1.35:.9)*1.45,landX:land.x,landZ:land.z,safeX:r.x,safeZ:r.z};
    r.mode='to-mushroom';
  }else{
    r.hopDuration=big?.9:.65;r.hop=r.hopDuration;r.hopHeight=big?.95:.45;
    r.pause=Math.max(r.pause,.3);r.mode='happy';
  }
}
function updateRabbitRide(g,dt){
  const r=g.rabbit,f=r.ride,m=g.objects.find(o=>o.id===f.mushroomId);f.t+=dt;
  if(f.phase==='approach'){
    r.mode='to-mushroom';
    if(distance(r,m)<=.8){f.phase='mount';f.t=0;f.x0=r.x;f.z0=r.z;f.safeX=r.x;f.safeZ=r.z;r.path=[];}
    else if(r.path.length&&f.t<10){
      const next=r.path[0],d=distance(r,next),step=Math.min(d,dt*3.8);
      if(d<.13)r.path.shift();
      else{
        const x=r.x+(next.x-r.x)/d*step,z=r.z+(next.z-r.z)/d*step;
        if(walkable(g,x,z)&&walkable(g,x,r.z)&&walkable(g,r.x,z)){r.dir=x<r.x?-1:1;r.x=x;r.z=z;r.moving=true;f.safeX=x;f.safeZ=z;}
        else{r.ride=null;r.jumpPriority=false;r.path=[];r.pause=.35;}
      }
    }else{r.ride=null;r.jumpPriority=false;r.path=[];r.pause=.35;}
    return;
  }
  if(f.phase==='mount'){
    r.mode='mount';const u=clamp(f.t/.42,0,1);
    r.x=f.x0+(m.x-f.x0)*u;r.z=f.z0+(m.z-f.z0)*u;r.lift=f.capH*u+Math.sin(u*Math.PI)*.4;
    if(u===1){f.phase='perch';f.t=0;m.pulse=1;}
  }else if(f.phase==='perch'){
    r.mode='perch';r.lift=f.capH*(1-Math.sin(m.pulse*Math.PI)*.25);
    if(f.t>=.24){f.phase='jump';f.t=0;m.pulse=0;fx(g,'spores',m.x,m.z);note(g,m.big?[55,67,79]:[60,72],'spring');}
  }else if(f.phase==='jump'){
    r.mode='jump';const u=clamp(f.t/(m.big?1.3:.95),0,1);
    r.x=m.x+(f.landX-m.x)*u;r.z=m.z+(f.landZ-m.z)*u;
    r.lift=f.capH*(1-u)+Math.sin(u*Math.PI)*r.hopHeight;
    if(u===1){f.phase='recover';f.t=0;r.lift=0;g.dirty=true;fx(g,'dust',r.x,r.z);}
  }else{
    r.mode='rest';r.lift=0;
    if(f.t>=.35){r.ride=null;r.jumpPriority=false;r.retarget=0;r.path=[];}
  }
}
function updateRabbit(g,dt){
  const r=g.rabbit;r.moving=false;
  if(g.stage<1)return;
  r.nudge=Math.max(0,r.nudge-dt);r.pet=Math.max(0,r.pet-dt);r.pause=Math.max(0,r.pause-dt);r.retarget-=dt;
  if(r.ride){updateRabbitRide(g,dt);return;}
  r.hop=Math.max(0,r.hop-dt);r.lift=r.hop>0?Math.sin(Math.PI*(1-r.hop/r.hopDuration))*r.hopHeight:0;
  if(r.jumpPriority){
    if(r.hop>0||r.pause>0){r.mode=r.hop>0?'jump':'rest';return;}
    r.jumpPriority=false;r.retarget=0;
  }
  if(g.treeReply?.full&&g.target!==r.id){
    // Keep existing mushroom rides/landings ahead of this gentle invitation.
    const p=g.player,goal={x:p.x-.9,z:p.z+.9};
    if(distance(r,p)<1.7){r.path=[];r.mode='rest';r.dir=p.x<r.x?-1:1;r.pet=.3;return;}
    if(r.retarget<=0){r.path=findPath(g,r,walkable(g,goal.x,goal.z)?goal:p);r.retarget=.6;}
    const next=r.path[0];
    if(next){const d=distance(r,next),step=Math.min(d,dt*3.8);if(d<.13)r.path.shift();else{
      const x=r.x+(next.x-r.x)/d*step,z=r.z+(next.z-r.z)/d*step;
      if(walkable(g,x,z)&&walkable(g,x,r.z)&&walkable(g,r.x,z)){r.dir=x<r.x?-1:1;r.x=x;r.z=z;r.moving=true;r.mode='curious';}
      else{r.path=[];r.retarget=0;}
    }}
    return;
  }
  if(g.target===r.id){r.path=[];r.retarget=0;r.mode='curious';r.dir=g.player.x<r.x?-1:1;return;}
  if(r.pause>0){r.mode=r.pet>0?'happy':'rest';return;}
  const held=g.seeds.find(s=>s.id===g.player.carrying);
  const candidates=g.seeds.filter(s=>s.id!==g.player.carrying&&!s.flight&&walkable(g,s.x,s.z)&&distance(r,s)<(Math.hypot(s.vx,s.vz)>.15||s.inviteUntil>g.t?10:6));
  candidates.sort((a,b)=>distance(r,a)-distance(r,b));
  const seed=candidates[0],lure=held&&distance(r,g.player)<9?g.player:null,target=lure||seed;
  if(target){
    r.mode=lure?'curious':'chase';r.dir=target.x<r.x?-1:1;
    const d=distance(r,target);
    if(d<(lure?1.35:.85)){
      r.path=[];r.retarget=0;
      if(!lure&&r.nudge===0){
        let dx=g.player.x-seed.x,dz=g.player.z-seed.z,dd=Math.hypot(dx,dz);
        if(dd<1.5){dx=seed.x-r.x;dz=seed.z-r.z;dd=Math.hypot(dx,dz)||1;}
        seed.vx=dx/dd*2.8;seed.vz=dz/dd*2.8;seed.inviteUntil=g.t+6;
        r.nudge=2.5;r.pause=.85;r.pet=1;r.mode='happy';g.dirty=true;
        rabbitReact(g,r,false);fx(g,'dust',seed.x,seed.z);note(g,[64,71],'wood');
      }
      return;
    }
    if(r.retarget<=0){r.path=findPath(g,r,target);r.retarget=.65;}
  }else{
    r.mode=r.pet>0?'happy':'wander';
    if(!r.path.length&&r.retarget<=0){
      const angle=g.t*.73;
      const spot={x:24+Math.cos(angle)*3.2,z:16+Math.sin(angle)*3.2};
      r.path=findPath(g,r,spot);r.retarget=3;
    }
  }
  if(r.path.length){
    const next=r.path[0],d=distance(r,next);
    if(d<.13){r.path.shift();if(!target&&!r.path.length){r.pause=1.8;r.mode='rest';r.retarget=0;}}
    else{
      const step=Math.min(d,dt*(target?3.1:1.3)),dx=(next.x-r.x)/d*step,dz=(next.z-r.z)/d*step;
      if(walkable(g,r.x+dx,r.z+dz)&&walkable(g,r.x+dx,r.z)&&walkable(g,r.x,r.z+dz)){
        r.x+=dx;r.z+=dz;r.dir=dx<0?-1:dx>0?1:r.dir;r.moving=true;
      }else{r.path=[];r.retarget=0;}
    }
  }else if(!target&&r.retarget<=0){r.pause=1.8;r.retarget=2;}
}
export function updateGarden(g,dt,input={x:0,z:0}) {
  if(g.ending){updateEnding(g,dt);return;}
  dt=clamp(dt,0,.05);g.t+=dt;g.cooldown=Math.max(0,g.cooldown-dt);g.musicPulse=Math.max(0,g.musicPulse-dt);g.allPulse=Math.max(0,g.allPulse-dt);
  const p=g.player;p.gesture=Math.max(0,p.gesture-dt);
  for(const o of allObjects(g))o.pulse=Math.max(0,o.pulse-dt*1.8);
  if(p.flight){
    const f=p.flight;f.t+=dt;const u=clamp(f.t/f.duration,0,1),v=u*u*(3-2*u);
    p.x=f.x0+(f.x1-f.x0)*v;p.z=f.z0+(f.z1-f.z0)*v;p.h=Math.sin(u*Math.PI)*f.height;
    if(u===1){p.flight=null;p.h=0;g.dirty=true;fx(g,'dust',p.x,p.z);note(g,[60],'wood');}
  }else{
    let dx=input.x||0,dz=input.z||0;
    if(dx||dz){g.path=[];g.target=null;}
    else if(g.path.length){
      if(g.target){const o=allObjects(g).find(o=>o.id===g.target);if(o&&distance(p,o)<1.7){interact(g,o);}}
      if(g.path.length){const t=g.path[0],d=distance(p,t);if(d<.16)g.path.shift();else{dx=(t.x-p.x)/d;dz=(t.z-p.z)/d;}}
    }
    const d=Math.hypot(dx,dz);
    let moved=0;
    if(d>.01){dx/=Math.max(1,d);dz/=Math.max(1,d);moved=move(g,dx*4.1*dt,dz*4.1*dt);p.dirX=dx;p.dirZ=dz;p.walk+=moved*2.8;}
    p.vx=dx*4.1;p.vz=dz*4.1;
    if(moved<.001&&g.path.length&&d){g.path=[];g.target=null;}
    if(!g.path.length&&g.target){const o=allObjects(g).find(o=>o.id===g.target);if(o)interact(g,o);g.target=null;}
    for(const s of g.seeds){
      const dd=distance(p,s);
      if(s.id!==p.carrying&&!s.flight&&dd<.76&&moved>.001){
        const sx=dd>.05?(s.x-p.x)/dd:dx,sz=dd>.05?(s.z-p.z)/dd:dz;
        s.vx+=sx*dt*12;s.vz+=sz*dt*12;
        if(walkable(g,p.x+sx*.77,p.z+sz*.77)){s.x=p.x+sx*.77;s.z=p.z+sz*.77;}
      }
    }
  }
  syncCarried(g);
  for(const s of g.seeds){
    if(s.id===p.carrying)continue;
    s.rest=Math.max(0,(s.rest||0)-dt);
    if(s.flight){
      const f=s.flight;f.t+=dt;const u=clamp(f.t/f.duration,0,1);
      s.x=f.x0+(f.x1-f.x0)*u;s.z=f.z0+(f.z1-f.z0)*u;s.h=(f.h0??.3)+((f.h1??.3)-(f.h0??.3))*u+Math.sin(u*Math.PI)*f.height;s.spin+=dt*6;
      if(u===1){
        if(f.mode==='mushroom'){
          if(f.phase==='place'||f.index<2)bounceOnMushroom(g,s,f,f.phase==='place'?0:f.index+1);
          else{s.flight=null;s.h=.3;s.rest=.5;g.dirty=true;fx(g,'dust',s.x,s.z);note(g,[55],'wood');}
        }
        else if(f.returning){s.flight=null;s.h=.3;s.rest=1.5;g.dirty=true;}
        else{
          splash(g,g.objects.find(o=>o.type==='water'));
          s.flight={x0:s.x,z0:s.z,x1:19.7,z1:25.6,t:0,duration:.65,height:1.1,returning:true};
        }
      }
      continue;
    }
    const dx=s.vx*dt,dz=s.vz*dt;
    if(walkable(g,s.x+dx,s.z))s.x+=dx;else s.vx*=-.45;
    if(walkable(g,s.x,s.z+dz))s.z+=dz;else s.vz*=-.45;
    s.spin+=(Math.abs(s.vx)+Math.abs(s.vz))*dt*1.2;s.vx*=Math.exp(-2.1*dt);s.vz*=Math.exp(-2.1*dt);
    const mushroom=g.objects.find(o=>o.chain&&distance(s,o)<.95);
    if(mushroom&&Math.hypot(s.vx,s.vz)>.7&&launchSeed(g,s,mushroom))continue;
    for(const soil of g.objects.filter(o=>o.type==='soil')){
      if(!g.grown.has(soil.id)&&distance(s,soil)<.9){
        g.grown.add(soil.id);g.dirty=true;soil.pulse=1;discover(g,'seed',soil.x,soil.z);fx(g,'petals',soil.x,soil.z,{color:'#f4d895'});note(g,[60,64,67,72],'chime');
        s.x=s.id==='seed-2'?35.4:18.6;s.z=s.id==='seed-2'?20.5:23.5;s.vx=0;s.vz=0;
      }
    }
  }
  for(const f of g.chainFlowers){
    f.bloom=Math.max(0,f.bloom-dt);f.butterflies=Math.max(0,f.butterflies-dt);
    f.open+=((f.bloom>0?1:0)-f.open)*(1-Math.exp(-dt*5));
  }
  for(const wave of g.waves){
    wave.radius+=dt*2.5;
    for(const [i,f] of g.chainFlowers.entries()){
      if(!wave.hit.has(f.id)&&distance(wave,f)<=wave.radius){
        wave.hit.add(f.id);f.bloom=10;f.butterflies=8;
        fx(g,'petals',f.x,f.z,{color:['#fac6aa','#f1df9b','#ddc7e9'][i%3]});note(g,[72+i*2],'bell');
      }
    }
  }
  g.waves=g.waves.filter(w=>w.radius<6);
  updateTreeReply(g,dt);
  if(!g.ending)updateRabbit(g,dt);
  if(g.endingPending)beginEnding(g);
  if(g.effects.length>100)g.effects.splice(0,g.effects.length-100);
}
export function snapshot(g){return {version:1,endingSeen:g.endingSeen,treeCelebrated:g.treeCelebrated,rabbit:{x:g.rabbit.ride?.safeX??g.rabbit.x,z:g.rabbit.ride?.safeZ??g.rabbit.z},stage:g.stage,found:[...g.found],grown:[...g.grown],stoneTaps:g.stoneTaps,watered:g.watered,potOpen:g.potOpen,carrying:g.player.carrying,seeds:g.seeds.map(s=>s.id===g.player.carrying?{x:g.player.x,z:g.player.z}:s.flight?{x:s.flight.safeX??19.7,z:s.flight.safeZ??25.6}:{x:s.x,z:s.z}),player:{x:g.player.x,z:g.player.z}};}
