import test from 'node:test';
import assert from 'node:assert/strict';
import {makeGarden,snapshot,DISCOVERIES} from '../dist/garden-core.js';

const SAVE='hiraku-garden-v1',SETTINGS='hiraku-garden-sound',HINT_SETTINGS='hiraku-garden-hints';
const progress={stage:2,found:DISCOVERIES,grown:['soil-a','soil-b','soil-c'],stoneTaps:3,watered:true,potOpen:true,carrying:'seed-0',player:{x:38,z:20},rabbit:{x:37,z:22},seeds:[{x:38,z:20},{x:25,z:21},{x:40,z:24}]};
const fresh=()=>JSON.parse(JSON.stringify(snapshot(makeGarden())));
let run=0;

async function game({saved=progress,reduced=false,storage:existingStorage}={}){
  let time=0,nextFrame;
  const storage=existingStorage||new Map([[SAVE,JSON.stringify(saved)],[SETTINGS,'off']]);
  function surface(tagName='BUTTON'){
    const listeners=new Map(),attributes=new Map(),classes=new Set(),captured=new Set();
    return {
      tagName,style:{},hidden:false,innerHTML:'',dataset:{},
      append(){},prepend(){},querySelector(){return surface();},querySelectorAll(){return [];},
      classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},toggle(n,value){if(value??!classes.has(n))classes.add(n);else classes.delete(n);},contains:n=>classes.has(n)},
      setAttribute:(k,v)=>attributes.set(k,String(v)),getAttribute:k=>attributes.get(k),
      addEventListener(k,f){if(!listeners.has(k))listeners.set(k,[]);listeners.get(k).push(f);},
      emit(k,e={}){for(const f of listeners.get(k)||[])f({preventDefault(){},target:this,...e});},
      focus(){const previous=document.activeElement;document.activeElement=this;if(previous!==this)previous?.emit('blur');},
      setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),
      releasePointerCapture(id){captured.delete(id);this.emit('lostpointercapture',{pointerId:id});},
      getBoundingClientRect:()=>({left:1040,right:1088,top:22,bottom:70,width:48,height:48})
    };
  }
  const ids=Object.fromEntries(['overview','hint','sound','fullscreen','touch','joystick','stick','petals','restart','restart-progress','renewal','ending','ending-return'].map(id=>[id,surface()]));
  const context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]??(()=>{})});
  ids.garden=Object.assign(surface('CANVAS'),{getContext:()=>context});
  const win=surface('WINDOW'),doc=surface('DOCUMENT');
  Object.assign(globalThis,{
    innerWidth:1200,innerHeight:800,devicePixelRatio:1,
    performance:{now:()=>time},matchMedia:()=>({matches:reduced}),
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
    document:Object.assign(doc,{getElementById:id=>ids[id],createElement:tag=>{const el=surface(tag.toUpperCase());if(tag==='section')ids.debugPanel=el;if(tag==='button')ids.debug=el;return el;},querySelector:()=>surface(),head:surface('HEAD'),body:surface('BODY'),hidden:false,fullscreenEnabled:false,activeElement:null}),
    window:win,requestAnimationFrame:f=>{nextFrame=f;}
  });
  await import(`../dist/garden.js?restart-test=${++run}`);
  const advance=ms=>{time+=ms;nextFrame(time);};
  const frames=n=>{for(let i=0;i<n;i++)advance(1000/60);};
  const down=(extra={})=>ids.restart.emit('pointerdown',{button:0,isPrimary:true,pointerId:1,clientX:1064,clientY:46,...extra});
  const up=()=>ids.restart.emit('pointerup',{pointerId:1});
  frames(2);
  return {ids,win,doc,storage,frames,advance,down,up,state:()=>JSON.parse(storage.get(SAVE))};
}

