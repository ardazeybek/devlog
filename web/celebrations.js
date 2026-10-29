/* Silent in-page celebrations. No audio, OS permission prompts, or activity writes. */
(function(){
 let initialized=false,seen=new Set(),pending=[];
 const host=document.getElementById('celebrations');
 function burst(card){
  for(let i=0;i<22;i++){const piece=document.createElement('i');piece.className='confetti-piece';piece.setAttribute('aria-hidden','true');piece.style.background=['#2d9a76','#8bc8a8','#e6bd64','#dfd8b7','#f7fff9'][i%5];piece.style.left=(15+Math.random()*70)+'%';piece.style.top=(20+Math.random()*60)+'%';card.append(piece);const angle=Math.random()*Math.PI*2,distance=55+Math.random()*75;const effect=piece.animate?.([{transform:'translate(0,0) rotate(0deg)',opacity:0},{opacity:1,offset:.12},{transform:`translate(${Math.cos(angle)*distance}px,${Math.sin(angle)*distance+45}px) rotate(${160+Math.random()*330}deg)`,opacity:0}],{duration:850+Math.random()*350,easing:'cubic-bezier(.15,.65,.4,1)',delay:Math.random()*100});if(effect)effect.finished.catch(()=>{}).finally(()=>piece.remove());else piece.remove();}
 }
 function show(events){
  if(!host||!events.length)return;
  const card=document.createElement('article');card.className='celebration';card.setAttribute('role','status');card.setAttribute('aria-live','polite');
  const badge=document.createElement('span');badge.className='celebration-badge';badge.textContent='✦';badge.setAttribute('aria-hidden','true');
  const content=document.createElement('div');content.className='celebration-content';const heading=document.createElement('strong');heading.textContent=events.some(e=>e.kind==='title')?'New title. Nice work!':'You did it!';content.append(heading);
  events.slice(0,3).forEach(event=>{const item=document.createElement('p');item.textContent=event.name;content.append(item);});
  const detail=document.createElement('small');const xp=events.reduce((sum,e)=>sum+(e.points||0),0);detail.textContent=events.length>3?`+${events.length-3} more · ${xp} XP`:xp?`+${xp} XP`:'A new milestone reached';content.append(detail);
  const view=document.createElement('button');view.type='button';view.className='celebration-view';view.textContent='View achievements →';view.onclick=()=>{document.querySelector('nav button[data-tab="awards"]')?.click();dismiss();};content.append(view);
  const close=document.createElement('button');close.type='button';close.className='celebration-close';close.setAttribute('aria-label','Dismiss notification');close.textContent='×';close.onclick=()=>dismiss();card.append(badge,content,close);host.prepend(card);
  card.animate?.([{opacity:0,transform:'translateY(-12px) scale(.95)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:450,easing:'cubic-bezier(.16,1,.3,1)'});burst(card);
  let timer,removed=false;
  function dismiss(){if(removed)return;removed=true;clearTimeout(timer);const effect=card.animate?.([{opacity:1,transform:'translateX(0)'},{opacity:0,transform:'translateX(24px)'}],{duration:200,easing:'ease-in'});if(effect)effect.finished.catch(()=>{}).finally(()=>card.remove());else card.remove();}
  function schedule(){clearTimeout(timer);timer=setTimeout(dismiss,7500);}schedule();card.onmouseenter=()=>clearTimeout(timer);card.onmouseleave=schedule;card.onfocusin=()=>clearTimeout(timer);card.onfocusout=schedule;
  while(host.children.length>3)host.lastElementChild.remove();
 }
 function receive(events=[]){
  if(!initialized){events.forEach(event=>seen.add(event.id));initialized=true;return;}
  const fresh=events.filter(event=>!seen.has(event.id));fresh.forEach(event=>seen.add(event.id));
  if(document.hidden){pending.push(...fresh);return;}show([...pending,...fresh]);pending=[];
 }
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pending.length){show(pending);pending=[];}});
 window.DevlogCelebrations={receive};
})();
