/* Motion changes presentation only. It never changes recorded statistics. */
(function(){
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let enabled=localStorage.getItem('devlog-motion')!=='off',observer=null,frames=new Set(),effects=new Set(),counters=new Set(),pointerFrame=0;
 const active=()=>enabled&&!preference.matches;
 function sync(){document.documentElement.classList.toggle('motion-on',active());}
 function run(el,keys,options){if(!active()||!el?.animate)return;const a=el.animate(keys,options);effects.add(a);a.finished.catch(()=>{}).finally(()=>effects.delete(a));return a;}
 function frame(fn){const id=requestAnimationFrame(t=>{frames.delete(id);fn(t);});frames.add(id);}
 function beforeRender(){counters.forEach(f=>f());counters.clear();observer?.disconnect();observer=null;frames.forEach(cancelAnimationFrame);frames.clear();effects.forEach(a=>a.cancel());effects.clear();}
 const soft='cubic-bezier(.2,.8,.2,1)';
 function count(el){const value=Number(el.dataset.count),type=el.dataset.format;if(!Number.isFinite(value)||value<=0)return;
 const final=el.textContent;el.setAttribute('aria-label',final);const text=document.createElement('span');text.setAttribute('aria-hidden','true');el.replaceChildren(text);const finish=()=>{text.textContent=final;counters.delete(finish);};counters.add(finish);let start;
 const draw=t=>{if(!el.isConnected)return;if(start===undefined)start=t;const p=Math.min(1,(t-start)/850),v=Math.floor(value*(1-Math.pow(1-p,3)));
 text.textContent=type==='duration'?`${Math.floor(v/3600)}h ${Math.floor(v/60)%60}m`:type==='days'?`${v} days`:v.toLocaleString('en-US');if(p<1&&active())frame(draw);else finish();};frame(draw);
 }
 function chartMotion(){document.querySelectorAll('.chart').forEach(chart=>{
 const line=chart.querySelector('polyline');if(line)run(line,[{strokeDasharray:'1 1',strokeDashoffset:1},{strokeDasharray:'1 1',strokeDashoffset:0}],{duration:1250,easing:soft});
 run(chart.querySelector('polygon'),[{opacity:0},{opacity:1}],{duration:1000,delay:150,fill:'backwards'});
 const dots=[...chart.querySelectorAll('circle')];dots.forEach((dot,i)=>run(dot,[{opacity:0,r:'0px'},{opacity:1,r:'4px'}],{duration:320,delay:Math.min(1000,i/Math.max(1,dots.length-1)*850)+150,easing:soft,fill:'backwards'}));
 });}
 function afterRender({page=false,chart=false}={}){sync();if(!active())return;
 if(page){
 document.querySelectorAll('#content>.metrics>.metric,#content>.grid>.card,#content>.card').forEach((el,i)=>run(el,[{opacity:0,transform:'translateY(14px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:550,delay:Math.min(i*65,320),easing:soft,fill:'backwards'}));
 run(document.querySelector('#title'),[{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:350,easing:soft});
 document.querySelectorAll('.metric b[data-count]').forEach(count);
 observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const el=entry.target;if(!el.isConnected)return;observer?.unobserve(el);el.querySelectorAll('.bar i').forEach(bar=>run(bar,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:700,easing:soft}));run(el,[{opacity:.1,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:soft});}),{threshold:.08});
 // Hidden cards stay readable; the observer only animates them once they enter view.
 document.querySelectorAll('.award,.title-card').forEach(el=>observer.observe(el));
 }
 if(page||chart){
 chartMotion();document.querySelectorAll('.bar i').forEach(el=>{if(el.closest('.award,.title-card'))return;const rect=el.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return;run(el,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],{duration:850,easing:soft,delay:100,fill:'backwards'});});
 document.querySelectorAll('.goal-ring').forEach(el=>{const target=getComputedStyle(el).getPropertyValue('--progress').trim();run(el,[{'--progress':'0%'},{'--progress':target}],{duration:1100,easing:soft});});
 }
 }
 function feedback(button,ok=true){if(!active())return;run(button,ok?[{transform:'scale(1)'},{transform:'scale(.96)',offset:.3},{transform:'scale(1.04)',offset:.65},{transform:'scale(1)'}]:[{transform:'translateX(0)'},{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:380,easing:soft});run(document.querySelector('#goal-message'),[{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:250});}
 document.addEventListener('click',e=>{
 if(!active())return;const button=e.target.closest('button');if(!button||button.disabled)return;
 const rect=button.getBoundingClientRect(),ink=document.createElement('i');ink.className='tap-ink';ink.setAttribute('aria-hidden','true');const size=Math.max(rect.width,rect.height)*2;
 Object.assign(ink.style,{width:`${size}px`,height:`${size}px`,left:`${(e.detail?e.clientX-rect.left:rect.width/2)-size/2}px`,top:`${(e.detail?e.clientY-rect.top:rect.height/2)-size/2}px`});button.append(ink);
 const a=run(ink,[{transform:'scale(0)',opacity:.18},{transform:'scale(1)',opacity:0}],{duration:480,easing:'ease-out'});if(a)a.finished.catch(()=>{}).finally(()=>ink.remove());else ink.remove();
 });
 document.addEventListener('pointermove',e=>{if(!active()||e.pointerType==='touch'||pointerFrame)return;const card=e.target.closest('.card,.metric,.award,.title-card');if(!card)return;
 pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(!card.isConnected)return;const r=card.getBoundingClientRect();card.style.setProperty('--light-x',`${e.clientX-r.left}px`);card.style.setProperty('--light-y',`${e.clientY-r.top}px`);});
 },{passive:true});
 function setEnabled(value){enabled=!!value;localStorage.setItem('devlog-motion',enabled?'on':'off');sync();if(!active())beforeRender();}
 preference.addEventListener('change',()=>{sync();if(!active())beforeRender();});
 document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('motion-paused',document.hidden));
 sync();window.DevlogMotion={beforeRender,afterRender,feedback,setEnabled,get enabled(){return enabled;}};
})();
