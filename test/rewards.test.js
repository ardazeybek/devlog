'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {RewardTracker,earned}=require('../rewards');
const days=seconds=>({'2026-10-28':{seconds,languages:{html:seconds},projects:{Example:seconds}}});
function storage(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'devlog-rewards-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
test('existing rewards are a quiet baseline on install and restart',t=>{
 const root=storage(t),tracker=new RewardTracker(root,days(3600));assert.deepEqual(tracker.events,[]);assert.deepEqual(tracker.poll(days(3600)),[]);
 const restarted=new RewardTracker(root,days(3600));assert.deepEqual(restarted.poll(days(3600)),[]);
});
test('a newly earned achievement and title appear once with stable IDs',t=>{
 const tracker=new RewardTracker(storage(t),days(3595));const fresh=tracker.poll(days(3600));assert(fresh.some(e=>e.id==='achievement:hours-1'));assert(fresh.some(e=>e.kind==='title'&&e.name==='First Step'));assert(fresh.every(e=>e.earnedAt>0));assert.deepEqual(tracker.poll(days(3600)),[]);
});
test('multiple extension windows share notification claims',t=>{
 const root=storage(t),first=new RewardTracker(root,days(3595)),second=new RewardTracker(root,days(3595));assert(first.poll(days(3600)).length>0);assert.deepEqual(second.poll(days(3600)),[]);assert(second.recent().some(event=>event.id==='achievement:hours-1')); 
});
test('data corrections cannot make a badge celebrate twice',t=>{
 const tracker=new RewardTracker(storage(t),days(3595));assert(tracker.poll(days(3600)).length>0);tracker.poll(days(100));assert.deepEqual(tracker.poll(days(3600)),[]);
});
test('empty histories never celebrate the default starting title',()=>assert.deepEqual(earned({}),[]));
