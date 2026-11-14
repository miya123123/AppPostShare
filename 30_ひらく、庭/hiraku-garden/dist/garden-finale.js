import {beginEnding} from './garden-ending.js';
// A visual/musical reply only: never invokes gameplay interactions or awards discoveries.
const cues=[
  [1.25,'flowers'],[2.1,'mushrooms'],[3,'bell-a'],[3.65,'bell-b'],[4.3,'bell-c'],[5,'water'],[6.1,'canopy']
];
export function beginTreeReply(g){
  if(g.treeReply||g.ending||g.endingPending)return false;
  const full=g.found.size===8&&(!g.treeCelebrated||!g.endingSeen);
  g.treeReply={age:0,duration:full?10:2.8,full,nextCue:0};
  if(full){g.treeCelebrated=true;g.dirty=true;g.allPulse=0;}
  g.effects.push({kind:'sound',notes:full?[48,55,60]:[55,62,67],type:'warm'});
  return true;
}
export function updateTreeReply(g,dt){
  const reply=g.treeReply;if(!reply)return;
  reply.age+=dt;
  if(reply.full)while(reply.nextCue<cues.length&&reply.age>=cues[reply.nextCue][0]){
    const [,id]=cues[reply.nextCue++];
    if(id==='flowers'){
      for(const o of g.objects.filter(o=>o.type==='bloom'||o.type==='soil'&&g.grown.has(o.id))){o.pulse=1;g.effects.push({kind:'reply-petals',x:o.x,z:o.z});}
    }else if(id==='mushrooms'){
      for(const o of g.objects.filter(o=>o.type==='mushroom'))o.pulse=.65;
    }else if(id.startsWith('bell-')){
      const o=g.objects.find(o=>o.id===id);o.pulse=.75;
      g.effects.push({kind:'sound',notes:[o.note+12],type:'warm-bell'});
    }else if(id==='water'){
      g.effects.push({kind:'sound',notes:[60,67,72,76],type:'warm'});
    }else if(id==='canopy')g.effects.push({kind:'reply-petals',x:40.5,z:12.5,canopy:true});
  }
  if(reply.age>=reply.duration){g.treeReply=null;if(reply.full&&!g.endingSeen){g.endingPending=true;beginEnding(g);}}
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function treeReplyPose(g,reduced=false){
  const q=g.treeReply;if(!q)return {glow:0,rise:0,sway:0,panorama:0,rainbow:0,ripple:0};
  const fade=smooth(q.age/.8)*smooth((q.duration-q.age)/1.6);
  return {
    glow:fade,rise:smooth(q.age/2.6),
    sway:reduced?0:Math.sin(q.age*1.6)*.025*fade,
    panorama:q.full&&!reduced?smooth((q.age-1)/2.5)*smooth((9.5-q.age)/2):0,
    rainbow:q.full?smooth((q.age-6)/1.5)*smooth((10-q.age)/2):0,
    ripple:q.full&&q.age>=5&&q.age<8?(q.age-5)/3:0
  };
}
export function spiritReplyPosition(g,reduced=false){
  const q=g.treeReply,p=g.player;
  if(!q?.full||g.stoneTaps<3)return null;
  if(reduced)return {x:p.x-.4,z:p.z+.7};
  const tree={x:40.5,z:12.5};
  const from={x:p.x-.4,z:p.z+.7};
  const fade=smooth(q.age/2)*smooth((10-q.age)/1.8);
  const a=Math.min(1,Math.max(0,(q.age-1.5)/6.5))*Math.PI*2;
  const to=reduced?{x:tree.x+.9,z:tree.z+.9}:{x:tree.x+Math.cos(a)*2.1,z:tree.z+Math.sin(a)*1.2};
  return {x:from.x+(to.x-from.x)*fade,z:from.z+(to.z-from.z)*fade};
}
