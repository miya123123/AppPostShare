import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {DEFAULTS,normalizeConfig} from '../dist/tree-config.mjs';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');

test('pinning moves the existing canvas container, saves preference, and restores its home',()=>{
 const card={},checkbox={},holder={hidden:true,append(node){this.child=node;}},home={after(node){this.child=node;}};
 const elements={viewportCard:card,pinPreview:checkbox,pinnedPreview:holder,previewHome:home};
 const saved=new Map(),frames=[];
 const context=vm.createContext({$:id=>elements[id],KEY:'test',localStorage:{setItem:(k,v)=>saved.set(k,v)},requestAnimationFrame:fn=>frames.push(fn),resize(){},resetCamera(){}});
 vm.runInContext(app.slice(app.indexOf('function setPreviewPinned('),app.indexOf('function download(')),context);
 context.setPreviewPinned(true);
 assert.equal(holder.child,card);assert.equal(holder.hidden,false);assert.equal(checkbox.checked,true);assert.equal(saved.get('test:pin-preview'),'true');
 context.setPreviewPinned(false);
 assert.equal(home.child,card);assert.equal(holder.hidden,true);assert.equal(checkbox.checked,false);assert.equal(saved.get('test:pin-preview'),'false');
 frames.forEach(fn=>fn());
});
test('rapid changes rebuild once with the newest state and preserve a requested camera fit',()=>{
 const frames=[],seen=[];
 const context=vm.createContext({scheduled:false,fitPending:false,config:{seed:1},requestAnimationFrame:fn=>frames.push(fn),rebuild:fit=>seen.push({fit,seed:context.config.seed}),console,toast(){}});
 vm.runInContext(app.slice(app.indexOf('function scheduleBuild('),app.indexOf('function disposeObject(')),context);
 context.scheduleBuild(true);context.config.seed=999;context.scheduleBuild(false);
 assert.equal(frames.length,1);frames.shift()();assert.deepEqual(seen,[{fit:true,seed:999}]);
});
test('seed input updates immediately while empty and out-of-range drafts keep the last valid value',()=>{
 const handlers={},input={value:'123',addEventListener:(name,fn)=>handlers[name]=fn};let latest;
 const context=vm.createContext({LIMITS:{seed:[0,999999]},$:()=>input,config:{seed:7},applyConfig:next=>latest=next.seed,syncUI(){}});
 const start=app.indexOf(' for(const key of Object.keys(LIMITS))',app.indexOf('function bindUI()'));
 vm.runInContext(app.slice(start,app.indexOf(" for(const group of all('[data-options]'))group.addEventListener",start)),context);
 assert.equal(typeof handlers.input,'function');handlers.input();assert.equal(latest,123);
 for(const value of ['', '1000000','-1','1.5']){input.value=value;handlers.input();assert.equal(latest,123);}
 input.value='0';handlers.input();assert.equal(latest,0);
});

test('pattern, speed, and glow apply immediately without rebuilding tree geometry',()=>{
 let rebuilds=0,updates=0;
 const context=vm.createContext({config:{...DEFAULTS},DEFAULTS,normalizeConfig,previewOnlySettings:new Set(['motion','motionSpeed','glow']),syncUI(){},persist(){},scheduleBuild(){rebuilds++;},lightPreview:{update(){updates++;}},animationTime:2,reducedMotion:false,toast(){}});
 vm.runInContext(app.slice(app.indexOf('function applyConfig('),app.indexOf('function scheduleBuild(')),context);
 context.applyConfig({...context.config,motion:'blink'});
 context.applyConfig({...context.config,motionSpeed:2});
 context.applyConfig({...context.config,glow:95});
 assert.equal(rebuilds,0);assert.equal(updates,3);
 context.applyConfig({...context.config,lightDensity:100});assert.equal(rebuilds,1);
});
