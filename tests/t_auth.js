const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

console.log('=== A. No session -> every dashboard is blocked ===');
for(const p of ['admin.html','faculty.html','student.html']){
  const r=load(p,{...SEED(),currentUser:undefined});
  ok(r.blocked, `${p} blocks anonymous access`);
}

console.log('\n=== B. Wrong role is blocked ===');
ok(load('admin.html',{...SEED(),currentUser:{username:'S1',role:'student'}}).blocked,
   'student cannot open admin.html');
ok(load('faculty.html',{...SEED(),currentUser:{username:'S1',role:'student'}}).blocked,
   'student cannot open faculty.html');
ok(load('student.html',{...SEED(),currentUser:{username:'admin',role:'admin'}}).blocked,
   'admin cannot open student.html');

console.log('\n=== C. Correct role is allowed through ===');
ok(!load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}}).blocked,'admin allowed');
ok(!load('faculty.html',{...SEED(),currentUser:{username:'F1',role:'faculty'}}).blocked,'faculty allowed');
ok(!load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}}).blocked,'student allowed');

console.log('\n=== D. Deleted account cannot keep using an open session ===');
const s=SEED(); s.users=s.users.filter(u=>u.username!=='F1');
const r=load('faculty.html',{...s,currentUser:{username:'F1',role:'faculty'}});
ok(r.blocked,'session for a deleted user is rejected');
ok(r.read('currentUser')===null,'stale session cleared from storage');

console.log('\n=== E. URL tampering no longer switches identity ===');
const t=load('faculty.html',{...SEED(),currentUser:{username:'F1',role:'faculty'}},{query:'?facultyId=F2'});
const body=t.d.body.textContent;
ok(/Maria/.test(body),'shows the logged-in lecturer (F1 Maria)');
ok(!/Jose/.test(body),'does NOT switch to F2 Jose via ?facultyId=');
t.w.switchTab('exams-tab',t.d.querySelectorAll('.tab-btn')[1]);
const exams=t.d.getElementById('examsView').textContent;
ok(/F1 Exam/.test(exams) && !/SECRET/.test(exams),"cannot see another lecturer's exams");

t.w.close();
process.exit(0);
