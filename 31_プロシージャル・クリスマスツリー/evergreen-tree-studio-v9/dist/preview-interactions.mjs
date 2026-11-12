// Close on a short outside tap, preserving drags, pinch gestures and form input.
export function bindPreviewDismiss(stage,settings){
 const pointers=new Map();
 stage.addEventListener('pointerdown',event=>{
  if(settings.contains(event.target))return;
  const pointer={x:event.clientX,y:event.clientY,moved:false};
  pointers.set(event.pointerId,pointer);
  if(pointers.size>1)for(const p of pointers.values())p.moved=true;
 },true);
 stage.addEventListener('pointermove',event=>{
  const p=pointers.get(event.pointerId);
  if(p&&Math.hypot(event.clientX-p.x,event.clientY-p.y)>8)p.moved=true;
 },true);
 stage.addEventListener('pointerup',event=>{
  const p=pointers.get(event.pointerId);pointers.delete(event.pointerId);
  if(p&&!p.moved&&Math.hypot(event.clientX-p.x,event.clientY-p.y)<=8&&!settings.contains(event.target))settings.open=false;
 },true);
 stage.addEventListener('pointercancel',event=>pointers.delete(event.pointerId),true);
}
