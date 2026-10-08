const {load,SEED}=require('./harness');
const ok=(condition,message)=>{if(!condition)throw new Error(message);console.log(`  ✅ ${message}`)};

console.log('=== COORDINATOR LOGS. Workflow areas and scoped filters ===');
const seed=SEED();
seed.currentUser={username:'coord.001',role:'coordinator'};
seed.users.push({username:'coord.001',password:'c',role:'coordinator',status:'active'});
seed.coordinators=[{id:'coord.001',username:'coord.001',first:'Andrea',last:'Cruz'}];
seed.applicationAuditLog=[
  {id:'coord-a1',at:'2026-08-20T08:00:00+08:00',actorId:'coord.001',actorRole:'coordinator',action:'create-offering',entityType:'subject-offering',entityId:'OFR-1',category:'assignment/enrollment',result:'success',details:{program:'BSCS'}},
  {id:'coord-a2',at:'2026-08-21T09:00:00+08:00',actorId:'coord.001',actorRole:'coordinator',action:'transfer-student',entityType:'student-enrollment',entityId:'ENR-1',category:'assignment/enrollment',result:'failed',reason:'Section is full',details:{from:'SEC-1',to:'SEC-2'}},
  {id:'coord-a3',at:'2026-08-22T10:00:00+08:00',actorId:'dean.demo',actorRole:'dean',action:'approve',entityType:'approval-request',entityId:'APR-1',category:'approval',result:'success',details:{requesterId:'coord.001'}},
  {id:'coord-a4',at:'2026-08-23T11:00:00+08:00',actorId:'coord.other',actorRole:'coordinator',action:'update-schedule',entityType:'offering-schedule',entityId:'SCH-9',category:'schedule/load',result:'success',details:{}}
];
const page=load('coordinator.html',seed);
ok(!page.blocked&&page.rec.errors.length===0,'Coordinator log page loads without runtime errors');
const required=['coordinatorLogSearch','coordinatorLogFrom','coordinatorLogTo','coordinatorLogArea','coordinatorLogCategory','coordinatorLogAction','coordinatorLogTarget','coordinatorLogResult'];
ok(required.every(id=>page.d.getElementById(id)),'Coordinator log provides workflow, date, category, action, target, result, and text filters');
ok(page.d.getElementById('coordinatorLogTable').textContent.includes('OFR-1')&&page.d.getElementById('coordinatorLogTable').textContent.includes('APR-1'),'own actions and related Dean decisions are visible');
ok(!page.d.getElementById('coordinatorLogTable').textContent.includes('SCH-9'),'another Coordinator activity remains outside the scoped log');
page.d.getElementById('coordinatorLogArea').value='transfer';page.d.getElementById('coordinatorLogArea').dispatchEvent(new page.w.Event('change'));
ok(page.d.getElementById('coordinatorLogTable').textContent.includes('ENR-1')&&!page.d.getElementById('coordinatorLogTable').textContent.includes('OFR-1'),'workflow-area filter isolates transfer actions');
ok(/Section is full/.test(page.d.getElementById('coordinatorLogTable').textContent),'failed actions retain their reason');
page.w.resetCoordinatorLogFilters();
ok(/Showing 3 of 3 relevant events/.test(page.d.getElementById('coordinatorLogSummary').textContent),'reset restores all Coordinator-relevant events');
page.w.close();