test('short clicks and interrupted holds leave saved progress intact',async()=>{
  const ui=await game();
  const cancellations=[
    ()=>ui.up(),
    ()=>ui.ids.restart.emit('pointermove',{pointerId:1,clientX:1000,clientY:46}),
    ()=>ui.ids.restart.emit('pointercancel',{pointerId:1}),
    ()=>ui.ids.restart.emit('lostpointercapture',{pointerId:1}),
    ()=>ui.ids.restart.emit('blur'),
    ()=>ui.win.emit('blur'),
    ()=>ui.win.emit('keydown',{code:'Escape'}),
    ()=>{document.hidden=true;ui.doc.emit('visibilitychange');document.hidden=false;}
  ];
  ui.ids.restart.emit('click',{detail:0});ui.frames(100);assert.equal(ui.state().stage,2);
  for(const cancel of cancellations){
    ui.down();ui.frames(35);cancel();ui.frames(100);
    assert.equal(ui.state().stage,2);assert.deepEqual(ui.state().found,DISCOVERIES);
    assert(!ui.ids.restart.classList.contains('holding'));
    assert.equal(ui.ids['restart-progress'].style.strokeDashoffset,'1');
  }
});

test('completed pointer hold replaces the save immediately, resets the view and permits replay',async()=>{
  const ui=await game({saved:{...progress,found:DISCOVERIES.filter(v=>v!=='water'),watered:false,player:{x:18,z:26}}});
  ui.ids.hint.emit('click');assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');
  ui.frames(1);assert(ui.ids.petals.innerHTML.includes('hint-petal unfound'));
  ui.ids.overview.emit('click');assert.equal(ui.ids.overview.getAttribute('aria-pressed'),'true');
  ui.win.emit('keydown',{code:'KeyD'});
  ui.down();ui.frames(80);assert.equal(ui.state().stage,2);
  ui.frames(12);assert.deepEqual(ui.state(),fresh(),'commit the fresh save before the transition finishes');
  ui.win.emit('pagehide');assert.deepEqual(ui.state(),fresh(),'pagehide during the transition must not restore old progress');
  ui.up();ui.advance(2000);
  assert.equal(ui.ids.overview.getAttribute('aria-pressed'),'false');
  assert(!ui.ids.touch.classList.contains('carrying'));
  assert(!document.body.classList.contains('restarting'));
  assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');
  assert.equal(ui.storage.get(HINT_SETTINGS),'on');
  assert.equal(ui.storage.get(SETTINGS),'off');
  ui.frames(260);assert.deepEqual(ui.state(),fresh(),'held movement from before restart is cleared');
  ui.ids.garden.emit('pointerdown',{pointerId:2,clientX:740,clientY:282});
  ui.ids.garden.emit('pointerup',{pointerId:2,clientX:740,clientY:282});
  ui.frames(310);assert.equal(ui.state().stage,1,'the opening flower remains playable after restart');
});

test('hint mode persists ON/OFF across reload, hiding and idle time independently of progress',async()=>{
  const ui=await game({reduced:true,saved:{...progress,found:DISCOVERIES.filter(v=>v!=='water'),watered:false,player:{x:18,z:26}}});
  assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'false');assert.equal(ui.ids.hint.getAttribute('aria-label'),'ヒントをONにする');
  ui.ids.hint.emit('click');ui.frames(1);assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');assert(ui.ids.petals.innerHTML.includes('hint-petal unfound'));
  ui.advance(15000);assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');assert(ui.ids.petals.innerHTML.includes('hint-petal unfound'));
  document.hidden=true;ui.doc.emit('visibilitychange');assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');
  document.hidden=false;ui.doc.emit('visibilitychange');ui.frames(1);assert(ui.ids.petals.innerHTML.includes('hint-petal unfound'));
  ui.win.emit('keydown',{code:'Escape'});assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');
  const reloaded=await game({storage:ui.storage});assert.equal(reloaded.ids.hint.getAttribute('aria-pressed'),'true');assert.equal(reloaded.ids.hint.getAttribute('aria-label'),'ヒントをOFFにする');
  reloaded.ids.hint.emit('click');assert.equal(reloaded.ids.hint.getAttribute('aria-pressed'),'false');assert(!reloaded.ids.petals.innerHTML.includes('hint-petal'));
  assert.equal(reloaded.storage.get(HINT_SETTINGS),'off');reloaded.frames(20);assert(!reloaded.ids.petals.innerHTML.includes('hint-petal'));
  const offReload=await game({storage:reloaded.storage});assert.equal(offReload.ids.hint.getAttribute('aria-pressed'),'false');assert(!offReload.ids.petals.innerHTML.includes('hint-petal'));
});

