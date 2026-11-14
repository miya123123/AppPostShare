// Ending presentation stays separate from the live garden. Only endingSeen is saved.
export const ENDING_COLORS=['#e8b58b','#e8c77d','#c8ce83','#9abd86','#83b9a0','#89bac2','#b0b6ce','#d1b3bd'];
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
// Four curved runs alternate with rests. Both actors repeat together every 72s.
const PLAY_CYCLE=72;
const RABBIT_RUNS=[
  {from:[38.25,14.65],via:[37.1,16.6],to:[39.3,16.5],duration:2.8,rest:1.2,hops:3,height:.34},
  {from:[39.3,16.5],via:[42.1,17],to:[42.2,14.6],duration:3.2,rest:1.3,hops:3,height:.43},
  {from:[42.2,14.6],via:[42.3,13.5],to:[40.8,15.45],duration:2.8,rest:1.2,hops:2,height:.48},
  {from:[40.8,15.45],via:[38.7,16.4],to:[38.25,14.65],duration:3.4,rest:2.1,hops:3,height:.36}
];
function runPoint(run,u){
  const v=1-u;
  return {x:v*v*run.from[0]+2*v*u*run.via[0]+u*u*run.to[0],z:v*v*run.from[1]+2*v*u*run.via[1]+u*u*run.to[1]};
}
function rabbitPlayPose(time){
  let t=time%18;
  for(const run of RABBIT_RUNS){
    if(t<run.duration+run.rest){
      const progress=clamp(t/run.duration),u=smooth(progress),moving=t<run.duration;
      const dx=(1-u)*(run.via[0]-run.from[0])+u*(run.to[0]-run.via[0]);
      return {...runPoint(run,u),dir:dx<0?-1:1,moving,mode:moving?'play':'rest',
        lift:moving?Math.abs(Math.sin(progress*run.hops*Math.PI))*run.height:0};
    }
    t-=run.duration+run.rest;
  }
  return {x:38.25,z:14.65,lift:0,moving:false,mode:'rest',dir:-1};
}
// Keep a small clear space immediately beneath the player.
export function endingFlowerSpace(x,z){
  return Math.hypot(x-39.15,z-14.4)>.38;
}
export function beginEnding(g){
  if(g.ending||g.endingSeen||g.found.size!==8)return false;
  // Let ongoing jumps land first so closing/reloading preserves safe, exact positions.
  if(g.player.flight||g.seeds.some(s=>s.flight)||g.rabbit.ride)return false;
  g.ending={age:0,duration:8,celebrationAge:0,chord:false};g.endingSeen=true;g.endingPending=false;g.dirty=true;
  g.effects.push({kind:'sound',notes:[48,55,60,64],type:'ending'});
  return true;
}
export function updateEnding(g,dt){
  const e=g.ending;if(!e)return;
  const next=e.age+Math.max(0,Math.min(.05,dt));
  e.celebrationAge=((e.celebrationAge||0)+Math.max(0,next-e.duration))%PLAY_CYCLE;
  e.age=Math.min(e.duration,next);
  if(e.age>=4.6&&!e.chord){e.chord=true;g.effects.push({kind:'sound',notes:[60,67,72],type:'ending'});}
}
export function leaveEnding(g){if(!g.ending)return false;g.ending=null;return true;}
export function endingActors(g,reduced=false){
  const e=g.ending,time=e?.age>=8?e.celebrationAge||0:0;
  const actors={
    player:{...g.player,x:39.15,z:14.4,h:0,vx:0,vz:0,dirX:.1,dirZ:1,gesture:0,flight:null},
    rabbit:{...g.rabbit,x:38.25,z:14.65,lift:0,moving:false,pet:1,mode:'rest',dir:!reduced&&e?.age>=8?-1:1,jumpPriority:true,ear:reduced?0:Math.sin(((e?.age||0)+time)*Math.PI*4)*.1},
    spirit:{x:40.5,z:13.4,lift:0}
  };
  if(!reduced&&time>0){
    Object.assign(actors.rabbit,rabbitPlayPose(time));
    const a=(time%24)*Math.PI*2/24;
    actors.spirit={x:40.5+Math.sin(a)*1.9,z:13.4+(1-Math.cos(a))*.9,lift:Math.sin(a*2)*.1};
  }
  return actors;
}
// Fixed positions avoid the cast and keep the flowering stable across frames.
export const ENDING_FLOWERS=Object.freeze(Array.from({length:72},(_,i)=>{
  const a=i*2.3999632297,r=1.2+Math.sqrt((i+.5)/72)*4.5;
  return Object.freeze({x:40.5+Math.cos(a)*r,z:13.4+Math.sin(a)*r*.72,r,color:['#f4bbac','#f9dfa0','#d2c4eb','#f5c5d7','#f1e8be'][i%5],height:.34+(i%4)*.09,phase:i*.7});
}).filter(f=>endingFlowerSpace(f.x,f.z)).concat([[38.65,14.45],[39.65,14.45],[38.95,14.9],[39.45,14.9],[39.15,13.88]].map(([x,z],i)=>Object.freeze({x,z,r:Math.hypot(x-40.5,(z-13.4)/.72),color:['#f4bbac','#f9dfa0','#d2c4eb','#f5c5d7','#f1e8be'][i],height:.34,phase:i*.7}))));
// Completed endings, including existing saves, leave the same flowers in the garden.
export function gardenMemoryFlowers(g){return g.endingSeen&&!g.ending?ENDING_FLOWERS:[];}
export function endingPose(g,reduced=false){
  const e=g.ending;if(!e)return null;
  const t=e.age,bloom=smooth((t-3.7)/1.5),settle=smooth((t-5.5)/2.5);
  return {
    reveal:reduced?1:smooth(t/1.5),bloom,light:.43-settle*.08,
    rainbow:smooth((t-6.1)/1.3),treeGlow:smooth((t-4.9)/1.8),
    flowers:ENDING_FLOWERS.map(f=>({...f,open:smooth((t-5.3-(f.r-1.2)*.35)/.65)})),
    petals:ENDING_COLORS.map((color,i)=>{
      const a=i*Math.PI/4-Math.PI/2,u=reduced?bloom:smooth((t-.4-i*.09)/4.1);
      const x0=40.5+Math.cos(a)*3.7,z0=13.4+Math.sin(a)*1.6,h0=2.8+Math.sin(a)*.8;
      const x1=40.5+Math.cos(a)*.24,h1=.62-Math.sin(a)*.24;
      return {x:reduced?x1:x0+(x1-x0)*u,z:reduced?13.4:z0+(13.4-z0)*u,h:reduced?h1:h0+(h1-h0)*u,
        angle:a+Math.PI/2+(reduced?0:(1-u)*Math.PI*.7),alpha:reduced?bloom:smooth((t-.15-i*.08)/.8),color};
    })
  };
}
