const {load,SEED}=require('./harness');
const ok=(condition,message)=>{if(!condition)throw new Error(message);console.log(`  ✅ ${message}`)};

console.log('=== DEAN REPORTS. Statistics and scoped activity filters ===');
const seed=SEED();
seed.currentUser={username:'dean.demo',role:'dean'};
seed.users.push({username:'dean.demo',password:'d',role:'dean',status:'active'});
seed.applicationAuditLog=[
  {id:'dean-a1',at:'2026-08-20T08:00:00+08:00',actorId:'coord.001',actorRole:'coordinator',action:'submit',entityType:'approval-request',entityId:'APR-1',category:'approval',result:'success',details:{program:'BSCS'}},
  {id:'dean-a2',at:'2026-08-21T09:00:00+08:00',actorId:'23-32534-345',actorRole:'faculty',action:'grade',entityType:'submission',entityId:'SUB-1',category:'examination/grading',result:'success',details:{program:'BSIT'}},
  {id:'dean-a3',at:'2026-08-22T10:00:00+08:00',actorId:'system',actorRole:'system',action:'backup',entityType:'database',entityId:'DB-1',category:'system/maintenance',result:'success',details:{}}
];
const page=load('dean.html',seed);
ok(!page.blocked&&page.rec.errors.length===0,'Dean reports load without runtime errors');
const stats=page.d.getElementById('deanStatistics').textContent;
ok(/Personnel/.test(stats)&&/Teaching-load distribution/.test(stats),'personnel and teaching-load statistics render');
ok(/Pending approvals/.test(stats)&&/Grading completion/.test(stats)&&/Participation/.test(stats),'approval, grading, and participation summaries render');
const requiredFilters=['deanLogSearch','deanLogFrom','deanLogTo','deanLogActor','deanLogRole','deanLogCategory','deanLogAction','deanLogTarget','deanLogProgram','deanLogResult'];
ok(requiredFilters.every(id=>page.d.getElementById(id)),'Dean log provides actor, role, action, target, date, program, result, and text filters');
ok(!page.d.getElementById('deanLogTable').textContent.includes('DB-1'),'unrelated maintenance activity is excluded from Dean visibility');
page.d.getElementById('deanLogProgram').value='BSCS';page.d.getElementById('deanLogProgram').dispatchEvent(new page.w.Event('input'));
ok(page.d.getElementById('deanLogTable').textContent.includes('APR-1')&&!page.d.getElementById('deanLogTable').textContent.includes('SUB-1'),'program filter limits the Dean-visible activity');
page.w.resetDeanLogFilters();
ok(/Showing 2 of 2 Dean-visible events/.test(page.d.getElementById('deanLogSummary').textContent),'reset restores the full scoped Dean activity summary');
page.w.close();
