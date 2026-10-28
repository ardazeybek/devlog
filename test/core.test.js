'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const c=require('../core'),a=require('../web/achievements'),languages=require('../web/languages');
const change=text=>({text,range:{start:{line:0},end:{line:0}}});
test('small edits count; paste, undo and redo cannot start activity',()=>{
 assert.equal(c.classify([change('a')]).edits,1);
 assert.equal(c.classify([change('a'.repeat(33))]).edits,0);
 assert.equal(c.classify([change('a\nb\nc')]).bulk,5);
 for(const reason of [1,2])assert.equal(c.classify([change('abc')],reason).typed,0);
 assert.equal(c.classify([{text:'',range:{start:{line:0},end:{line:3}}}]).removed,3);
});
test('Windows, macOS and Linux path shapes use the same exclusions',()=>{
 for(const p of [path.win32.join('C:\\Users','Coder','work','node_modules','a.js'),path.posix.join('/Users','Coder','work','node_modules','a.js'),'/home/coder/work/node_modules/a.js'])assert.equal(c.eligible(p,['node_modules']),false);
 for(const p of ['C:\\Users\\Coder\\my project\\index.html','/Users/Coder/my project/index.html','/home/coder/international-project/index.html'])assert(c.eligible(p,['node_modules']));
 assert(!c.eligible('/work/app.min.js',[]));assert(c.eligible('/work/app.js',[]));
});
test('unsaved HTML detection and arbitrary language IDs',()=>{
 const doc={uri:{scheme:'untitled'},languageId:'plaintext',getText:()=>'<h1>Example</h1>'};
 assert(c.eligibleDocument(doc));assert.equal(c.trackedLanguage(doc),'html');
 doc.languageId='my-custom-language';assert.equal(c.trackedLanguage(doc),'my-custom-language');
 assert.equal(languages.name('my-custom-language'),'my-custom-language');assert.equal(languages.name('html'),'HTML');
 assert(!c.eligibleDocument({uri:{scheme:'output'}}));
});
test('achievement IDs are unique; only meaningful thresholds earn XP',()=>{
 const empty=a.evaluate({});assert.equal(empty.length,229);assert.equal(new Set(empty.map(x=>x.id)).size,229);assert(empty.every(x=>!x.earned&&x.target>0));
 const days={'2026-01-01':{seconds:3600,typed:9999999,added:9999999,languages:{html:3600},projects:{Example:3600}}};
 assert(a.evaluate(days).find(x=>x.id==='hours-1').earned);assert(!a.evaluate(days).find(x=>x.id==='hours-5').earned);
 assert.equal(a.evaluate({'2026-01-01':{typed:1e9,added:1e9}}).filter(x=>x.earned).length,0);
 assert.equal(a.metrics({'2026-01-01':{seconds:72000,languages:{plaintext:72000}}}).languageBreadth,0);
});
test('titles require all XP and activity conditions; one-day farming fails',()=>{
 const days={'2026-01-01':{seconds:36000000,languages:Object.fromEntries(['html','css','python','java','c','go'].map(x=>[x,3600000])),projects:{Example:36000000}}};
 const progress=a.titles(days);assert.equal(progress.titles.length,36);assert(progress.xp>1000);
 const developer=progress.titles.find(x=>x.name==='Developer');assert(developer.checks[0].done);assert(!developer.earned);
 assert(progress.titles.every(t=>t.earned===t.checks.every(c=>c.done)));
});
