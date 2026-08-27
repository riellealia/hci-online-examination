const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const adm=()=>load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});

console.log('=== MM. Allotment validation (plan: Module 2) ===');
let r=adm();
const n=()=>r.read('allotments').length;
const before=n();
// SEED already has S1 enrolled in SUB1 under F1.
r.w.openAllotModal();
r.d.getElementById('allotSubject').value='SUB1';
r.d.getElementById('allotSubject').dispatchEvent(new r.w.Event('change'));
r.d.getElementById('allotStudent').value='S1';
r.d.getElementById('allotFaculty').value='F1';
r.w.saveAllotment();
ok(n()===before,'exact duplicate enrolment rejected');
ok(/already enrolled in SUB1/.test(r.rec.alerts.join('|')),'told why');

console.log('\n--- same subject, different lecturer ---');
r.w.openAllotModal();
r.d.getElementById('allotSubject').value='SUB1';
r.d.getElementById('allotSubject').dispatchEvent(new r.w.Event('change'));
r.d.getElementById('allotStudent').value='S1';
r.d.getElementById('allotFaculty').innerHTML='<option value="F2">F2</option>';
r.d.getElementById('allotFaculty').value='F2';
r.w.saveAllotment();
ok(n()===before,'conflicting enrolment rejected');
ok(/different lecturer/.test(r.rec.alerts.join('|')),'explains the transfer path');

console.log('\n--- lecturer not assigned to the subject ---');
r.w.openAllotModal();
r.d.getElementById('allotSubject').value='SUB2';
r.d.getElementById('allotSubject').dispatchEvent(new r.w.Event('change'));
r.d.getElementById('allotStudent').value='S1';
r.d.getElementById('allotFaculty').innerHTML='<option value="F1">F1</option>';
r.d.getElementById('allotFaculty').value='F1';
r.w.saveAllotment();
ok(n()===before,'invalid faculty/subject pairing rejected');
ok(/not assigned to SUB2/.test(r.rec.alerts.join('|')),'told why');

console.log('\n--- a genuinely valid allotment still saves ---');
r.w.openAllotModal();
r.d.getElementById('allotSubject').value='SUB2';
r.d.getElementById('allotSubject').dispatchEvent(new r.w.Event('change'));
r.d.getElementById('allotStudent').value='S1';
r.d.getElementById('allotFaculty').value='F2';
r.w.saveAllotment();
ok(n()===before+1,'valid allotment accepted');
r.w.close();

console.log('\n=== NN. Exam schedule validation (plan: Module 3) ===');
let f=load('faculty.html',{...SEED(),currentUser:{username:'F1',role:'faculty'}});
const ex=()=>f.read('exams').length;
const eb=ex();
f.w.openExamModal('SUB1');
f.d.getElementById('examTitle').value='Bad Window';
f.d.getElementById('examDate').value='2026-09-01';
f.d.getElementById('examStart').value='14:00';
f.d.getElementById('examEnd').value='09:00';
f.w.saveExam();
ok(ex()===eb,'end-before-start rejected');
ok(/must be later than the start/.test(f.rec.alerts.join('|')),'told why');

f.d.getElementById('examEnd').value='14:00';
f.w.saveExam();
ok(ex()===eb,'zero-length window rejected');

f.d.getElementById('examEnd').value='16:00';
f.w.saveExam();
ok(ex()===eb+1,'valid window accepted');
f.w.close(); process.exit(0);
