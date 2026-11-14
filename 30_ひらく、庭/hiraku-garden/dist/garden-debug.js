// Test-only feature. Set false to disable; see README for complete removal.
export const DEBUG_ENABLED=true;
const entries=[
  ['bloom','はじまりの花','花に触れ、庭の入口を開く。',['bloom']],
  ['seed','木の実の花','木の実を花壇に植え、花を咲かせる。',['soil-a','soil-b','soil-c']],
  ['music','風のベル','いずれかのベルに触れ、音を鳴らす。',['bell-a','bell-b','bell-c']],
  ['mushroom','キノコジャンプ','いずれかのキノコでジャンプする、または木の実をバウンドさせる。',['mushroom-small','mushroom-big','mushroom-chain']],
  ['bridge','丸太の橋','丸太に触れ、橋を架ける。',['bridge']],
  ['water','水の波紋','水に触れる、または木の実を水に入れ、波紋を起こす。',['water']],
  ['stone','眠る石','石に3回触れ、不思議な生き物を目覚めさせる。',['stone']],
  ['tree','大きな木','大きな木に触れる。',['tree']]
];
export function debugEntries(g,filter='all'){
  return entries.map(([id,name,condition,ids])=>({id,name,condition,complete:g.found.has(id),locations:ids.map(key=>g.objects.find(o=>o.id===key)).filter(Boolean).map(o=>({x:o.x,z:o.z}))})).filter(e=>filter==='all'||e.complete===(filter==='done'));
}
// Debug-only mutation; normal gameplay never calls this function.
export function setDebugCompletion(g,id,complete){
  if(!entries.some(e=>e[0]===id)||typeof complete!=='boolean'||g.ending)return false;
  if(complete)g.found.add(id);else g.found.delete(id);
  if(id==='bloom'&&complete)g.stage=Math.max(1,g.stage);
  if(id==='bridge'&&complete)g.stage=2;
  if(id==='seed'){
    if(complete&&!g.grown.size)g.grown.add('soil-a');
    if(!complete)g.grown.clear();
  }
  if(id==='stone')g.stoneTaps=complete?3:0;
  if(id==='water'){
    g.watered=complete;
    if(!complete){g.waves=[];for(const flower of g.chainFlowers){flower.bloom=0;flower.open=0;flower.butterflies=0;}}
  }
  if(id==='tree'&&!complete){g.treeCelebrated=false;g.endingSeen=false;}
  // No discovery sounds, rainbow or automatic ending while editing a test state.
  g.treeReply=null;g.endingPending=false;g.allPulse=0;
  if(id==='music')g.musicPulse=0;
  g.hint=null;g.dirty=true;
  return true;
}
export function installDebug({g,canvas,renderer,onPause,canOpen,onChange=()=>{}}){
  if(!DEBUG_ENABLED)return {paused:false};
  const style=document.createElement('link');style.rel='stylesheet';style.href='garden-debug.css';document.head.append(style);
  const button=document.createElement('button');button.id='debug';button.className='glass';button.setAttribute('aria-label','デバッグを開く');button.setAttribute('aria-expanded','false');
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5 5 5M4 20l4-1 12-12-3-3L5 16Z M4 20l1-4"/></svg>';
  document.querySelector('.tools').prepend(button);
  const panel=document.createElement('section');panel.id='debug-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','仕掛けのデバッグ');
  document.body.append(panel);
  let filter='all',location=null,previousOverview=false,message='';
  const api={paused:false};
  function render(){
    const all=debugEntries(g),rows=debugEntries(g,filter);
    panel.innerHTML=`<div class="debug-card"><header><div><small>テスト用・ゲーム一時停止中</small><h2>仕掛けの確認</h2></div><button data-action="close">庭に戻る</button></header><nav aria-label="表示の絞り込み">${[['all','すべて'],['todo','未完了'],['done','完了']].map(([id,label])=>`<button data-filter="${id}" aria-pressed="${id===filter}">${label} ${id==='all'?all.length:all.filter(e=>e.complete===(id==='done')).length}</button>`).join('')}</nav><p>8種類の発見単位で表示します。場所の確認で進行状況は変わりません。</p><p class="debug-feedback" role="status" aria-live="polite">${message}</p><div class="debug-list">${rows.map(e=>`<article><div><strong>${e.name}</strong><span>${e.complete?'完了':'未完了'}</span></div><p>${e.condition}${e.id==='stone'?`（現在 ${g.stoneTaps}/3）`:''}</p><div class="debug-actions"><button data-location="${e.id}">場所を見る</button><button data-completion="${e.id}" aria-label="${e.name}を${e.complete?'未完了に戻す':'完了にする'}">${e.complete?'未完了に戻す':'完了にする'}</button></div></article>`).join('')||'<p>該当する仕掛けはありません。</p>'}</div></div>`;
  }
  function close(){api.paused=false;panel.hidden=true;renderer.debugLocations=null;renderer.overview=previousOverview;button.setAttribute('aria-expanded','false');document.body.classList.remove('debug-open');onPause();canvas.focus({preventScroll:true});}
  button.addEventListener('click',()=>{if(!canOpen())return;previousOverview=renderer.overview;api.paused=true;location=null;message='';onPause();document.body.classList.add('debug-open');button.setAttribute('aria-expanded','true');panel.hidden=false;render();panel.querySelector('button').focus();});
  panel.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.action==='close'){close();return;}
    if(b.dataset.action==='back'){location=null;renderer.debugLocations=null;render();panel.querySelector('button').focus();return;}
    if(b.dataset.filter){filter=b.dataset.filter;render();panel.querySelector(`[data-filter="${filter}"]`).focus();return;}
    if(b.dataset.completion){
      const entry=allEntry(b.dataset.completion);if(!entry)return;
      if(setDebugCompletion(g,entry.id,!entry.complete)){
        message=`${entry.name}を${entry.complete?'未完了に戻しました':'完了にしました'}。変更は保存されます。`;
        if(entry.id==='seed'&&entry.complete)message+=' 花壇を未開花に戻しました。';
        if(entry.id==='tree'&&entry.complete)message+=' 木の特別演出とエンディングも再確認できます。';
        onChange();render();
        (panel.querySelector(`[data-completion="${entry.id}"]`)||panel.querySelector(`[data-filter="${filter}"]`)).focus();
      }
      return;
    }
    if(b.dataset.location){location=allEntry(b.dataset.location);renderer.overview=true;renderer.debugLocations=location.locations;panel.innerHTML=`<div class="debug-location"><strong>${location.name}</strong><span>場所の確認中・一時停止</span><button data-action="back">一覧に戻る</button><button data-action="close">庭に戻る</button></div>`;panel.querySelector('button').focus();}
  });
  function allEntry(id){return debugEntries(g).find(e=>e.id===id);}
  window.addEventListener('keydown',e=>{if(!api.paused)return;if(e.code==='Escape'){e.preventDefault();close();return;}if(e.code==='Tab'){const buttons=[...panel.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  return api;
}
