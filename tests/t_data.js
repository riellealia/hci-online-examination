const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const admin=(seed)=>load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});
(async()=>{

console.log('=== F. Deleting faculty cascades ===');
let r=admin(SEED());
await r.confirmAll(()=>r.w.deleteItem('faculty',0));   // delete F1
ok(!r.read('users').some(u=>u.username==='F1'),'login account removed (was able to log in before)');
ok(!r.read('faculty').some(f=>f.id==='F1'),'faculty record removed');
ok(!r.read('subjectAssignments').some(sa=>(sa.facultyIds||[]).includes('F1')),'subject assignment cleaned');
ok(!r.read('allotments').some(a=>a.facultyId==='F1'),'student enrolments cleaned');
ok(!r.read('exams').some(e=>e.facultyId==='F1'),'their exams removed');
ok(!r.read('questions').some(q=>q.examId==='e1'),'orphaned questions removed');
ok(r.read('exams').some(e=>e.id==='e2'),"other lecturer's exam untouched");
r.w.close();

console.log('\n=== G. Deleting a subject cascades ===');
r=admin(SEED());
await r.confirmAll(()=>r.w.deleteItem('subjects',0));  // delete SUB1
ok(!r.read('subjectAssignments').some(sa=>sa.subjectCode==='SUB1'),'assignment removed');
ok(!r.read('allotments').some(a=>a.subjectCode==='SUB1'),'enrolments removed');
ok(!r.read('exams').some(e=>e.subjectCode==='SUB1'),'exams removed');
ok(!r.read('questions').some(q=>q.examId==='e1'),'questions removed');
r.w.close();

console.log('\n=== H. Deleting a student cascades ===');
const seedH=SEED(); seedH.studentSubmissions=[{id:'s1',studentId:'S1',examId:'e1',score:5,total:10}];
r=admin(seedH);
await r.confirmAll(()=>r.w.deleteItem('students',0));
ok(!r.read('users').some(u=>u.username==='S1'),'login removed');
ok(!r.read('allotments').some(a=>a.studentId==='S1'),'enrolments removed');
ok(r.read('studentSubmissions').length===0,'their results removed');
r.w.close();

console.log('\n=== I. Duplicate IDs rejected ===');
r=admin(SEED());
r.d.getElementById('fID').value='F2';   // already exists
r.d.getElementById('fLast').value='Dupe';
r.d.getElementById('fFirst').value='Test';
r.w.saveItem('faculty');
ok(r.read('faculty').filter(f=>f.id==='F2').length===1,'duplicate faculty ID not added');
ok(/already exists/.test(r.rec.alerts.join('|')),'user told why');
r.w.close();

console.log('\n=== J. Changing an ID migrates the login + all references ===');
r=admin(SEED());
r.w.editItem('faculty',0);              // edit F1
r.d.getElementById('fID').value='F1-NEW';
r.d.getElementById('fLast').value='Reyes';
r.d.getElementById('fFirst').value='Maria';
r.w.saveItem('faculty');
const users=r.read('users');
ok(!users.some(u=>u.username==='F1'),'old orphaned login removed');
ok(users.some(u=>u.username==='F1-NEW' && u.role==='faculty'),'new login created (before: none, locked out)');
ok(users.find(u=>u.username==='F1-NEW').password==='reyes0','password matches lowercase surname plus unclassified year 0');
ok(r.read('subjectAssignments').some(sa=>(sa.facultyIds||[]).includes('F1-NEW')),'assignment follows the new ID');
ok(r.read('allotments').some(a=>a.facultyId==='F1-NEW'),'enrolment follows the new ID');
ok(r.read('exams').some(e=>e.facultyId==='F1-NEW'),'exams follow the new ID');
r.w.close();
process.exit(0);
})();
