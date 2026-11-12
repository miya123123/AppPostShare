import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import * as T from '../dist/vendor/three.module.js';import {DEFAULTS} from '../dist/tree-config.mjs';import {bindPreviewDismiss} from '../dist/preview-interactions.mjs';
function gesture(){const events={},settings={open:true,contains:target=>target==='panel'},stage={addEventListener:(name,handler)=>events[name]=handler};bindPreviewDismiss(stage,settings);return {settings,send:(name,id,x,y,target='canvas')=>events[name]({pointerId:id,clientX:x,clientY:y,target})};}
test('outside taps close settings, while panel interactions, drags and pinches keep them open',()=>{
 let g=gesture();g.send('pointerdown',1,0,0);g.send('pointerup',1,2,2);assert.equal(g.settings.open,false);
 g=gesture();g.send('pointerdown',1,0,0,'panel');g.send('pointerup',1,0,0,'panel');assert.equal(g.settings.open,true);
 g=gesture();g.send('pointerdown',1,0,0);g.send('pointermove',1,30,0);g.send('pointerup',1,0,0);assert.equal(g.settings.open,true);
 g=gesture();g.send('pointerdown',1,0,0);g.send('pointerdown',2,50,0);g.send('pointerup',2,50,0);g.send('pointerup',1,0,0);assert.equal(g.settings.open,true);
 g=gesture();g.send('pointerdown',1,0,0);g.send('pointercancel',1,0,0);g.send('pointerup',1,0,0);assert.equal(g.settings.open,true);
});
test('ground tracks trunk root when pedestal is off and hides for underground camera views',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const context=vm.createContext({T,config:DEFAULTS,showPedestal:false,stageProps:null,camera:{position:{y:3}}});
 vm.runInContext(source.slice(source.indexOf('function makeStageProps('),source.indexOf('function rebuild(')),context);
 vm.runInContext(source.slice(source.indexOf('function updateGround('),source.indexOf('function updatePreviewOptions(')),context);
 context.stageProps=context.makeStageProps();context.updateGround();const ground=context.stageProps.getObjectByName('PreviewGround');assert.equal(ground.position.y,-.001);assert.equal(ground.visible,true);
 const pedestal=context.stageProps.getObjectByName('PreviewPedestal');assert.equal(pedestal.visible,false);const top=pedestal.children[1];assert.ok(Math.abs(top.position.y+top.geometry.parameters.height/2)<1e-8);
 context.camera.position.y=-1;context.updateGround();assert.equal(ground.visible,false);
 context.camera.position.y=1;context.showPedestal=true;context.updateGround();assert.equal(ground.visible,true);assert.equal(ground.position.y,-4.6*.055);
});
