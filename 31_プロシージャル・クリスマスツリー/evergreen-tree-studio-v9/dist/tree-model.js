import * as T from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {normalizeConfig,seededRandom} from './tree-config.mjs';

const TAU=Math.PI*2;
const COLORS={classic:[0xc43e38,0xe7bd63,0xf4e5bf],ice:[0x9ed9dd,0xe4eff3,0x9fb8d9],candy:[0xf0798e,0x8bbfac,0xf2d5aa],gold:[0xedc66e,0xb57d24,0xffe7a5]};
const LIGHTS={warm:[0xffcf79,0xffe6b0,0xffb759],multi:[0xff755f,0x85dbcc,0xffd670,0x9bafff],ice:[0xbceaff,0xe5f5ff,0x7bc8e2],aurora:[0x79f4cf,0xb398ff,0x8bbfff,0xf1b7ff]};

function starGeometry(points=5,outer=1,inner=.45,depth=.22){
 const shape=new T.Shape();
 for(let i=0;i<points*2;i++){
  const a=Math.PI/2+i*Math.PI/points,r=i%2?inner:outer;
  if(i===0)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);
 }
 shape.closePath();
 const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:outer*.07,bevelSize:outer*.07,bevelSegments:1,steps:1,curveSegments:1});
 geo.translate(0,0,-depth/2);return geo;
}
function heightAt(q,d){
 if(q<.42)return d*(1-q/.42*.47);
 if(q<.76)return d*(.53-(q-.42)/.34*.34);
 return d*(.19-(q-.76)/.24*.19);
}
function tierGeometry(radius,depth,phase,snow=0){
 const segments=64,positions=[],uvs=[],indices=[];
 const inner=snow?Math.max(.025,1-(.07+.9*snow)):0;
 const rings=[0,.42,.76,1,1],distances=[];
 for(let j=0;j<rings.length;j++){
  for(let i=0;i<=segments;i++){
   const a=i/segments*TAU,q=rings[j];
   const lobe=1+.105*Math.cos(a*8+phase)+.025*Math.cos(a*16+phase);
   const actualQ=Math.max(.015,q);
   const r=radius*actualQ*(1+(lobe-1)*actualQ);
   let y=heightAt(actualQ,depth);
   if(j===4)y-=depth*.065;
   positions.push(Math.cos(a)*r,y,Math.sin(a)*r);uvs.push(i/segments,j/(rings.length-1));
   distances.push(actualQ-(snow>=.99?0:inner+.04*Math.sin(a*7+phase)));
  }
 }
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  indices.push(a,a+1,b,b,a+1,b+1);
 }
 const g=new T.BufferGeometry();
 if(snow){
  // Clip the actual leaf triangles so the snow follows every facet exactly.
  const clipped=[];
  for(let i=0;i<segments*3*6;i+=3){
   let polygon=indices.slice(i,i+3).map(index=>({p:positions.slice(index*3,index*3+3),d:distances[index]}));
   const output=[];
   for(let k=0;k<polygon.length;k++){
    const start=polygon[k],end=polygon[(k+1)%polygon.length];
    if(start.d>=0)output.push(start);
    if((start.d>=0)!==(end.d>=0)){
     const t=start.d/(start.d-end.d);output.push({p:start.p.map((v,axis)=>v+(end.p[axis]-v)*t),d:0});
    }
   }
   for(let k=1;k<output.length-1;k++){
    const triangle=[output[0],output[k],output[k+1]],a=triangle[0].p,b=triangle[1].p,c=triangle[2].p;
    const u=b.map((v,axis)=>v-a[axis]),v=c.map((value,axis)=>value-a[axis]);
    const area=(u[1]*v[2]-u[2]*v[1])**2+(u[2]*v[0]-u[0]*v[2])**2+(u[0]*v[1]-u[1]*v[0])**2;
    if(area<1e-18)continue;
    for(const point of triangle)clipped.push(point.p[0],point.p[1]+radius*.01+.006,point.p[2]);
   }
  }
  g.setAttribute('position',new T.Float32BufferAttribute(clipped,3));g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(clipped.length/3*2),2));
 }else{g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);}
 g.computeVertexNormals();return g;
}
function ensureAttributes(g){
 if(g.index)g=g.toNonIndexed();
 if(!g.attributes.normal)g.computeVertexNormals();
 if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));
 for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
 return g;
}
function mergeGroup(group,oldGeometries){
 group.updateWorldMatrix(true,true);
 const byMaterial=new Map();
 group.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const geo=ensureAttributes(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
  oldGeometries.add(mesh.geometry);
  if(!byMaterial.has(mesh.material))byMaterial.set(mesh.material,[]);
  byMaterial.get(mesh.material).push(geo);
 });
 group.clear();
 // World transforms are already baked into the merged vertices.
 group.position.set(0,0,0);group.quaternion.identity();group.scale.set(1,1,1);group.updateMatrixWorld(true);
 let index=0;
 for(const [mat,geometries] of byMaterial){
  const geo=mergeGeometries(geometries,false);
  for(const geometry of geometries)geometry.dispose();
  if(!geo)throw new Error('モデルの結合に失敗しました。');
  const mesh=new T.Mesh(geo,mat);mesh.name=group.name+'_'+index++;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
}

