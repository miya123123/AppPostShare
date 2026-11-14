import {TREE_SPOTS,walkable,nearest,clamp,allObjects} from './garden-core.js';
import {endingActors,endingPose,endingFlowerSpace,gardenMemoryFlowers} from './garden-ending.js';
import {treeReplyPose,spiritReplyPosition} from './garden-finale.js';
import {hintPose} from './garden-hints.js';

const TAU=Math.PI*2;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

export function makeRenderer(canvas,g){
  const c=canvas.getContext('2d',{alpha:false}),random=rng(87431);
  const r={canvas,c,g,w:0,h:0,dpr:1,s:50,cam:{x:8,z:20.8},overview:false,gate:g.stage>0?1:0,particles:[],marks:[],reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
  const patches=[],grass=[],flowers=[],pebbles=[];
  const land={stage:2};
  for(let i=0;i<3100;i++){
    const x=2+random()*45,z=5+random()*27;
    if(!walkable(land,x,z))continue;
    grass.push({x,z,n:random(),a:random()*TAU});
    if(i%12===0)flowers.push({x,z,n:random(),a:random()*TAU});
    if(i%11===0)pebbles.push({x,z,n:random()});
    if(i%25===0)patches.push({x,z,rx:.6+random()*1.5,rz:.4+random(),n:random()});
  }
  const endingGroundFlowers=flowers.filter(q=>endingFlowerSpace(q.x,q.z));
  const hedges=[];
  for(let x=2.5;x<13.8;x+=.85){hedges.push([x,13.7]);hedges.push([x,27.7]);}
  for(let z=14.5;z<27.5;z+=.85){hedges.push([1.8,z]);if(z<19||z>22.2)hedges.push([13.8,z]);}
  const P=(x,z,h=0)=>({x:r.w/2+(x-r.cam.x-(z-r.cam.z)*.18)*r.s,y:r.h*.50+(z-r.cam.z)*r.s*.65-h*r.s});
  r.project=P;
  r.unproject=(x,y)=>{const z=(y-r.h*.5)/(r.s*.65)+r.cam.z;return{x:(x-r.w*.5)/r.s+r.cam.x+(z-r.cam.z)*.18,z};};
  const visible=(x,z,margin=4)=>{const p=P(x,z);return p.x>-r.s*margin&&p.x<r.w+r.s*margin&&p.y>-r.s*margin&&p.y<r.h+r.s*margin;};
  const ellipse=(x,y,rx,ry,fill,stroke=null,lw=1)=>{c.beginPath();c.ellipse(x,y,Math.max(.001,rx),Math.max(.001,ry),0,0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}};
  const line=(pts,color,width)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();};
  const polygon=(pts,color)=>{c.beginPath();pts.forEach(([x,z,h=0],i)=>{const p=P(x,z,h);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.closePath();c.fillStyle=color;c.fill();};
  const groundEllipse=(x,z,rx,rz,color)=>{const p=P(x,z);ellipse(p.x,p.y,rx*r.s,rz*r.s*.65,color);};
  const local=(x,z,fn)=>{const p=P(x,z);c.save();c.translate(p.x,p.y);c.scale(r.s,r.s);fn();c.restore();};
  const shadow=(x,z,size=1,alpha=.13)=>groundEllipse(x+.2,z+.12,size*.68,size*.29,`rgba(29,66,43,${alpha})`);
  const ball=(x,y,rx,ry,top,bottom)=>{const gr=c.createLinearGradient(x-rx*.5,y-ry,x+rx*.35,y+ry);gr.addColorStop(0,top);gr.addColorStop(1,bottom);ellipse(x,y,rx,ry,gr);};
  function leaf(x,y,angle,size,color){c.save();c.translate(x,y);c.rotate(angle);c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-size*.8,-size*.2,-size*.6,-size,0,-size);c.bezierCurveTo(size*.8,-size*.6,size*.5,-size*.1,0,0);c.fillStyle=color;c.fill();c.restore();}
  function star(x,y,size,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-size);c.quadraticCurveTo(x+size*.18,y-size*.15,x+size,y);c.quadraticCurveTo(x+size*.2,y+size*.18,x,y+size);c.quadraticCurveTo(x-size*.15,y+size*.15,x-size,y);c.quadraticCurveTo(x-size*.2,y-size*.18,x,y-size);c.fill();}
  function path(points,width,color){
    const pp=points.map(([x,z])=>P(x,z));c.beginPath();c.moveTo(pp[0].x,pp[0].y);
    for(let i=1;i<pp.length-1;i++)c.quadraticCurveTo(pp[i].x,pp[i].y,(pp[i].x+pp[i+1].x)/2,(pp[i].y+pp[i+1].y)/2);
    c.lineTo(pp.at(-1).x,pp.at(-1).y);c.lineWidth=r.s*width;c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.stroke();
  }
  function smallFlower(x,z,h,col,phase=0){local(x,z,()=>{
    const response=g.treeReply?.full?Math.max(0,1-Math.abs(g.treeReply.age-2.1)/1.6):0;
    const sway=(r.reduced?0:Math.sin(g.t*1.6+phase)*.055+Math.sin(g.t*2+phase)*response*.1);
    line([[0,0],[sway,-h]],'#5e8856',.035);leaf(0,-h*.36,-.9,.26,'#7f9e60');leaf(0,-h*.58,.9,.22,'#b2c179');
    for(let j=0;j<5;j++){const a=j*TAU/5;ellipse(sway+Math.cos(a)*.1,-h+Math.sin(a)*.1,.09,.09,col);}
    ellipse(sway,-h,.055,.055,'#f7dc8b');
  });}
  function bush(x,z,size=1,phase=0){local(x,z,()=>{
    const sway=Math.sin(g.t*.7+phase)*.02;
    ball(0,-.34*size,size*.64,size*.43,'#72955c','#426e51');
    ball(-.3*size,-.49*size,size*.4,size*.37,'#88a966','#527c55');
    ball(.25*size+sway,-.57*size,size*.43,size*.4,'#9db674','#5d8c59');
    for(let j=0;j<7;j++){const a=j*2.4+phase;ellipse(Math.sin(a)*size*.4,(-.4+Math.cos(a)*.2)*size,.055*size,.025*size,'#b5c982');}
  });}
  function drawTree(x,z,size=1,sacred=false){
    if(!visible(x,z,7))return;
    shadow(x,z,size*1.6,.15);
    local(x,z,()=>{
      const p=g.ending?endingActors(g).player:g.player;const occludes=p.z<z+.15&&p.z>z-4&&Math.abs(p.x-x)<size*1.6;
      c.globalAlpha=occludes?.5:1;
      const ending=sacred?endingPose(g,r.reduced):null;
      const reply=sacred?(ending?{glow:ending.treeGlow,rise:1,sway:0}:treeReplyPose(g,r.reduced)):null;
      const wind=r.reduced?0:Math.sin(g.t*.8+x)*.045;
      if(reply)c.rotate(reply.sway);
      c.save();c.scale(size,size);
      line([[0,0],[-.08,-1.45],[.1,-2.5]],'#8d7951',.29);
      line([[-.035,-.12],[-.11,-1.9]],'#b49c67',.085);
      line([[-.05,-1.25],[-.68,-1.9]],'#8d7951',.13);line([[0,-1.48],[.65,-2.1]],'#8d7951',.13);
      for(const [cx,cy,rr,top,bottom] of [[-.7,-2.25,.85,'#769b62','#436e53'],[.7,-2.3,.85,'#91ad6a','#507e55'],[0,-2.9,1,'#a9bf7c','#638f59'],[-.5,-2.9,.7,'#b3c782','#729951'],[.45,-3.15,.7,'#c0ce86','#84a75e'],[.05,-2.25,.95,'#91b46e','#577f50']]){
        ball(cx+wind,cy,rr,rr*.72,top,bottom);
      }
      for(let i=0;i<24;i++){const a=i*2.399,rr=Math.sqrt((i+.5)/24)*1.4;leaf(Math.cos(a)*rr+wind,-2.7+Math.sin(a)*rr*.55,-.5+i*.8,.14,['#c8d78c','#8fac63','#b2c87e'][i%3]);}
      if(sacred){
        if(reply.glow>0){
          c.save();c.globalAlpha=reply.glow*.55;
          const light=c.createLinearGradient(0,0,0,-3.6);light.addColorStop(0,'#ffebad');light.addColorStop(1,'#fff8d8');
          line([[0,0],[-.04,-1.25],[.1,-3.6*reply.rise]],light,.09);
          for(const [bx,by]of[[-.68,-1.9],[.65,-2.1]])if(reply.rise>.48)line([[0,-1.3],[bx*(reply.rise-.48)/.52,by]],'#fff0b7',.055);
          c.globalAlpha=reply.glow*.24;
          const gr=c.createRadialGradient(0,-2.6,0,0,-2.6,2);gr.addColorStop(0,'#fff5b9');gr.addColorStop(1,'#fff5b900');
          ellipse(0,-2.6,2,1.5,gr);c.restore();
        }
        ellipse(.03,-1.3,.12,.19,'#5a6749');ellipse(.03,-1.32,.055,.11,'#f4dc96');
        for(let i=0;i<g.found.size;i++){const a=g.t*.25+i*TAU/8;star(Math.cos(a)*1.25,-2.5+Math.sin(a)*.55,.06,'#fff0b1');}
        for(let i=0;i<4;i++){const a=i*1.9;ellipse(Math.cos(a)*.5,.04+Math.sin(a)*.15,.3,.08,'#6e9859');}
      }
      c.restore();
    });
  }
  function drawBloom(o){shadow(o.x,o.z,.9);local(o.x,o.z,()=>{
    const a=r.gate,q=Math.sin(o.pulse*Math.PI)*.1,w=Math.sin(g.t*1.6)*.035;
    for(let j=0;j<5;j++)leaf(Math.sin(j*2.3)*.14,0,-1.1+j*.55,.75,j%2?'#7ea95e':'#94b574');
    line([[0,0],[w,-.95]],'#6c985a',.14);
    c.save();c.translate(w,-1.05-q);
    for(let j=0;j<7;j++){
      const ang=j*TAU/7-Math.PI/2;
      const xx=Math.cos(ang)*a*.56,yy=Math.sin(ang)*a*.36;
      c.save();c.translate(xx,yy);c.rotate(ang+Math.PI/2);
      ball(0,-.13,.22+a*.035,.38-a*.1,'#ffe5c1',j%2?'#f29d91':'#edb3a1');c.restore();
    }
    ball(0,-.05,.25*a+.08,.17*a+.05,'#ffe7a2','#d9ad5a');
    if(a>.7)for(let j=0;j<7;j++){const ang=j*TAU/7;ellipse(Math.cos(ang)*.15,-.05+Math.sin(ang)*.09,.025,.025,'#fff3ca');}
    c.restore();
  });}
  function drawBell(o){shadow(o.x,o.z,.65,.09);local(o.x,o.z,()=>{
    const h=o.h,sway=Math.sin(g.t*1.5+o.note)*.06+Math.sin((1-o.pulse)*20)*o.pulse*.22;
    c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-.15,-h*.6,-.35,-h-.5,.1,-h-.35);c.bezierCurveTo(.42,-h-.3,.39,-h,.27,-h+.05);c.strokeStyle='#617f4b';c.lineWidth=.09;c.lineCap='round';c.stroke();
    leaf(-.07,-.6,-1,.58,'#86a55b');leaf(-.12,-1.05,.8,.46,'#a4bb6b');
    c.save();c.translate(.25,-h+.2);c.rotate(sway);
    ball(0,0,.35,.43,'#f3d48b','#d89851');
    c.beginPath();c.moveTo(-.3,.16);c.quadraticCurveTo(-.4,.4,-.42,.4);c.quadraticCurveTo(0,.58,.42,.4);c.quadraticCurveTo(.35,.35,.3,.16);c.fillStyle='#e8b563';c.fill();
    ellipse(0,.4,.31,.075,'#99704b');ellipse(0,.49,.07,.08,'#f9e4a1');ellipse(-.11,-.1,.07,.18,'#fff0bc8c');c.restore();
    if(o.pulse>.15){c.globalAlpha=o.pulse*.6;for(let j=0;j<2;j++){c.beginPath();c.ellipse(.25,-h+.2,.55+j*.2,.4+j*.2,0,-.8,.8);c.strokeStyle='#fff1b6';c.lineWidth=.04;c.stroke();}}
  });}
  function drawMushroom(o){shadow(o.x,o.z,o.big?1.25:.9);local(o.x,o.z,()=>{
    const sz=o.big?1.35:.9,ss=1-Math.sin(o.pulse*Math.PI)*.25;
    c.scale(sz,sz*ss);
    ball(0,-.45,.25,.51,'#fff0c9','#c3ba91');
    ellipse(0,-.93,.87,.29,'#c88870');
    const gr=c.createLinearGradient(-.5,-1.5,.4,-.8);gr.addColorStop(0,'#f4b599');gr.addColorStop(.45,'#dd8e7c');gr.addColorStop(1,'#ba7069');
    c.beginPath();c.moveTo(-.87,-.95);c.bezierCurveTo(-.68,-1.75,.6,-1.8,.87,-.95);c.quadraticCurveTo(0,-.65,-.87,-.95);c.fillStyle=gr;c.fill();
    for(const [x,y,rx]of[[-.42,-1.18,.13],[.2,-1.4,.13],[.52,-1.1,.1],[-.1,-1.03,.12]])ellipse(x,y,rx,rx*.55,'#f9e9c1');
    line([[-.53,-.89],[-.19,-.81],[.23,-.8],[.6,-.89]],'#f0c8a5',.035);
    for(let i=0;i<3;i++)leaf((i-1)*.23,0,(i-1)*.7,.28,'#9db372');
  });}
  function drawLog(o){
    const open=g.stage>=2;
    shadow(open?31.2:o.x,o.z,open?2:.8,.16);
    local(o.x,o.z,()=>{
      if(open){
        c.save();c.rotate(-.035);c.fillStyle='#9c8052';c.beginPath();c.roundRect(-.18,-.33,4.55,.64,.14);c.fill();
        c.fillStyle='#c6a570';c.beginPath();c.roundRect(-.2,-.4,4.55,.55,.12);c.fill();
        line([[-.05,-.28],[1.2,-.31],[2.4,-.24],[4.2,-.29]],'#d7bc85',.055);line([[0,.05],[1.4,-.02],[3.3,.05],[4.22,.0]],'#8f7349',.035);
        for(let i=0;i<8;i++)line([[i*.55,-.37],[i*.55+.07,.13]],'#9a7d50',.022);
        ellipse(4.33,-.11,.14,.3,'#e3c48b');ellipse(4.34,-.12,.07,.18,null,'#b59361',.025);c.restore();
      }else{
        c.save();c.rotate(-.65);
        c.fillStyle='#8f7951';c.beginPath();c.roundRect(-.45,-.5,1.9,.8,.19);c.fill();
        c.fillStyle='#ac9464';c.beginPath();c.roundRect(-.43,-.52,1.9,.56,.17);c.fill();
        ellipse(1.43,-.12,.19,.4,'#e2c38b');ellipse(1.44,-.12,.11,.26,null,'#ac8a58',.03);ellipse(1.44,-.12,.05,.13,null,'#b59460',.02);
        line([[-.3,-.3],[.3,-.36],[.9,-.29]],'#d3b680',.055);line([[-.23,.05],[.3,-.03],[1,.04]],'#735f42',.03);leaf(.1,-.4,-.8,.4,'#829e57');c.restore();
      }
    });
  }
  function drawWater(o){shadow(o.x,o.z,1.1);local(o.x,o.z,()=>{
    ball(0,-.25,.78,.4,'#dce4c7','#97ae99');ellipse(0,-.4,.8,.4,'#e3e5c9');ellipse(0,-.41,.62,.29,'#519d94');ellipse(0,-.42,.51,.2,'#81c7b1');
    c.beginPath();c.ellipse(0,-.42,.4,.14,0,-2.8,-.4);c.strokeStyle='#e6ffdfb5';c.lineWidth=.025;c.stroke();
    if(o.pulse>0)for(let j=0;j<8;j++){const a=j*TAU/8,rr=(1-o.pulse)*2;ellipse(Math.cos(a)*rr,-.6-Math.sin((1-o.pulse)*Math.PI)*1+Math.sin(a)*rr*.55,.035,.07,'#d2f7dd');}
    for(let j=0;j<3;j++)leaf(.7+j*.05,.1,j*.4,.45,'#83ac66');
  });}
  function drawSoil(o){
    groundEllipse(o.x,o.z,1.0,.8,'#8a8860');groundEllipse(o.x,o.z,.86,.65,'#a6956a');
    for(let i=-1;i<2;i++)path([[o.x-.55,o.z+i*.25],[o.x+.55,o.z+i*.25]],.035,'#7b7f53');
    if(g.grown.has(o.id)){
      for(let j=0;j<5;j++)smallFlower(o.x+Math.sin(j*2.4)*.53,o.z+Math.cos(j*2.4)*.4,.7+j%3*.25,['#f5c19b','#f4dc9c','#e9c2cf'][j%3],j);
    }else local(o.x,o.z,()=>{leaf(0,-.03,-.7,.21,'#c1bf7f');leaf(0,-.03,.7,.19,'#b3bb79');});
  }
  function drawStone(o){shadow(o.x,o.z,1.1);local(o.x,o.z,()=>{
    const sway=Math.sin(o.pulse*16)*o.pulse*.08;
    if(g.stoneTaps<3){
      ball(sway,-.5,.63,.69,'#cad0ad','#7e9c87');ellipse(-.25,-.7,.12,.07,'#dae0bb');ellipse(.23,-.3,.14,.08,'#6e8e7980');
      if(g.stoneTaps){line([[-.03,-1.12],[.11,-.84],[-.1,-.68],[.06,-.47],[-.12,-.15]],'#efda98',.04);}
      if(g.stoneTaps===2){line([[-.1,-.68],[-.4,-.5],[-.57,-.55]],'#efda98',.035);line([[.06,-.47],[.42,-.55]],'#efda98',.035);}
    }else{
      ball(-.38,-.2,.4,.28,'#cdd3b3','#829e87');ball(.38,-.2,.36,.26,'#bdc9a6','#72917c');ellipse(0,-.15,.22,.1,'#fff1ad');
    }
    for(let j=0;j<4;j++)leaf(Math.cos(j*2)*.55,.05,-1+j*.7,.28,'#91a76a');
  });}
  function drawPot(o){shadow(o.x,o.z,.8);local(o.x,o.z,()=>{
    c.fillStyle='#ba8e68';c.beginPath();c.moveTo(-.5,-.55);c.lineTo(-.36,-.02);c.quadraticCurveTo(0,.15,.36,-.02);c.lineTo(.5,-.55);c.fill();
    ellipse(0,-.55,.53,.2,'#d5ac7d');ellipse(0,-.55,.39,.13,'#6c7450');
    if(!g.potOpen){ball(0,-.62,.42,.15,'#d9b383','#b68c65');ellipse(0,-.79,.08,.08,'#ebc596');}
    else{for(let j=0;j<4;j++){const a=g.t+j*2.1,xx=Math.cos(a)*.5,yy=-.9-Math.sin(a*1.6)*.35;star(xx,yy,.035,'#fff1b1');}}
  });}
  function drawSeed(o){if(o.id!==g.player.carrying)shadow(o.x,o.z,.55,.11);local(o.x,o.z,()=>{
    c.save();c.translate(0,-(o.h||.3));c.rotate(o.spin);
    ball(0,0,.3,.31,'#d9b27c','#a57a50');
    c.beginPath();c.ellipse(0,-.15,.31,.15,0,Math.PI,TAU);c.lineTo(.31,-.1);c.quadraticCurveTo(0,.09,-.31,-.1);c.closePath();c.fillStyle='#887d51';c.fill();
    for(let j=-1;j<2;j++)line([[j*.13,-.27],[j*.13+.07,-.11]],'#a89a66',.025);
    line([[0,-.26],[.08,-.39]],'#6e7b4c',.055);c.restore();
  });}
  function drawPlayer(p=g.player){
    shadow(p.x,p.z,.62,.17);
    local(p.x,p.z,()=>{
      c.translate(0,-p.h);c.scale(1.1,1.1);
      const walk=(Math.abs(p.vx)+Math.abs(p.vz)>.1)?Math.sin(p.walk*3.4)*.1:0;
      const bob=p.flight?0:Math.abs(walk)*.28;
      c.translate(0,-bob);
      line([[-.14,-.26],[-.16+walk*.3,-.06-walk*.5]],'#514f3c',.12);line([[.14,-.26],[.16-walk*.3,-.06+walk*.5]],'#514f3c',.12);
      ball(.18,-.62,.2,.3,'#7d9f84','#517d6c');
      c.beginPath();c.moveTo(-.21,-.8);c.quadraticCurveTo(-.29,-.55,-.28,-.26);c.quadraticCurveTo(0,-.15,.28,-.26);c.quadraticCurveTo(.29,-.58,.2,-.8);c.closePath();
      const gr=c.createLinearGradient(-.25,-.75,.22,-.2);gr.addColorStop(0,'#f6bb74');gr.addColorStop(1,'#d68a57');c.fillStyle=gr;c.fill();
      line([[-.23,-.71],[-.34,p.carrying?-.7:-.45+walk]],'#f1c79c',.115);
      const arm=p.carrying?-.7:p.gesture>0?-.98:-.45-walk;line([[.23,-.71],[.36,arm]],'#f1c79c',.115);
      ball(0,-.98,.26,.27,'#ffe3b8','#e7ba8c');ellipse(-.25,-.97,.06,.08,'#f4cca0');ellipse(.25,-.97,.06,.08,'#f4cca0');
      const looking=!!g.ending||g.treeReply&&Math.hypot(p.x-40.5,p.z-12.5)<4&&Math.hypot(p.vx,p.vz)<.1;
      if(p.dirZ>-.25||looking){const look=looking?0:p.dirX*.045,eyeY=looking?-1.02:-.97;ellipse(-.09+look,eyeY,.025,.035,'#5d6650');ellipse(.09+look,eyeY,.025,.035,'#5d6650');ellipse(look,-.87,.04,.018,'#d8a284');}
      ball(0,-1.18,.53,.13,'#f4dfa0','#c8b178');
      ball(0,-1.34,.34,.24,'#f7e4ad','#ddc68d');
      c.beginPath();c.ellipse(0,-1.23,.32,.09,0,0,Math.PI);c.strokeStyle='#718e78';c.lineWidth=.065;c.stroke();
      c.beginPath();c.ellipse(0,-1.18,.43,.08,0,0,Math.PI);c.strokeStyle='#b9a66e';c.lineWidth=.012;c.stroke();
      leaf(.24,-1.35,.8,.2,'#90a66f');
    });
  }
  function butterfly(x,z,phase,col='#f9d38a'){
    const h=.9+Math.sin(g.t*2+phase)*.18,p=P(x,z,h),w=Math.abs(Math.sin(g.t*9+phase))*.14+.035;
    c.save();c.translate(p.x,p.y);c.scale(r.s,r.s);c.rotate(Math.sin(g.t+phase)*.3);ellipse(-w*.6,0,w,.12,col);ellipse(w*.6,0,w,.12,col);line([[0,-.05],[0,.08]],'#7d8e62',.025);c.restore();
  }
  function rabbit(x,z,pose=g.rabbit){shadow(x,z,.6,.1);local(x,z,()=>{
    const r=pose,hop=r.lift+(r.jumpPriority||g.treeReply?.full?0:g.musicPulse?Math.abs(Math.sin(g.t*7))*.35:r.moving?Math.abs(Math.sin(g.t*10))*.14:0);
    c.translate(0,-hop);c.scale(r.dir,1);
    const ear=r.ear??(r.pet>0?Math.sin(g.t*12)*.12:r.mode==='curious'?-.12:Math.sin(g.t*2)*.025);
    const squash=r.mode==='rest'?.9:1;c.scale(1,squash);
    ball(0,-.23,.35,.27,'#fff0cf','#d9d5b2');ball(.21,-.44,.23,.24,'#fcf1d4','#ddd4b2');
    c.save();c.translate(.11,-.54);c.rotate(ear);ball(0,-.19,.07,.25,'#fff2d4','#e7d8b5');ellipse(0,-.2,.027,.13,'#e8bfac');c.restore();
    c.save();c.translate(.33,-.54);c.rotate(-ear);ball(0,-.18,.065,.23,'#fff2d4','#e7d8b5');ellipse(0,-.18,.025,.12,'#e8bfac');c.restore();
    if(r.pet>0)line([[.29,-.47],[.34,-.49],[.38,-.47]],'#74745c',.023);else ellipse(.34,-.46,.022,.03,'#74745c');
    ellipse(.44,-.39,.035,.026,'#cfaa98');ellipse(-.3,-.3,.1,.11,'#fff3d6');
  });}
  const island=[[.5,13],[13,12],[14,4.5],[21,3.8],[31,4],[39,3.5],[47.8,4.7],[48.4,12],[48,25],[47,33.4],[38,34],[29,33.8],[16,33.7],[13.5,29],[1,29]];
  function terrain(){
    const bg=c.createLinearGradient(0,0,r.w,r.h);bg.addColorStop(0,'#315e54');bg.addColorStop(.5,'#527c65');bg.addColorStop(1,'#2d5e55');c.fillStyle=bg;c.fillRect(0,0,r.w,r.h);
    for(let i=0;i<14;i++){const xx=((i*217+Math.sin(g.t*.03+i)*50)%(r.w+300))-150,yy=(i*173)%(r.h+200)-100;const gr=c.createRadialGradient(xx,yy,0,xx,yy,130);gr.addColorStop(0,'#b9d1930b');gr.addColorStop(1,'#b9d19300');c.fillStyle=gr;c.fillRect(xx-130,yy-130,260,260);}
    polygon(island.map(([x,z])=>[x+.3,z+.7,-.65]),'#254f4560');
    polygon(island.map(([x,z])=>[x,z,-1.2]),'#577864');
    for(let i=0;i<island.length;i++){
      const a=island[i],b=island[(i+1)%island.length];polygon([[...a,0],[...b,0],[...b,-1.2],[...a,-1.2]],i%2?'#76916b':'#638562');
    }
    polygon(island,'#aebd7b');
    for(const q of patches)if(visible(q.x,q.z))groundEllipse(q.x,q.z,q.rx,q.rz,q.n<.4?'#9aad702a':'#dae09924');
    c.save();c.beginPath();island.forEach(([x,z],i)=>{const p=P(x,z);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.closePath();c.clip();
    polygon([[30.1,4],[33.5,4],[33.3,12],[33.8,20],[33.1,34],[30.2,34],[30.5,24],[30,17]],'#609b8d');
    path([[31.5,4],[31.7,15],[31.5,25],[31.7,34]],1.65,'#78b8a0');
    for(let i=0;i<32;i++){
      const z=5+(i*.91+g.t*.23)%28,x=31.5+Math.sin(i*3)*.65;
      const p=P(x,z);line([[p.x-r.s*.13,p.y],[p.x+r.s*(.15+Math.sin(i)*.08),p.y]],'#d5ebbc66',r.s*.018);
    }
    c.restore();
    groundEllipse(40.3,28.6,3.6,2.25,'#97a87c');groundEllipse(40.3,28.6,3.3,2,'#5d9f93');groundEllipse(40.1,28.4,2.9,1.65,'#7fc1a6');
    const pond=P(40.3,28.6);for(let i=0;i<3;i++){c.beginPath();c.ellipse(pond.x,pond.y, r.s*(.7+i*.7+Math.sin(g.t+i)*.04),r.s*(.2+i*.24),0,.1,2.6);c.lineWidth=r.s*.022;c.strokeStyle='#d4edbf88';c.stroke();}
    for(const [x,z]of[[39,28],[41.2,29.1],[40.7,27.9]]){
      groundEllipse(x,z,.38,.32,'#7eac78');const p=P(x,z);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+r.s*.42,p.y);c.strokeStyle='#b1cb8a';c.lineWidth=1;c.stroke();
    }
    path([[6.8,24.5],[6.9,21.4],[9.2,20.4],[13.7,20.7]],1.2,'#cbd094');
    path([[14,20.7],[18,20.1],[23.5,21.6],[27.5,24],[30.2,25.2]],1.05,'#c6cd91');
    path([[18.6,20],[17.7,16],[22.4,12],[26.8,9.4],[29,9.1]],.8,'#c7ce9320');
    path([[33.2,25.2],[36,23.7],[38,20.4],[41.8,17],[40.5,13.8]],1.1,'#c9cd91');
    path([[34,9.2],[37,9.8],[40.1,12.2]],.9,'#c9cd9180');
    for(let j=0;j<5;j++){const x=30.4+j*.65;groundEllipse(x,9.15+Math.sin(j*2)*.2,.37,.38,g.stage>=2?'#d9d3a4':'#9dbb95');}
    for(const p of pebbles)if(visible(p.x,p.z))groundEllipse(p.x,p.z,.05+p.n*.06,.05,'#d0d1a6');
    for(const q of grass){if(!visible(q.x,q.z,1))continue;const p=P(q.x,q.z),s=r.s;const wind=r.reduced?0:Math.sin(g.t*1.7+q.x*.4+q.z*.3)*.04;c.strokeStyle=q.n>.5?'#77985b70':'#dce39c99';c.lineWidth=Math.max(.65,s*.018);c.beginPath();c.moveTo(p.x-s*.06,p.y);c.lineTo(p.x-s*(.08+wind),p.y-s*.1);c.moveTo(p.x,p.y);c.lineTo(p.x+s*wind,p.y-s*(.12+q.n*.08));c.moveTo(p.x+s*.04,p.y);c.lineTo(p.x+s*(.09+wind),p.y-s*.085);c.stroke();}
    if(g.watered)for(let i=0;i<16;i++)smallFlower(17.7+Math.sin(i*2.4)*1.9,27.1+Math.cos(i*2.4)*1.3,.35+(i%3)*.15,['#f3d69c','#ecbca7','#d5cced'][i%3],i);
  }
  function gate(){
    if(r.gate>.99)return;
    const alpha=1-r.gate;
    c.save();c.globalAlpha=alpha;
    for(let i=0;i<5;i++)bush(13.8,19.1+i*.65,.75+i%2*.12,i);
    local(13.8,20.7,()=>{line([[0,.6],[-.12,-.45],[.08,-1.05]],'#78955a',.08);for(let i=0;i<4;i++)leaf(0,.3-i*.3,i%2?1.3:-1.3,.3,'#c2cf83');});c.restore();
  }
  r.resize=()=>{r.w=innerWidth;r.h=innerHeight;r.dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(r.w*r.dpr);canvas.height=Math.round(r.h*r.dpr);};
  r.emit=e=>{
    if(e.kind==='sound')return;
    if(e.kind==='reply-petals'){
      if(r.reduced)return;
      for(let i=0;i<(e.canopy?18:7);i++){
        const life=3+random()*2;
        r.particles.push({x:e.x+(random()-.5)*(e.canopy?4:1),z:e.z+(random()-.5)*1.4,h:e.canopy?3+random()*3:.7+random(),vx:(random()-.5)*.28,vz:(random()-.5)*.22,vy:-.12,life,max:life,color:i%2?'#f6e3b0':'#e8c9aa',size:.035+random()*.025,kind:'quiet-petal',phase:random()*TAU});
      }
      return;
    }
    if(e.kind==='trail'){
      for(let i=0;i<26;i++)r.particles.push({x:e.x+(e.toX-e.x)*i/26,z:e.z+(e.toZ-e.z)*i/26,h:.2,vy:.25,vx:0,vz:0,life:1.8+i*.025,max:2.4,color:'#fff0b2',size:.045,kind:'star'});return;
    }
    const colors=e.kind==='water'?['#c8f1da','#ecf7cd']:e.kind==='leaves'?['#e9eaa5','#b2c781','#d5d899']:e.kind==='fireflies'?['#fff0a9','#f7d990']:e.kind==='petals'?['#f8c5a5','#ffe0bb','#f0ae9e']:['#fff0b4','#e5e9b1'];
    const n=r.reduced?8:e.kind==='rainbow'?100:e.kind==='discovery'?50:e.kind==='leaves'?55:24;
    for(let i=0;i<n;i++){
      const a=random()*TAU,v=.5+random()*2.5,life=1+random()*1.8;
      r.particles.push({x:e.x,z:e.z,h:e.kind==='leaves'||e.kind==='rainbow'?2.5+random()*2:.4,vx:Math.cos(a)*v,vz:Math.sin(a)*v*.75,vy:e.kind==='leaves'?-.2:1+random()*2,life,max:life,color:e.color||colors[i%colors.length],size:.035+random()*.07,kind:e.kind==='petals'||e.kind==='leaves'?'petal':'star',phase:random()*TAU});
    }
  };
  r.mark=(x,z)=>{r.marks.push({x,z,t:0});};
  r.draw=dt=>{
    const ending=endingPose(g,r.reduced),cast=ending?endingActors(g,r.reduced):null,p=cast?.player||g.player;
    r.gate+=(Number(g.stage>0)-r.gate)*(1-Math.exp(-dt*2));
    const base=Math.min(r.w/(r.w<600?14.4:24),r.h/15.5);
    const reply=treeReplyPose(g,r.reduced),pan=r.overview?1:reply.panorama,normalS=base*(g.stage===0?1.18:g.stage===1?1.05:1);
    const wideS=Math.min(r.w/(r.w<600&&!r.overview?25:53),r.h/25);
    const targetS=ending?Math.min(r.w/(r.w<600?9.4:15),r.h/12):normalS+(wideS-normalS)*pan;
    const cameraEase=1-Math.exp(-dt*(ending?1.8:3));
    r.s+=(targetS-r.s)*cameraEase;
    const followX=g.stage===0?8:clamp(p.x+p.dirX*.6,8.5,43),followZ=g.stage===0?20.8:clamp(p.z+p.dirZ*.4,10,28);
    const wideX=r.w<600&&!r.overview?35:24;
    const tx=ending?40:followX+(wideX-followX)*pan,tz=ending?(r.h<500?11:9.5):followZ+(19-followZ)*pan;
    r.cam.x+=(tx-r.cam.x)*cameraEase;r.cam.z+=(tz-r.cam.z)*cameraEase;
    if(r.reduced&&!!ending!==!!r.wasEnding){r.cam={x:tx,z:tz};r.s=targetS;}r.wasEnding=!!ending;
    c.setTransform(r.dpr,0,0,r.dpr,0,0);terrain();
    for(const wave of g.waves){
      const pp=P(wave.x,wave.z);c.save();c.globalAlpha=Math.max(0,1-wave.radius/6)*.65;
      ellipse(pp.x,pp.y,wave.radius*r.s,wave.radius*r.s*.65,null,'#d7f6df',r.s*.045);c.restore();
    }
    if(reply.ripple>0){const u=reply.ripple,pp=P(18.3,27);c.save();c.globalAlpha=Math.sin(u*Math.PI)*.55;for(let i=0;i<2;i++)ellipse(pp.x,pp.y,r.s*(.3+u*3.4+i*.45),r.s*(.3+u*3.4+i*.45)*.65,null,'#f6f4cf',r.s*.025);c.restore();}
    if(ending?.rainbow>0){
      const center=P(40.5,12.5,1.6),rx=Math.min(r.s*6,r.w*.43),ry=Math.min(r.s*4.8,r.h*.42);
      c.save();c.globalAlpha=ending.rainbow*.72;
      ['#ed9d91','#f1b77d','#f0d18a','#b9d28b','#91c5ae','#9cbdd9','#b9a7d3'].forEach((color,i)=>{
        c.beginPath();c.ellipse(center.x,center.y,rx-i*r.s*.085,ry-i*r.s*.085,0,Math.PI,TAU);c.strokeStyle=color;c.lineWidth=Math.max(2,r.s*.09);c.stroke();
      });c.restore();
    }
    const drawables=[];
    for(const flower of (ending?ending.flowers:gardenMemoryFlowers(g)))if((flower.open??1)>0)drawables.push({z:flower.z,draw:()=>{
      const open=flower.open??1;c.save();c.globalAlpha=open;smallFlower(flower.x,flower.z,flower.height*open,flower.color,flower.phase);c.restore();
    }});
    for(const f of g.chainFlowers)if(visible(f.x,f.z))drawables.push({z:f.z,draw:()=>{
      if(f.open>.03){c.save();c.globalAlpha=f.open;smallFlower(f.x,f.z,.5+f.open*.35,'#f4c7a8',f.x);c.restore();}
      if(f.open<.98)local(f.x,f.z,()=>{c.save();c.globalAlpha=1-f.open;line([[0,0],[0,-.5]],'#6b945f',.04);leaf(0,-.35,0,.24,'#abc47c');c.restore();});
    }});
    for(const q of (ending?endingGroundFlowers:flowers))if(visible(q.x,q.z,2))drawables.push({z:q.z,draw:()=>smallFlower(q.x,q.z,.2+q.n*.22,['#f2d8a2','#e8b7ac','#e8e7bd','#c4cbea'][Math.floor(q.n*4)],q.a)});
    for(const [x,z]of hedges)if(visible(x,z))drawables.push({z,draw:()=>{shadow(x,z,.8,.07);bush(x,z,.85,x+z);}});
    drawables.push({z:21,draw:gate});
    for(const [x,z,size]of TREE_SPOTS)if(visible(x,z,6))drawables.push({z,draw:()=>drawTree(x,z,size)});
    for(const o of g.objects){
      if(!visible(o.x,o.z,7))continue;
      const drawers={bloom:drawBloom,bell:drawBell,mushroom:drawMushroom,log:drawLog,water:drawWater,soil:drawSoil,stone:drawStone,pot:drawPot,tree:ob=>drawTree(ob.x,ob.z,1.65,true)};
      drawables.push({z:o.z,draw:()=>drawers[o.type]?.(o)});
    }
    for(const o of g.seeds)if(o.id!==g.player.carrying&&visible(o.x,o.z))drawables.push({z:o.z+(o.flight?5:0),draw:()=>drawSeed(o)});
    const rabbitPose=cast?.rabbit||g.rabbit,rx=rabbitPose.x,rz=rabbitPose.z;
    if(g.stage>=1&&visible(rx,rz))drawables.push({z:rz+(!cast&&rabbitPose.lift>0?2:0),draw:()=>rabbit(rx,rz,rabbitPose)});
    drawables.push({z:p.z+.01,draw:()=>{
      drawPlayer(p);
      const held=g.seeds.find(s=>s.id===p.carrying);
      if(held){
        drawSeed(ending?{...held,x:p.x,z:p.z+.16,h:.82,spin:0}:held);
        local(p.x,p.z,()=>{c.translate(0,-p.h);ball(-.24,-.72,.085,.08,'#ffe3b8','#e7ba8c');ball(.24,-.72,.085,.08,'#ffe3b8','#e7ba8c');});
      }
    }});
    if(g.stoneTaps>=3||g.hint){
      const spirit=cast?.spirit||spiritReplyPosition(g,r.reduced),hint=spirit?null:g.hint,pose=hint?hintPose(hint,r.reduced):null;
      const xx=spirit?spirit.x:hint?hint.x+pose.x:p.x+Math.sin(g.t*.9)*.8-.4,zz=spirit?spirit.z:hint?hint.z+pose.z:p.z+Math.cos(g.t*.8)*.7;
      const alpha=hint?Math.min(1,hint.age/.3):1;
      drawables.push({z:zz+.1,draw:()=>local(xx,zz,()=>{c.save();c.globalAlpha=alpha;
        const yy=-.8-(ending?ending.bloom*.32+(spirit?.lift||0):pose?pose.lift:r.reduced?0:Math.sin(g.t*3)*.12),color=pose?.color||'#fff1aa',gr=c.createRadialGradient(0,yy,0,0,yy,.6);gr.addColorStop(0,color+'b0');gr.addColorStop(1,color+'00');ellipse(0,yy,.6,.6,gr);
        if(g.stoneTaps>=3){ball(0,yy,.15,.17,'#fff8c8',pose?.color||'#e5c87c');const look=pose?.look||0;ellipse(-.04+look,yy,.017,.024,'#6a8061');ellipse(.05+look,yy,.017,.024,'#6a8061');leaf(.02,yy-.12,.5,.16,'#b2c57c');}
        else{ellipse(0,yy,.065,.065,color);for(let j=0;j<2;j++){const a=(r.reduced?0:hint.age*(hint.undiscovered?2: .6))+j*Math.PI;ellipse(Math.cos(a)*.14,yy+Math.sin(a)*.1,.026,.026,color);}}
        if(hint?.undiscovered){for(let j=0;j<3;j++){const a=j*Math.PI*2/3+(r.reduced?0:hint.age*.6),size=r.reduced?.035:.025+.02*(.5+.5*Math.sin(hint.age*3+j));star(Math.cos(a)*.34,yy+Math.sin(a)*.28,size,color);}}
        c.restore();})});
    }
    const memoryFlower=ending||(g.endingSeen?endingPose({ending:{age:8}},true):null);
    if(memoryFlower)drawables.push({z:13.41,draw:()=>{
      const b=memoryFlower.bloom;
      local(40.5,13.4,()=>{if(b>0){line([[0,0],[0,-.62*b]],'#6d985f',.045);leaf(0,-.15,-.9,.3*b,'#a3ba77');leaf(0,-.29,1,.24*b,'#bdd08b');}});
      for(const petal of memoryFlower.petals){local(petal.x,petal.z,()=>{c.globalAlpha=petal.alpha;c.translate(0,-petal.h);c.rotate(petal.angle);ellipse(0,0,.1,.19,petal.color);});}
      if(b>0)local(40.5,13.4,()=>{c.globalAlpha=b;ball(0,-.62,.095,.09,'#fff2bd','#e3c783');});
    }});
    drawables.sort((a,b)=>a.z-b.z);for(const d of drawables)d.draw();
    if(!ending&&g.hint?.arrived){const o=allObjects(g).find(o=>o.id===g.hint.id);if(o){const pp=P(o.x,o.z),pose=hintPose(g.hint,r.reduced),alpha=.4+(r.reduced?0:Math.sin(g.t*2)*.1);ellipse(pp.x,pp.y,r.s*.85,r.s*.3,null,`rgba(${pose.rgb},${alpha})`,r.s*.04);}}
    const n=ending?null:nearest(g);if(n){const pp=P(n.x,n.z);const a=.22+Math.sin(g.t*3)*.08;ellipse(pp.x,pp.y,r.s*.63,r.s*.23,null,`rgba(255,240,179,${a})`,r.s*.035);}
    for(let i=0;i<6;i++){const x=i===0?10+Math.cos(g.t*.8)*.65:17+i*3.8+Math.cos(g.t*.25+i),z=i===0?19+Math.sin(g.t*.7)*.7:9+i*3.3+Math.sin(g.t*.4+i);if(visible(x,z))butterfly(x,z,i,i%2?'#cee6c0':'#f5d396');}
    for(const [i,f]of g.chainFlowers.entries())if(f.butterflies>0&&visible(f.x,f.z)){
      c.save();c.globalAlpha=Math.min(1,f.butterflies/2);
      butterfly(f.x+Math.cos(g.t*1.3+i)*.5,f.z+Math.sin(g.t+i)*.35,i,'#f6df9c');c.restore();
    }
    if(r.debugLocations)for(const point of r.debugLocations){const pp=P(point.x,point.z);ellipse(pp.x,pp.y,r.s*.9,r.s*.5,'#ffe39980','#fff3b2',3);ellipse(pp.x,pp.y-14,7,7,'#fff1ac','#355d50',2);}
    for(const m of r.marks){m.t+=dt;const pp=P(m.x,m.z);c.globalAlpha=Math.max(0,1-m.t*1.5);ellipse(pp.x,pp.y,r.s*(.13+m.t*.5),r.s*(.05+m.t*.19),null,'#fff0b6',r.s*.025);}c.globalAlpha=1;r.marks=r.marks.filter(m=>m.t<.67);
    for(const q of r.particles){q.life-=dt;q.x+=q.vx*dt;q.z+=q.vz*dt;q.h+=q.vy*dt;q.vy-=dt*(q.kind==='quiet-petal'?.07:q.kind==='petal'?.55:2.8);const pp=P(q.x,q.z,Math.max(.03,q.h));c.globalAlpha=Math.min(1,q.life/.65);if(q.kind==='star')star(pp.x,pp.y,q.size*r.s,q.color);else{c.save();c.translate(pp.x,pp.y);c.rotate(q.phase+g.t*(q.kind==='quiet-petal'?.4:1.5));ellipse(0,0,q.size*r.s,q.size*r.s*.45,q.color);c.restore();}}c.globalAlpha=1;r.particles=r.particles.filter(q=>q.life>0);
    if(g.allPulse>0||reply.rainbow>0){const center=P(40.5,12.5,1),alpha=reply.rainbow>0?reply.rainbow*.65:Math.min(1,g.allPulse*.25);c.save();c.globalAlpha=alpha*.3;['#f0b497','#f2d792','#d8e6a7','#b8d9c6','#becfe1'].forEach((col,i)=>{c.beginPath();c.ellipse(center.x,center.y,r.s*(5+i*.17),r.s*(3.5+i*.17),0,Math.PI,TAU);c.lineWidth=r.s*.18;c.strokeStyle=col;c.stroke();});c.restore();}
    if(reply.glow>0){
      const pp=P(40.5,12.5,4.2);c.save();c.globalAlpha=reply.glow*(g.treeReply?.full ? .11 : .07);
      const glow=c.createRadialGradient(pp.x,pp.y,0,pp.x,pp.y,r.s*7);glow.addColorStop(0,'#fff0b1');glow.addColorStop(1,'#fff0b100');ellipse(pp.x,pp.y,r.s*7,r.s*7,glow);
      if(g.treeReply?.full&&g.treeReply.age>4){c.globalAlpha=reply.glow*.07;for(let i=0;i<3;i++){c.beginPath();c.moveTo(pp.x+(i-1)*r.s*.55,pp.y);c.lineTo(pp.x+r.s*(2.8+i*.7),pp.y+r.s*6);c.lineTo(pp.x+r.s*(1.4+i*.7),pp.y+r.s*6);c.closePath();c.fillStyle='#fff3c1';c.fill();}}
      c.restore();
    }
    if(ending){
      const pp=P(40.5,12.5,3.8);c.save();c.globalAlpha=ending.light*ending.reveal;
      const sun=c.createRadialGradient(pp.x,pp.y,0,pp.x,pp.y,r.s*6);sun.addColorStop(0,'#fff3c2');sun.addColorStop(1,'#fff3c200');ellipse(pp.x,pp.y,r.s*6,r.s*6,sun);
      c.globalAlpha=(.1+ending.treeGlow*.08)*ending.reveal;for(let i=0;i<3;i++){c.beginPath();c.moveTo(pp.x+(i-1)*r.s*.35,pp.y);c.lineTo(pp.x+r.s*(2+i*.5),pp.y+r.s*6);c.lineTo(pp.x+r.s*(1+i*.5),pp.y+r.s*6);c.closePath();c.fillStyle='#fff7dc';c.fill();}
      c.globalAlpha=.2*ending.reveal;const edge=c.createRadialGradient(r.w*.5,r.h*.5,r.h*.15,r.w*.5,r.h*.5,Math.max(r.w,r.h)*.7);edge.addColorStop(0,'#244a4300');edge.addColorStop(1,'#244a43');c.fillStyle=edge;c.fillRect(0,0,r.w,r.h);c.restore();
    }
    const light=c.createLinearGradient(0,0,r.w,r.h);light.addColorStop(0,'#fff2c515');light.addColorStop(.5,'#fff2c500');light.addColorStop(1,'#214b3a18');c.fillStyle=light;c.fillRect(0,0,r.w,r.h);
  };
  r.reset=()=>{r.overview=false;r.gate=Number(g.stage>0);r.cam={x:8,z:20.8};r.particles=[];r.marks=[];r.s=Math.min(r.w/(r.w<600?14.4:24),r.h/15.5)*1.18;};
  r.resize();r.reset();
  return r;
}
