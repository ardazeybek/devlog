'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),Module=require('node:module');
const {dayKey}=require('../core');
test('VS Code celebrates once; a visible dashboard receives the event instead',async()=>{
 for(const dashboardVisible of [false,true]){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'devlog-native-rewards-')),commands={},messages=[];let tick,edit,url,now=Date.now();
  fs.writeFileSync(path.join(root,'history.json'),JSON.stringify({version:1,days:{[dayKey()]:{seconds:3595,languages:{html:3595},projects:{Practice:3595}}}}));
  const doc={languageId:'html',uri:{scheme:'untitled',toString:()=> 'untitled:Practice'},getText:()=>'<h1>Example</h1>'};
  const disposable=()=>({dispose(){}}),load=Module._load,interval=global.setInterval,clear=global.clearInterval,dateNow=Date.now;
  Module._load=function(name,...rest){if(name==='vscode')return {TreeItem:class{},ThemeIcon:class{},StatusBarAlignment:{Left:1},window:{state:{focused:true},activeTextEditor:{document:doc},createStatusBarItem:()=>({show(){},dispose(){}}),createTreeView:disposable,onDidChangeWindowState:disposable,onDidChangeActiveTextEditor:disposable,showInformationMessage:(message,action)=>{messages.push({message,action});return Promise.resolve();}},workspace:{getConfiguration:()=>({get:(k,d)=>d}),getWorkspaceFolder:()=>undefined,onDidChangeTextDocument:f=>(edit=f,disposable())},commands:{registerCommand:(name,fn)=>(commands[name]=fn,disposable())},env:{openExternal:value=>(url=value,true)},Uri:{parse:value=>value}};return load.call(this,name,...rest);};
  global.setInterval=f=>(tick=f,123);global.clearInterval=()=>{};Date.now=()=>now;
  delete require.cache[require.resolve('../extension')];const context={globalStorageUri:{fsPath:root},subscriptions:[]};
  try{
   require('../extension').activate(context);
   const read=async()=>{const u=new URL(url);const token=u.hash.slice(1);u.hash='';return (await fetch(u+'api/stats',{headers:{Authorization:'Bearer '+token,'X-Devlog-Visible':'1'}})).json();};
   if(dashboardVisible){await commands['devlog.open']();await read();}
   edit({document:doc,contentChanges:[{text:'x',range:{start:{line:0},end:{line:0}}}]});now+=5000;tick();
   if(dashboardVisible){assert.equal(messages.length,0);const state=await read();assert(state.rewardEvents.some(e=>e.kind==='title'));assert(state.rewardEvents.some(e=>e.id==='achievement:hours-1'));}
   else{assert.equal(messages.length,1);assert(messages[0].message.includes('First Step'));assert.equal(messages[0].action,'View achievements');}
   now+=5000;tick();assert.equal(messages.length,dashboardVisible?0:1);
  }finally{context.subscriptions.forEach(item=>item.dispose());Module._load=load;global.setInterval=interval;global.clearInterval=clear;Date.now=dateNow;delete require.cache[require.resolve('../extension')];fs.rmSync(root,{recursive:true,force:true});}
 }
});