export function buildTree(input){
 const c=normalizeConfig(input),rng=seededRandom(c.seed,0),decRng=seededRandom(c.seed,1);
 const root=new T.Group();root.name='ChristmasTree';
 const groups={};
 for(const name of ['Trunk','Foliage','Snow','Ornaments','Garland','Lights','Topper']){const g=new T.Group();g.name=name;root.add(g);groups[name]=g;}
 const materials=new Set(),oldGeometries=new Set();
 const material=(color,metalness=0,roughness=.65,extra={})=>{const m=new T.MeshStandardMaterial({color,metalness,roughness,...extra});materials.add(m);return m;};
 const add=(group,geo,mat,x=0,y=0,z=0)=>{const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);group.add(mesh);return mesh;};
 const h=c.height,u=4.6,baseY=h*c.trunkHeight/100;
 // Preserve the actual faceted crown tip, including the small apex inset.
 const crownTop=h*.12+h*.76/(c.layers+.65)*(c.layers-1+1.65*(1-.015/.42*.47));
 const canopySpan=h*.76*(crownTop-baseY)/(crownTop-h*.12),step=canopySpan/(c.layers+.65),radius=u*.25*c.spread/100;
 const trunkLength=baseY+canopySpan*.25;
 const wood=material(0x6d4430,0,.94),snowMat=material(0xe8f2f0,0,.92),cordMat=material(0xa99151,.6,.5);
 const leafColors=c.foliage==='gold'?[0xb68535,0xcfa449,0xe2bc63]:c.foliage==='blue'?[0x275857,0x326b69,0x3a7772]:[0x174c39,0x1d5b43,0x276d4e];
 const leafMats=leafColors.map(x=>material(x,c.foliage==='gold'?.64:.02,c.foliage==='gold'?.35:.87,{flatShading:true,side:T.DoubleSide,shadowSide:T.FrontSide}));
 add(groups.Trunk,new T.CylinderGeometry(u*.023,u*.041,trunkLength,10),wood,0,trunkLength/2,0);
 const tiers=[];
 for(let i=0;i<c.layers;i++){
  const r=radius*Math.pow(1-i/(c.layers+.65),.92),y=baseY+i*step,d=step*1.65,phase=rng()*TAU;
  const rotation=rng()*.22;
  const geo=tierGeometry(r,d,phase);
  const leaf=add(groups.Foliage,geo,leafMats[i%3],0,y,0);leaf.rotation.y=rotation;
  if(c.snow>0){const snowy=add(groups.Snow,tierGeometry(r,d,phase,c.snow/100),snowMat,0,y+.006,0);snowy.rotation.y=rotation;}
  tiers.push({r,y,d,phase,rotation});
 }
 const ornamentMats=COLORS[c.palette].map(x=>material(x,.65,.26));
 const capMat=material(0xc5a462,.78,.3);
 const ballGeo=new T.SphereGeometry(1,12,8),smallStarGeo=starGeometry(5,1,.44,.22),giftGeo=new T.BoxGeometry(1,1,1),capGeo=new T.CylinderGeometry(1,1,1,7),ribbonGeo=new T.BoxGeometry(1,1,1);
 let ornaments=0;
 if(c.ornament!=='none'&&c.density>0){
  const sum=tiers.reduce((s,t)=>s+t.r,0),total=Math.round(c.density*1.35);
  tiers.forEach((t,i)=>{
   const count=Math.max(1,Math.round(total*t.r/sum));
   for(let k=0;k<count;k++){
    const a=k/count*TAU+decRng()*.25+i*1.618;
    const localA=a-t.rotation,lobe=1+.105*Math.cos(localA*8+t.phase)+.025*Math.cos(localA*16+t.phase);
    const rr=t.r*lobe*(1.005+decRng()*.015),size=u*(.016+decRng()*.006)*c.ornamentSize/100,x=Math.cos(a)*rr,z=Math.sin(a)*rr,y=t.y-size*.36;
    const type=c.ornament==='mixed'?['ball','ball','star','gift'][Math.floor(decRng()*4)]:c.ornament;
    const mat=ornamentMats[Math.floor(decRng()*ornamentMats.length)];
    if(type==='ball'){
     const mesh=add(groups.Ornaments,ballGeo,mat,x,y,z);mesh.scale.setScalar(size);
     const cap=add(groups.Ornaments,capGeo,capMat,x,y+size*.97,z);cap.scale.set(size*.26,size*.24,size*.26);
    }else if(type==='star'){
     const star=add(groups.Ornaments,smallStarGeo,mat,x,y,z);star.scale.setScalar(size*1.15);star.rotation.set(.1,-a+Math.PI/2,decRng()*.4);
    }else{
     const gift=new T.Group();gift.position.set(x,y,z);gift.rotation.y=a;groups.Ornaments.add(gift);
     add(gift,giftGeo,mat).scale.set(size*1.6,size*1.5,size*1.4);
     add(gift,ribbonGeo,capMat).scale.set(size*.24,size*1.54,size*1.43);
     add(gift,ribbonGeo,capMat).scale.set(size*1.63,size*.24,size*1.44);
    }
    const hanger=add(groups.Ornaments,capGeo,capMat,x,y+size*1.6,z);hanger.scale.set(u*.0008*c.ornamentSize/100,size*1.1,u*.0008*c.ornamentSize/100);
    ornaments++;
   }
  });
 }
 const bulbMaterials=[],lightPositions=[];
 if(c.lights!=='none'){
  for(const color of LIGHTS[c.lights])bulbMaterials.push(material(color,.05,.28,{emissive:color,emissiveIntensity:1.4+c.glow*.028,toneMapped:false}));
  const turns=c.layers*.67+1.2,bulbs=Math.round(48+c.lightDensity*1.7),positions=[];
  const lightCurve=t=>{
   const y=baseY+canopySpan*(.015+t*.725)/.76;
   const a=t*TAU*turns+.3;
   let rr=u*.01;
   for(const tier of tiers){
    const py=(y-tier.y)/tier.d;
    if(py<0||py>1)continue;
    const q=py>.53?(1-py)/.47*.42:py>.19?.42+(.53-py)/.34*.34:.76+(.19-py)/.19*.24;
    const localA=a-tier.rotation,lobe=1+.105*Math.cos(localA*8+tier.phase)+.025*Math.cos(localA*16+tier.phase);
    rr=Math.max(rr,tier.r*q*(1+(lobe-1)*q));
   }
   rr=rr*1.018+u*.006;
   return new T.Vector3(Math.cos(a)*rr,y,Math.sin(a)*rr);
  };
  for(let i=0;i<=turns*56;i++)positions.push(lightCurve(i/Math.floor(turns*56)));
  const curve=new T.CatmullRomCurve3(positions);
  add(groups.Garland,new T.TubeGeometry(curve,Math.ceil(turns*64),u*.00145,4,false),cordMat);
  const bulbGeo=new T.SphereGeometry(u*.0095,7,5);
  for(let i=0;i<bulbs;i++){
   const p=lightCurve((i+.2)/bulbs);add(groups.Lights,bulbGeo,bulbMaterials[i%bulbMaterials.length],p.x,p.y,p.z);
   lightPositions.push({x:p.x,y:p.y,z:p.z,color:LIGHTS[c.lights][i%bulbMaterials.length]});
  }
 }
 if(c.topper!=='none'){
  const topperScale=c.topperSize/100;
  groups.Topper.position.y=h*.84*(1-topperScale);groups.Topper.scale.setScalar(topperScale);
  const topperMat=material(0xedc467,.78,.25,{emissive:0x98601d,emissiveIntensity:.22});
  if(c.topper==='crystal'){
   const mesh=add(groups.Topper,new T.OctahedronGeometry(u*.063,0),material(0xb9e1e4,.5,.17,{emissive:0x70b9c0,emissiveIntensity:.3}),0,h*.84+u*.095,0);mesh.scale.set(.7,1.15,.7);mesh.rotation.y=Math.PI/4;
  }else add(groups.Topper,starGeometry(c.topper==='eight'?8:5,u*.06,u*(c.topper==='eight'?.027:.025),u*.023),topperMat,0,h*.84+u*.094,0);
  add(groups.Topper,new T.CylinderGeometry(u*.003,u*.004,u*.075,6),topperMat,0,h*.84+u*.04,0);
 }
 root.updateMatrixWorld(true);
 for(const group of Object.values(groups))mergeGroup(group,oldGeometries);
 for(const g of oldGeometries)g.dispose();
 // Shared templates may be unused for zero-density variants.
 for(const g of [ballGeo,smallStarGeo,giftGeo,capGeo,ribbonGeo])g.dispose();
 let triangles=0,vertices=0,meshes=0;
 root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});
 root.userData={generator:'Evergreen Tree Studio',schemaVersion:1,settings:c,units:'meters',upAxis:'Y',forwardAxis:'+Z',origin:'trunk base'};
 return {root,config:c,bulbMaterials,lightPositions,stats:{triangles,vertices,meshes,ornaments,bulbs:lightPositions.length,height:h},dispose(){root.traverse(o=>{if(o.isMesh)o.geometry.dispose();});for(const mat of materials)mat.dispose();}};
}
