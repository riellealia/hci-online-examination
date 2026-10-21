const {load,SEED}=require('./harness');
const ok=(condition,message)=>{if(!condition)throw new Error(message);console.log(`  ✅ ${message}`)};
console.log('=== ROLE DASHBOARD CHARTS. Role-specific operational detail ===');

function rolePage(page,role,username){
  const seed=SEED();
  seed.currentUser={username,role};
  if(!seed.users.some(user=>user.username===username))seed.users.push({username,password:'p',role,status:'active'});
  seed.sections=[{id:'A',program:'BSCS',yearLevel:1,capacity:40}];
  seed.sectionSubjects=[{sectionId:'A',assignments:[{subjectCode:'SUB1',facultyId:'F1'},{subjectCode:'SUB2',facultyId:''}]}];
  seed.studentEnrollments=[{studentId:'S1',subjectCode:'SUB1',sectionId:'A'}];
  seed.approvalRequests=[{id:'R1',status:'pending'},{id:'R2',status:'approved'}];
  seed.studentSubmissions=[{examId:'e1',studentId:'S1',submittedAt:'2026-10-20T10:00:00+08:00',total:10,answers:[{awarded:8}]}];
  return load(page,seed);
}

const dean=rolePage('dean.html','dean','dean.demo');
ok(dean.rec.errors.length===0&&dean.d.querySelectorAll('#deanDashboardCharts article').length===5,'Dean sees the five-area academic bento dashboard');
ok(/Application completion/.test(dean.d.getElementById('deanDashboardCharts').textContent),'Dean dashboard exposes detailed application progress');

const coordinator=rolePage('coordinator.html','coordinator','coord.demo');
ok(coordinator.rec.errors.length===0&&coordinator.d.querySelectorAll('#coordinatorDashboardCharts article').length===5,'Coordinator sees the five-area academic bento dashboard');
ok(/Assigned/.test(coordinator.d.getElementById('coordinatorDashboardCharts').textContent)&&/BSCS/.test(coordinator.d.getElementById('coordinatorDashboardCharts').textContent),'Coordinator dashboard uses assignment and program data');

const faculty=rolePage('faculty.html','faculty','F1');
ok(faculty.rec.errors.length===0&&faculty.d.querySelectorAll('#facultyDashboardCharts article').length===5,'Professor sees the five-area teaching bento dashboard');
ok(/SUB1 80/.test(faculty.d.querySelector('#facultyDashboardCharts .dashboard-vertical-bars').getAttribute('aria-label')),'Professor performance chart reports calculated percentages');

const student=rolePage('student.html','student','S1');
ok(student.rec.errors.length===0&&student.d.querySelectorAll('#studentDashboardCharts article').length===5,'Student sees the five-area learning bento dashboard');
ok(/SUB1 80/.test(student.d.querySelector('#studentDashboardCharts .dashboard-vertical-bars').getAttribute('aria-label')),'Student performance chart reports the latest awarded percentage');

[dean,coordinator,faculty,student].forEach(page=>page.w.close());
