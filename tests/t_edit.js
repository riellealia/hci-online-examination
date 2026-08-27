const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const s=()=>{const x=SEED();
  x.subjectAssignments=[{subjectCode:'SUB1',facultyIds:['F1','F2']},{subjectCode:'SUB2',facultyIds:['F2']}];
  return x;};

console.log('=== PP. Removed direct Student allotment workspace ===');
let r=load('admin.html',{...s(),currentUser:{username:'admin',role:'admin'}});
ok(!r.d.getElementById('allotmentSection'),'direct Student allotment page no longer exists');
ok(!r.d.querySelector('#sidebar [data-panel="allotmentSection"]'),'direct Student allotment navigation no longer exists');

console.log('\n=== QQ. Edit faculty-subject assignment opens populated ===');
r.w.editItem('subjectAssignments',0);
const fs=r.d.getElementById('fsSubject');
ok(fs.options.length>0,'subject dropdown populated (was blank)');
ok(fs.value==='SUB1','current subject preselected');
const chosen=r.d.getElementById('fsFaculty').value;
ok(chosen==='F1','one existing professor is preselected');
r.w.saveFacultySubject();
ok(r.read('subjectAssignments').find(x=>x.subjectCode==='SUB1').facultyIds.length===1,'save normalizes the subject to one professor');
r.w.close(); process.exit(0);