test('hint mode stays ON with no nearby target and after all discoveries',async()=>{
  const ui=await game(),before=ui.storage.get(SAVE);
  ui.ids.hint.emit('click');ui.frames(1);assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');assert(!ui.ids.petals.innerHTML.includes('hint-petal'));
  assert.equal(ui.storage.get(SAVE),before);
  const initial=await game({saved:{},storage:new Map([[SAVE,'{}'],[HINT_SETTINGS,'on']])});
  assert.equal(initial.ids.hint.getAttribute('aria-pressed'),'true');assert(!initial.ids.petals.innerHTML.includes('hint-petal'));
  initial.ids.garden.emit('pointerdown',{pointerId:4,clientX:700,clientY:350});initial.ids.garden.emit('pointerup',{pointerId:4,clientX:700,clientY:350});
  initial.frames(40);assert(initial.ids.petals.innerHTML.includes('hint-petal unfound'));
  initial.ids.hint.emit('click');assert(!initial.ids.petals.innerHTML.includes('hint-petal'));
});

test('keyboard hold supports cancellation and commits only once with reduced motion',async()=>{
  const ui=await game({reduced:true});
  ui.ids.restart.emit('keydown',{code:'Space',repeat:false});ui.frames(45);
  ui.ids.restart.emit('keyup',{code:'Space'});ui.frames(60);assert.equal(ui.state().stage,2);
  ui.ids.restart.emit('keydown',{code:'Enter',repeat:false});ui.frames(92);
  assert.deepEqual(ui.state(),fresh());assert.equal(document.activeElement,ui.ids.garden);
  assert(!document.body.classList.contains('restarting'));
  ui.ids.restart.emit('keydown',{code:'Enter',repeat:true});ui.frames(110);
  assert(!ui.ids.restart.classList.contains('holding'));assert.deepEqual(ui.state(),fresh());
  const reloaded=await game({storage:ui.storage});reloaded.win.emit('pagehide');
  assert.deepEqual(reloaded.state(),fresh());assert.equal(reloaded.ids.sound.getAttribute('aria-pressed'),'false');
});


test('debug pauses simulation, filters categories and inspects locations without changing progress',async()=>{
  const ui=await game({saved:{...progress,found:['bloom','music']}});
  ui.win.emit('pagehide');const before=ui.state();
  ui.ids.debug.emit('click');assert.equal(ui.ids.debugPanel.hidden,false);assert.equal(ui.ids.debug.getAttribute('aria-expanded'),'true');
  assert.match(ui.ids.debugPanel.innerHTML,/未完了 6/);assert.match(ui.ids.debugPanel.innerHTML,/完了 2/);
  ui.ids.debugPanel.emit('click',{target:{closest:()=>({dataset:{filter:'todo'}})}});
  assert(!ui.ids.debugPanel.innerHTML.includes('<strong>はじまりの花</strong>'));assert(ui.ids.debugPanel.innerHTML.includes('<strong>眠る石</strong>'));
  ui.ids.debugPanel.emit('click',{target:{closest:()=>({dataset:{location:'stone'}})}});assert.match(ui.ids.debugPanel.innerHTML,/場所の確認中/);
  ui.win.emit('keydown',{code:'KeyD'});ui.ids.touch.emit('pointerdown');ui.down();ui.frames(360);
  ui.win.emit('pagehide');assert.deepEqual(ui.state(),before,'inspection must freeze rabbit, player and discoveries');
  ui.win.emit('keydown',{code:'Escape'});assert.equal(ui.ids.debugPanel.hidden,true);
  ui.win.emit('keydown',{code:'KeyD'});ui.frames(120);ui.win.emit('keyup',{code:'KeyD'});ui.win.emit('pagehide');
  assert.notDeepEqual(ui.state().player,before.player,'normal play resumes');
});


test('first tree reply is saved immediately and restart permits its discovery again',async()=>{
  const ui=await game({reduced:true,saved:{...progress,carrying:null,player:{x:39.2,z:13.2}}});
  ui.ids.touch.emit('pointerdown');ui.frames(1);assert.equal(ui.state().treeCelebrated,true,'save before the regular four-second interval');
  ui.down();ui.frames(92);assert.deepEqual(ui.state(),fresh());assert.equal(ui.state().treeCelebrated,false);
});

