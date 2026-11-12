import * as T from './vendor/three.module.js';
import {normalizeConfig,seededRandom} from './tree-config.mjs';

const smoothstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function pulse(cycle){
 const p=cycle-Math.floor(cycle);
 return smoothstep(.04,.14,p)*(1-smoothstep(.46,.56,p));
}

// A standard cycle lasts 2.4 seconds. Fade edges retain distinct on/off periods.
export function lightLevel(motion,seconds,speed=1,phase=0,path=0,reducedMotion=false){
 if(reducedMotion||motion==='steady')return 1;
 const cycle=seconds*speed/2.4;
 if(motion==='blink')return pulse(cycle+.2);
 if(motion==='twinkle')return pulse(cycle*(.8+.4*phase)+phase);
 if(motion==='wave')return pulse(cycle-path+.2);
 return 1;
}

export function createLightPreview(model,texture){
 const root=new T.Group();root.name='PreviewIllumination';
 // Keep the exportable bulbs intact; the preview uses two batched draw calls.
 model.root.getObjectByName('Lights').visible=false;
 const count=model.lightPositions.length;
 if(!count)return {root,update(){},dispose(){}};

 const height=4.6,rng=seededRandom(model.config.seed,73);
 const phases=new Float64Array(count),paths=new Float64Array(count);
 const positions=new Float32Array(count*3),baseColors=new Float32Array(count*3);
 const coreGeometry=new T.SphereGeometry(height*.0095,7,5);
 const coreMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
 const cores=new T.InstancedMesh(coreGeometry,coreMaterial,count);cores.name='PreviewLightBulbs';
 cores.instanceColor=new T.InstancedBufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage);
 const matrix=new T.Matrix4(),color=new T.Color();
 model.lightPositions.forEach((p,i)=>{
  positions.set([p.x,p.y,p.z],i*3);
  color.setHex(p.color);baseColors.set([color.r,color.g,color.b],i*3);
  phases[i]=rng();paths[i]=count>1?i/(count-1):0;
  cores.setMatrixAt(i,matrix.makeTranslation(p.x,p.y,p.z));
 });
 cores.instanceMatrix.needsUpdate=true;cores.computeBoundingSphere();

 const haloGeometry=new T.BufferGeometry();
 haloGeometry.setAttribute('position',new T.BufferAttribute(positions,3));
 const haloColors=new T.BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage);
 haloGeometry.setAttribute('color',haloColors);
 const haloMaterial=new T.PointsMaterial({size:height*.084,map:texture,transparent:true,opacity:.45,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,toneMapped:false});
 const halos=new T.Points(haloGeometry,haloMaterial);halos.name='PreviewLightHalos';
 root.add(cores,halos);
 let lastMotion,lastGlow;

 function update(config,seconds,reducedMotion=false){
  root.visible=config.lights!=='none';if(!root.visible)return;
  const motion=reducedMotion?'steady':config.motion;
  // Constant lights need no per-frame color uploads.
  if(motion==='steady'&&lastMotion===motion&&lastGlow===config.glow)return;
  lastMotion=motion;lastGlow=config.glow;
  const intensity=1.4+config.glow*.028;
  haloMaterial.opacity=config.glow*.006;
  for(let i=0;i<count;i++){
   const level=lightLevel(motion,seconds,config.motionSpeed,phases[i],paths[i]);
   for(let axis=0;axis<3;axis++){
    const k=i*3+axis;
    cores.instanceColor.array[k]=baseColors[k]*(.025+intensity*level);
    haloColors.array[k]=baseColors[k]*level;
   }
  }
  cores.instanceColor.needsUpdate=true;haloColors.needsUpdate=true;
 }
 function dispose(){
  cores.dispose();coreGeometry.dispose();coreMaterial.dispose();
  haloGeometry.dispose();haloMaterial.dispose();
 }
 return {root,update,dispose};
}

export function createStaticSnapshot(model,input){
 const settings=normalizeConfig(input),root=model.root.clone(true),materials=new Map();
 root.userData={...root.userData,settings};
 root.getObjectByName('Lights').visible=true;
 root.traverse(object=>{
  if(!object.isMesh)return;
  const original=object.material;
  if(!materials.has(original)){
   const material=original.clone();
   if(model.bulbMaterials.includes(original))material.emissiveIntensity=1.4+settings.glow*.028;
   materials.set(original,material);
  }
  object.material=materials.get(original);
 });
 return {root,dispose(){for(const material of materials.values())material.dispose();}};
}
