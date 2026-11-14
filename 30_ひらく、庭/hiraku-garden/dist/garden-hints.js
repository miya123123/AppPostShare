import {allObjects,distance,findPath,walkable} from './garden-core.js';

const discovery={bloom:'bloom',seed:'seed',bell:'music',mushroom:'mushroom',log:'bridge',water:'water',stone:'stone',tree:'tree'};
export function hintDiscovery(g,o){
  const category=o.type==='soil'?'seed':discovery[o.type]||null;
  return {category,undiscovered:!!category&&!g.found.has(category)};
}
export function hintPose(h,reduced=false){
  const t=h.age;
  return {x:0,z:0,lift:reduced?0:Math.abs(Math.sin(t*4.4))*.23,
    look:reduced?0:Math.sin(t*2.6)*.035,color:'#f8d879',rgb:'248,216,121'};
}
const available=(g,o)=>!(o.x>14&&g.stage<1||o.x>33&&g.stage<2||o.flight);
function route(g,from,o){
  const path=findPath(g,from,o);
  return path.length?path:distance(from,o)<1.7?[]:null;
}
export function chooseHint(g){
  if(g.player.flight)return null;
  const objects=allObjects(g).filter(o=>available(g,o)&&hintDiscovery(g,o).undiscovered);
  const soils=objects.filter(o=>o.type==='soil'&&!g.grown.has(o.id));
  const candidates=(g.stage===0?objects.filter(o=>o.id==='bloom'):g.player.carrying?
    [...soils,...objects.filter(o=>o.type==='mushroom'||o.type==='water')]:
    objects.filter(o=>discovery[o.type]&&(o.type!=='seed'||soils.length)))
    .filter(o=>distance(g.player,o)<=3.2).sort((a,b)=>distance(g.player,a)-distance(g.player,b));
    for(const o of candidates){
      const path=route(g,g.player,o);
      if(path!==null){
        let length=0,previous=g.player;
        for(const p of path){length+=distance(previous,p);previous=p;}
        if(length<=6)return {object:o,path};
      }
    }
  return null;
}
export function stopHint(g){g.hint=null;}
export function toggleHint(g){
  g.hintsEnabled=!g.hintsEnabled;
  updateHint(g,0);
  return g.hintsEnabled;
}
export function updateHint(g,elapsed){
  if(!g.hintsEnabled||g.player.flight){stopHint(g);return;}
  const choice=chooseHint(g);
  if(!choice){stopHint(g);return;}
  const o=choice.object;
  if(g.hint?.id!==o.id||g.hint.carrying!==g.player.carrying){
    g.hint={id:o.id,x:g.player.x,z:g.player.z,path:choice.path,age:0,...hintDiscovery(g,o),
      carrying:g.player.carrying,repath:.4,arrived:false};
  }
  const h=g.hint;h.age+=Math.max(0,elapsed);
  const dt=Math.min(Math.max(0,elapsed),.05);
  h.repath-=dt;
  if(distance(h,g.player)>4.2){h.x=g.player.x;h.z=g.player.z;h.repath=0;}
  if(h.repath<=0){
    const path=route(g,h,o);
    if(path===null){stopHint(g);return;}
    h.path=path;h.repath=.4;
  }
  h.arrived=distance(h,o)<1.8&&distance(g.player,o)<3;
  if(distance(h,g.player)>2.2)return;
  const next=h.path[0];
  if(next){
    const d=distance(h,next),step=Math.min(d,4.6*dt);
    if(d<.03){h.path.shift();return;}
    const x=h.x+(next.x-h.x)/d*step,z=h.z+(next.z-h.z)/d*step;
    if(walkable(g,x,z)){h.x=x;h.z=z;}else h.repath=0;
  }
}