test('ending UI saves its exact entry state, blocks game input and resumes without a reset',async()=>{
  const ui=await game({saved:{...progress,carrying:null,treeCelebrated:true,player:{x:39.2,z:13.2}}});
  ui.ids.hint.emit('click');
  ui.ids.touch.emit('pointerdown');ui.frames(603);
  assert(document.body.classList.contains('ending-open'));assert.equal(ui.ids.ending.hidden,false);
  assert.equal(document.activeElement,ui.ids['ending-return']);assert.equal(ui.ids.garden.inert,true);
  const entry=ui.state();assert.equal(entry.endingSeen,true);assert.deepEqual(entry.player,{x:39.2,z:13.2});
  ui.win.emit('keydown',{code:'KeyD'});ui.ids.touch.emit('pointerdown');ui.down();ui.ids.overview.emit('click');ui.frames(600);
  ui.win.emit('pagehide');assert.deepEqual(ui.state(),entry,'ending and every attempted hidden control leave the save intact');
  ui.ids['ending-return'].emit('click');assert(!document.body.classList.contains('ending-open'));assert.equal(ui.ids.ending.hidden,true);
  assert.equal(ui.ids.garden.inert,false);assert.equal(ui.ids.hint.getAttribute('aria-pressed'),'true');
  assert.equal(ui.storage.get(HINT_SETTINGS),'on');assert.equal(ui.storage.get(SETTINGS),'off');
  assert.deepEqual(ui.state(),entry,'return saves the same garden');
  ui.frames(20);ui.win.emit('pagehide');assert.deepEqual(ui.state().player,entry.player,'held input is cleared on return');
  ui.win.emit('keydown',{code:'KeyS'});ui.frames(30);ui.win.emit('keyup',{code:'KeyS'});ui.win.emit('pagehide');assert(ui.state().player.z>entry.player.z+1);
  const reloaded=await game({storage:ui.storage});assert(!document.body.classList.contains('ending-open'));assert(reloaded.state().endingSeen);assert.deepEqual(reloaded.state().player,ui.state().player);
});

test('ending can be left early by Escape and remains completed after reload',async()=>{
  const ui=await game({saved:{...progress,carrying:null,player:{x:39.2,z:13.2}}});
  ui.ids.touch.emit('pointerdown');ui.frames(602);assert(document.body.classList.contains('ending-open'));
  const entry=ui.state();ui.win.emit('keydown',{code:'Tab'});assert.equal(document.activeElement,ui.ids['ending-return']);
  ui.win.emit('keydown',{code:'Escape'});assert.equal(ui.ids.ending.hidden,true);assert.deepEqual(ui.state(),entry);
  const reloaded=await game({storage:ui.storage});reloaded.ids.touch.emit('pointerdown');reloaded.frames(240);
  assert(!document.body.classList.contains('ending-open'),'later tree touches only give the short reply');
});

test('debug completion changes save immediately, update petals and filters and persist through reload',async()=>{
  const ui=await game();ui.ids.debug.emit('click');
  const click=dataset=>ui.ids.debugPanel.emit('click',{target:{closest:()=>({dataset})}});
  click({filter:'done'});click({completion:'stone'});
  assert.equal(ui.state().stoneTaps,0);assert(!ui.state().found.includes('stone'));assert.match(ui.ids.debugPanel.innerHTML,/未完了 1/);
  assert(!ui.ids.debugPanel.innerHTML.includes('<strong>眠る石</strong>'),'the modified row leaves the current filter');
  assert.equal((ui.ids.petals.innerHTML.match(/#d3d9bb/g)||[]).length,1);
  click({filter:'todo'});assert(ui.ids.debugPanel.innerHTML.includes('完了にする'));click({completion:'stone'});
  assert.equal(ui.state().stoneTaps,3);assert(ui.state().found.includes('stone'));assert(!ui.ids.petals.innerHTML.includes('#d3d9bb'));
  click({filter:'all'});click({completion:'tree'});assert.equal(ui.state().treeCelebrated,false);assert.equal(ui.state().endingSeen,false);
  assert.deepEqual(ui.state().player,progress.player);assert.equal(ui.state().carrying,progress.carrying);
  const restored=await game({storage:ui.storage});restored.ids.debug.emit('click');assert.match(restored.ids.debugPanel.innerHTML,/未完了 1/);assert(!restored.state().found.includes('tree'));
});
