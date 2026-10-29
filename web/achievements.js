/* Shared, deterministic achievement rules. Only measured duration and active dates earn rewards. */
(function(root){
const DAY=86400000;
function date(s){return new Date(s+'T12:00:00Z');}
function calendar(d){return d.toISOString().slice(0,10);}
function metrics(days){
 const entries=Object.entries(days).sort(([a],[b])=>a.localeCompare(b));
 const m={hours:0,days:0,bestStreak:0,weeks:0,months:0,returnDays:0,languages:Object.create(null),languageDays:Object.create(null),projectHours:0,projectDays:0,projectWeeks:0,projects:0,consistentWeeks:0,balancedWeeks:0,steadyMonths:0};
 const weeks=Object.create(null),months=Object.create(null),projects=Object.create(null);let streak=0,last=null;
 for(const [k,d]of entries){const sec=Math.max(0,d.seconds||0);m.hours+=sec/3600;
 if(sec>=900){m.days++;streak=last&&date(k)-date(last)===DAY?streak+1:1;m.bestStreak=Math.max(m.bestStreak,streak);if(last&&date(k)-date(last)>=7*DAY)m.returnDays++;last=k;
 const w=date(k);w.setUTCDate(w.getUTCDate()-(w.getUTCDay()+6)%7);const wk=calendar(w);(weeks[wk]??=[]).push(sec);months[k.slice(0,7)]=(months[k.slice(0,7)]||0)+1;}
 for(const [l,s]of Object.entries(d.languages||{})){const lang=l.toLowerCase();if(lang==='plaintext')continue;m.languages[lang]=(m.languages[lang]||0)+s/3600;if(s>=900)m.languageDays[lang]=(m.languageDays[lang]||0)+1;}
 for(const [p,s]of Object.entries(d.projects||{})){const v=projects[p]??={hours:0,days:0,weeks:new Set()};v.hours+=s/3600;if(s>=900){v.days++;const w=date(k);w.setUTCDate(w.getUTCDate()-(w.getUTCDay()+6)%7);v.weeks.add(calendar(w));}}
 }
 const currentWeek=new Date();currentWeek.setUTCHours(12,0,0,0);currentWeek.setUTCDate(currentWeek.getUTCDate()-(currentWeek.getUTCDay()+6)%7);const weekVals=Object.values(weeks);m.weeks=weekVals.length;m.months=Object.keys(months).length;
 m.consistentWeeks=weekVals.filter(w=>w.length>=3).length;
 // Reward spreading work over days, never long uninterrupted sessions or all-night work.
 m.balancedWeeks=Object.entries(weeks).filter(([k,w])=>k<calendar(currentWeek)&&w.length>=3&&w.every(s=>s<=4*3600)).length;
 m.steadyMonths=Object.values(months).filter(n=>n>=12).length;
 for(const p of Object.values(projects)){m.projectHours=Math.max(m.projectHours,p.hours);m.projectDays=Math.max(m.projectDays,p.days);m.projectWeeks=Math.max(m.projectWeeks,p.weeks.size);if(p.hours>=5)m.projects++;}
 m.languageBreadth=Object.values(m.languages).filter(h=>h>=5).length;
 return m;
}
function evaluate(days){const m=metrics(days),a=[];
 function series(group,id,name,levels,value,unit,reason){levels.forEach((target,i)=>a.push({id:id+'-'+target,group,name:`${name} · ${target} ${target===1?unit.replace(/s$/,''):unit}`,description:reason.replace('{n}',target).replace(/1 hours\b/,'1 hour').replace(/\b1 different days\b/,'1 day').replace(/\b1 different weeks\b/,'1 week').replace(/\b1 different months\b/,'1 month').replace(/\b1 weeks\b/,'1 week'),value,target,tier:i+1,points:(i+1)*25,earned:value>=target}));}
 series('Effort','hours','Time invested',[1,5,10,25,50,100,200,300,500,750,1000,1500],m.hours,'hours','Code for {n} hours in total.');
 series('Consistency','days','Coding habit',[1,3,7,14,30,60,90,120,180,250,365,500],m.days,'days','Code for at least 15 minutes on {n} different days.');
 series('Consistency','streak','Daily streak',[3,5,7,10,14,21,30],m.bestStreak,'days','Code for at least 15 minutes a day for {n} consecutive days.');
 series('Consistency','weeks','Weeks of work',[2,4,8,12,20,26,39,52,78,104],m.weeks,'weeks','Code for 15 minutes on at least one day in {n} different weeks.');
 series('Consistency','months','Long-term journey',[2,3,6,9,12,18,24,36],m.months,'months','Code for 15 minutes on at least one day in {n} different months.');
 series('Balance','consistent','Weekly rhythm',[1,3,6,12,24,36,52],m.consistentWeeks,'weeks','In {n} different weeks, code for 15 minutes a day on at least 3 days.');
 series('Balance','balanced','Balanced week',[1,3,6,12,24,36,52],m.balancedWeeks,'weeks','Complete {n} weeks with at least 3 coding days, each between 15 minutes and 4 hours.');
 series('Consistency','steady','Monthly rhythm',[1,3,6,12,18,24],m.steadyMonths,'months','In {n} different months, code for 15 minutes a day on at least 12 days.');
 series('Projects','project-hours','Project investment',[2,5,10,25,50,100,200,300,500,1000],m.projectHours,'hours','Work on one project for {n} hours in total.');
 series('Projects','project-days','Return to a project',[3,7,14,30,60,100,180,250],m.projectDays,'days','Work on one project for 15 minutes on {n} different days.');
 series('Projects','project-weeks','Project continuity',[2,4,8,12,26,52],m.projectWeeks,'weeks','Work on one project for 15 minutes on at least one day in {n} weeks.');
 series('Projects','projects','Project portfolio',[2,3,5,8,12],m.projects,'projects','Spend at least 5 hours on each of {n} different projects.');
 series('Discovery','breadth','Across languages',[2,3,4,5,6,8],m.languageBreadth,'languages','Spend at least 5 hours coding in each of {n} languages.');
 const langs={javascript:'JavaScript',typescript:'TypeScript',typescriptreact:'TSX',javascriptreact:'JSX',python:'Python',java:'Java',csharp:'C#',cpp:'C++',c:'C',go:'Go',rust:'Rust',ruby:'Ruby',php:'PHP',swift:'Swift',kotlin:'Kotlin',dart:'Dart',html:'HTML',css:'CSS',scss:'SCSS',sql:'SQL',shellscript:'Shell',lua:'Lua',r:'R',vue:'Vue',svelte:'Svelte'};
 for(const [id,name]of Object.entries(langs))series('Languages','lang-'+id,name,[1,5,20,50,100],m.languages[id]||0,'hours',`Code in ${name} for {n} hours in total.`);
 return a;
}
function titles(days){
 const m=metrics(days),xp=evaluate(days).filter(a=>a.earned).reduce((n,a)=>n+a.points,0);
 const task=(key,target,label)=>({label:label.replace(/\b1 hours\b/g,'1 hour').replace(/\b1 different days\b/g,'1 day'),value:m[key]||0,target,done:(m[key]||0)>=target});
 const out=[];
 function add(id,name,need,tasks,kind='Journey'){
  const checks=[{label:`${need.toLocaleString('en-US')} XP`,value:xp,target:need,done:xp>=need},...tasks];
  const earned=checks.every(t=>t.done);
  out.push({id,name,xp:need,kind,checks,earned});
 }
 const rows=[
 ['New Beginning',0,0,0],['First Step',25,1,1],['Code Explorer',100,5,3],['Learner',200,10,7],
 ['Steady Start',350,20,10,'projectHours',5],['Code Apprentice',500,30,14,'consistentWeeks',2],
 ['Practitioner',750,50,21,'projectHours',10],['Developer',1000,75,30,'consistentWeeks',4],
 ['Finding a Rhythm',1400,100,45,'projectDays',14],['Productive Developer',1800,150,60,'projectHours',25],
 ['Growing Experience',2300,200,75,'consistentWeeks',8],['Experienced Developer',2800,250,90,'projectHours',50],
 ['Long-haul Developer',3400,300,120,'projectWeeks',12],['Focused Developer',4000,400,150,'consistentWeeks',12],
 ['Established Developer',4800,500,180,'projectHours',100],['Project Veteran',5600,650,210,'projectDays',60],
 ['Consistent Developer',6400,750,250,'projectWeeks',26],['Advanced Developer',7400,900,300,'steadyMonths',6],
 ['Code Master',8600,1000,365,'projectHours',200],['Senior Developer',9800,1100,400,'consistentWeeks',36],
 ['Enduring Master',11000,1200,450,'projectDays',100],['Deep Experience',13000,1300,500,'projectHours',300],
 ['Seasoned Coder',15000,1400,600,'consistentWeeks',52],['Lasting Impact',17000,1500,730,'projectWeeks',52]
 ];
 const labels={projectHours:n=>`Spend ${n} hours on one project`,projectDays:n=>`Work on one project for 15 minutes on ${n} days`,projectWeeks:n=>`Work on one project for 15 minutes on at least one day in ${n} weeks`,consistentWeeks:n=>`Code for 15 minutes a day on 3 days in ${n} different weeks`,steadyMonths:n=>`Code for 15 minutes a day on 12 days in ${n} months`};
 rows.forEach(([name,need,h,d,k,n],i)=>add('journey-'+i,name,need,[...(h?[task('hours',h,`Code for ${h} hours in total`)]:[]),...(d?[task('days',d,`Code for 15 minutes on ${d} different days`)]:[]),...(k?[task(k,n,labels[k](n))]:[])]));
 // Specialties require depth, not opening many files or farming small badges.
 const specialties=[
 ['Project Commitment',750,'projectHours',25,'projectDays',14],['Project Anchor',2000,'projectHours',100,'projectDays',30],
 ['Project Memory',5000,'projectHours',300,'projectDays',100],['Project Companion',9000,'projectHours',500,'projectWeeks',52],
 ['Weekly Rhythm',750,'consistentWeeks',4,'days',14],['Master of Consistency',2500,'consistentWeeks',12,'days',60],
 ['A Year of Effort',7000,'consistentWeeks',52,'days',250],['Monthly Consistency',1500,'steadyMonths',3,'hours',100],
 ['Lasting Habit',5000,'steadyMonths',12,'hours',500],['Versatile Effort',3000,'languageBreadth',3,'hours',200],
 ['Broad Experience',6500,'languageBreadth',5,'hours',500],['Long-term Companion',10000,'months',24,'days',365]
 ];
 const text=(k,n)=>labels[k]?labels[k](n):k==='days'?`Code for 15 minutes on ${n} different days`:k==='hours'?`Code for ${n} hours in total`:k==='languageBreadth'?`Spend 5 hours in each of ${n} languages`:`Code for 15 minutes on at least one day in ${n} months`;
 specialties.forEach(([name,need,k,n,k2,n2],i)=>add('specialty-'+i,name,need,[task(k,n,text(k,n)),task(k2,n2,text(k2,n2))],'Specialty'));
 const journey=out.filter(t=>t.kind==='Journey');
 const current=journey.filter(t=>t.earned).at(-1);return {xp,current,next:journey.slice(journey.indexOf(current)+1).find(t=>!t.earned),titles:out};
}
const api={evaluate,metrics,titles};if(typeof module!=='undefined')module.exports=api;else root.DevlogAchievements=api;
})(typeof globalThis!=='undefined'?globalThis:this);
