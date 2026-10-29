const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
let catalog={scrollTop:0},x=0,y=0,insertions=0;
const nodes={'#period':{value:'7'},'#title':{},'#notice':{}};
nodes['#content']={set innerHTML(v){insertions++;catalog={scrollTop:0};y=0;}};
const context={console,Date,Math,JSON,Number,String,Array,Set,URL,URLSearchParams,AbortSignal,location:{hash:'',pathname:'/'},history:{replaceState(){}},sessionStorage:{getItem(){},setItem(){}},document:{addEventListener(){},querySelector:s=>s==='.title-catalog'?catalog:nodes[s]||null,querySelectorAll:()=>[],activeElement:null},window:{get scrollX(){return x},get scrollY(){return y},scrollTo(a,b){x=a;y=b}},fetch:async()=>({ok:true,json:async()=>({days:{},goal:120})}),setInterval(){},setTimeout(){},DevlogLanguages:require('../web/languages'),DevlogAchievements:require('../web/achievements')};
vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../web/app.js'),'utf8'),context);
vm.runInContext("current='overview';render();",context);catalog.scrollTop=500;x=8;y=700;
vm.runInContext('render();',context);assert.equal(catalog.scrollTop,500);assert.equal(y,700);assert.equal(x,8);
// A changed payload must render, preserving both scroll containers.
context.fetch=async()=>({ok:true,json:async()=>({days:{},goal:180})});
(async()=>{await new Promise(r=>setImmediate(r));await vm.runInContext('refresh()',context);assert.equal(catalog.scrollTop,500);assert.equal(y,700);const before=insertions;await vm.runInContext('refresh()',context);assert.equal(insertions,before);console.log('Refresh preserves page and title scroll; unchanged data does not rebuild the DOM.');})().catch(e=>{console.error(e);process.exitCode=1;});
