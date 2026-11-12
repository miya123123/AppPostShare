export const SCHEMA_VERSION = 1;
export const LIMITS = { layers:[3,10,1], height:[2.5,7,0.1], trunkHeight:[5,40,1], spread:[60,140,1], snow:[0,100,1], density:[0,100,1], ornamentSize:[50,200,1], topperSize:[50,200,1], lightDensity:[20,100,1], glow:[20,100,1], motionSpeed:[.5,2,.1], seed:[0,999999,1] };
export const OPTIONS = {foliage:['evergreen','blue','gold'], ornament:['mixed','ball','star','gift','none'], palette:['classic','ice','candy','gold'], lights:['warm','multi','ice','aurora','none'], motion:['steady','blink','twinkle','wave'], topper:['five','eight','crystal','none']};
export const DEFAULTS = {layers:7,height:4.6,trunkHeight:12,spread:100,snow:28,foliage:'evergreen',ornament:'mixed',density:62,palette:'classic',lights:'warm',lightDensity:65,glow:75,motion:'twinkle',motionSpeed:1,topper:'five',topperSize:100,ornamentSize:100,seed:251225};
export const PRESETS = {
 classic:{name:'クラシック',en:'Classic Christmas',config:{...DEFAULTS}},
 snow:{name:'スノーフォレスト',en:'Snow Forest',config:{...DEFAULTS,layers:8,height:5.2,spread:90,snow:82,foliage:'blue',palette:'ice',ornament:'ball',lights:'ice',density:45,topper:'crystal',seed:12024}},
 legend:{name:'レジェンド',en:'Golden Legend',config:{...DEFAULTS,layers:9,height:5.8,spread:112,snow:0,foliage:'gold',palette:'gold',density:90,lights:'warm',lightDensity:95,glow:95,topper:'eight',seed:88888}},
 aurora:{name:'ナイトオーロラ',en:'Midnight Aurora',config:{...DEFAULTS,layers:6,height:4.9,spread:78,snow:18,foliage:'blue',palette:'ice',ornament:'star',density:48,lights:'aurora',lightDensity:85,glow:90,motion:'wave',topper:'crystal',seed:40125}}
};
export function normalizeConfig(input={}) {
 const result={...DEFAULTS};
 for(const [key,[min,max,step]] of Object.entries(LIMITS)) {
  const value=input[key];
  if(typeof value==='number'&&Number.isFinite(value)) result[key]=Number((Math.round(Math.max(min,Math.min(max,value))/step)*step).toFixed(3));
 }
 for(const [key,values] of Object.entries(OPTIONS)) if(values.includes(input[key])) result[key]=input[key];
 return result;
}
export function parseSettings(text) {
 const data=JSON.parse(text);
 if(!data||data.schemaVersion!==SCHEMA_VERSION||!data.settings||typeof data.settings!=='object'||Array.isArray(data.settings)) throw new Error('この工房の設定ファイルを選んでください。');
 for(const [key,[min,max]] of Object.entries(LIMITS)) {
  // Older schema-1 files predate the animation speed control.
  if(['motionSpeed','topperSize','ornamentSize','trunkHeight'].includes(key)&&!Object.prototype.hasOwnProperty.call(data.settings,key))continue;
  const value=data.settings[key];
  if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) throw new Error('設定値の範囲が正しくありません。');
 }
 for(const [key,values] of Object.entries(OPTIONS)) if(!values.includes(data.settings[key])) throw new Error('設定の種類が正しくありません。');
 return normalizeConfig(data.settings);
}
export function serializeSettings(config) {return JSON.stringify({schemaVersion:SCHEMA_VERSION,settings:normalizeConfig(config)},null,2);}
export function seededRandom(seed,channel=0) {
 let a=(seed ^ Math.imul(channel+1,0x9e3779b9))>>>0;
 return ()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function randomConfig(seed) {
 const rng=seededRandom(seed,91),pick=a=>a[Math.floor(rng()*a.length)];
 return normalizeConfig({...DEFAULTS,seed,layers:4+Math.floor(rng()*7),height:3+rng()*3,spread:75+rng()*60,snow:Math.floor(rng()*86),density:30+Math.floor(rng()*65),foliage:pick(OPTIONS.foliage),palette:pick(OPTIONS.palette),ornament:pick(['mixed','ball','star','gift']),lights:pick(['warm','multi','ice','aurora']),lightDensity:45+rng()*55,topper:pick(['five','eight','crystal'])});
}
