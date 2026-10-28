const assert=require('assert/strict'),Module=require('module'),fs=require('fs'),os=require('os'),path=require('path');
const core=require('../core');
const doc=(scheme,language='html',text='<h1>Example</h1>',filename='/tmp/example.html')=>({uri:{scheme,fsPath:filename,toString:()=>scheme+':'+filename},languageId:language,getText:()=>text});
assert(core.eligibleDocument(doc('untitled')));assert(!core.eligibleDocument(doc('output')));assert(!core.eligibleDocument(doc('file','html','', '/a/node_modules/example.html'),['node_modules']));
assert.equal(core.trackedLanguage(doc('untitled','plaintext')),'html');assert.equal(core.trackedLanguage(doc('untitled','plaintext','plain notes')),'plaintext');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'devlog-unsaved-')),commands={},window={state:{focused:true},activeTextEditor:null,createStatusBarItem:()=>({show(){},dispose(){}}),createTreeView:()=>({onDidChangeVisibility:()=>({dispose(){}}),dispose(){}}),onDidChangeWindowState:()=>({dispose(){}})};
let edit,changeEditor,tick,now=100000,url;
window.onDidChangeActiveTextEditor=f=>(changeEditor=f,{dispose(){}});
const load=Module._load;Module._load=function(name,...rest){if(name==='vscode')return {TreeItem:class{},ThemeIcon:class{},StatusBarAlignment:{Left:1},window,workspace:{getConfiguration:()=>({get:(k,d)=>d}),getWorkspaceFolder:()=>undefined,onDidChangeTextDocument:f=>(edit=f,{dispose(){}})},commands:{registerCommand:(n,f)=>(commands[n]=f,{dispose(){}})},Uri:{parse:s=>s},env:{openExternal:s=>url=s}};return load.call(this,name,...rest);};
const interval=global.setInterval,clear=global.clearInterval,dateNow=Date.now;global.setInterval=f=>(tick=f,123);global.clearInterval=()=>{};Date.now=()=>now;
const ctx={globalStorageUri:{fsPath:root},subscriptions:[]};require('../extension').activate(ctx);
const small={text:'x',range:{start:{line:0},end:{line:0}}};
(async()=>{try{
 await commands['devlog.open']();const u=new URL(url),token=u.hash.slice(1);u.hash='';const stats=async()=>(await fetch(u+'api/stats',{headers:{Authorization:'Bearer '+token}})).json();
 const html=doc('untitled','plaintext');window.activeTextEditor={document:html};edit({document:html,contentChanges:[small]});now+=5000;tick();let s=await stats(),day=Object.values(s.days)[0];assert.equal(day.seconds,5);assert.equal(day.languages.html,5);assert.equal(day.projects['Unsaved files'],5);
 // Writing, deleting and retyping in a new unsaved document all keep time tracking alive.
 edit({document:html,contentChanges:[{...small,text:'',range:{start:{line:0},end:{line:2}}}]});now+=5000;tick();edit({document:html,contentChanges:[small]});now+=5000;tick();s=await stats();day=Object.values(s.days)[0];assert.equal(day.seconds,15);assert.equal(day.removed,2);
 // Idle and switching editors cannot add time to the previous document.
 now+=65000;tick();assert.equal(Object.values((await stats()).days)[0].seconds,15);
 edit({document:html,contentChanges:[small]});window.activeTextEditor={document:doc('output')};changeEditor();now+=5000;tick();assert.equal(Object.values((await stats()).days)[0].seconds,15);
 // Language selected by the user stays authoritative.
 assert.equal(core.trackedLanguage(doc('untitled','javascript','<div>')),'javascript');
 console.log('Unsaved HTML, detection, delete/retype, idle and editor switching checks passed.');
 }finally{ctx.subscriptions.forEach(s=>s.dispose());global.setInterval=interval;global.clearInterval=clear;Date.now=dateNow;Module._load=load;fs.rmSync(root,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
