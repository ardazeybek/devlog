const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {aggregate,atomicWrite}=require('../storage');
test('storage merges sessions, retains unknown language IDs, tolerates damaged files',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'devlog-storage-'));
 try{
 atomicWrite(path.join(root,'one.json'),{version:1,days:{'2026-01-01':{seconds:60,languages:{'custom-language':60},projects:{Demo:60}}}});
 atomicWrite(path.join(root,'two.json'),{version:1,days:{'2026-01-01':{seconds:120,languages:{html:120},typed:-20}}});
 fs.writeFileSync(path.join(root,'broken.json'),'{');fs.writeFileSync(path.join(root,'ignored.tmp'),'{');
 const result=aggregate(root);assert.equal(result.days['2026-01-01'].seconds,180);assert.equal(result.days['2026-01-01'].typed,0);assert.equal(result.unreadableFiles,1);assert.equal(result.days['2026-01-01'].languages['custom-language'],60);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
