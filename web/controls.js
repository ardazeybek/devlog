/* Native values and change events, with a glass menu instead of an OS popup. */
(function(){
 let serial=0,opened=null;
 function close(restore=false){if(!opened)return;const control=opened;opened=null;control.menu.hidden=true;control.button.setAttribute('aria-expanded','false');if(restore)control.button.focus({preventScroll:true});}
 function enhance(select){
  if(select.closest('.glass-select'))return;
  const wrap=document.createElement('div');wrap.className='glass-select';
  const button=document.createElement('button');button.type='button';button.className='glass-select-trigger';
  const label=select.getAttribute('aria-label')||'Choose an option',menu=document.createElement('div');
  menu.className='glass-select-menu';menu.id='glass-menu-'+(++serial);menu.hidden=true;menu.setAttribute('role','listbox');menu.setAttribute('aria-label',label);
  button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-controls',menu.id);button.setAttribute('aria-expanded','false');
  const text=document.createElement('span'),chevron=document.createElement('span');chevron.className='select-chevron';chevron.setAttribute('aria-hidden','true');button.append(text,chevron);
  select.parentNode.insertBefore(wrap,select);wrap.append(select,button,menu);select.hidden=true;select.tabIndex=-1;
  const options=[...select.options].map(option=>{const item=document.createElement('button');item.type='button';item.className='glass-select-option';item.setAttribute('role','option');item.tabIndex=-1;item.textContent=option.textContent;item.dataset.value=option.value;menu.append(item);return item;});
  const control={button,menu};
  function sync(){text.textContent=select.selectedOptions[0]?.textContent||'';button.setAttribute('aria-label',label+': '+text.textContent);options.forEach(item=>item.setAttribute('aria-selected',String(item.dataset.value===select.value)));}
  function show(index){close();sync();menu.hidden=false;button.setAttribute('aria-expanded','true');opened=control;wrap.classList.toggle('opens-up',menu.getBoundingClientRect().bottom>innerHeight-12);menu.animate?.([{opacity:0,transform:'translateY(-5px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});options[index??Math.max(0,select.selectedIndex)]?.focus({preventScroll:true});}
  button.onclick=()=>opened===control?close(true):show();
  button.onkeydown=event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='End'?options.length-1:event.key==='Home'?0:undefined);}};
  options.forEach((item,index)=>{item.onclick=()=>{select.value=item.dataset.value;close();sync();select.dispatchEvent(new Event('change',{bubbles:true}));document.getElementById(select.id)?.closest('.glass-select')?.querySelector('button')?.focus({preventScroll:true});};item.onkeydown=event=>{let next;if(event.key==='ArrowDown')next=(index+1)%options.length;if(event.key==='ArrowUp')next=(index+options.length-1)%options.length;if(event.key==='Home')next=0;if(event.key==='End')next=options.length-1;if(next!==undefined){event.preventDefault();options[next].focus({preventScroll:true});}if(event.key==='Escape'){event.preventDefault();close(true);}if(event.key==='Tab')close();};});
  sync();
 }
 document.addEventListener('pointerdown',event=>{if(opened&&!event.target.closest('.glass-select'))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
 window.DevlogControls={enhanceAll(){if(opened&&!opened.button.isConnected)close();document.querySelectorAll('select').forEach(enhance);}};
 window.DevlogControls.enhanceAll();
})();
