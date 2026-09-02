const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const r=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});

function upload(type,text){
  const f=new r.w.File([text],'x.csv',{type:'text/csv'});
  return new Promise(res=>{ const o=r.w.showCSVModal;
    r.w.showCSVModal=function(){o.apply(this,arguments);res()};
    r.w.handleCSV(type,{files:[f],value:''}); });
}
(async()=>{
console.log('=== Password rule consistency (realistic IDs) ===');
await upload('students','2024-00042,Dela Cruz,Juan,3BSCS-1\n');
r.w.confirmUpload();
const u=r.read('users').find(x=>x.username==='2024-00042');
console.log('    CSV-imported student login:',JSON.stringify(u));
ok(u.password==='delacruz3','CSV student password is lowercase surname without spaces plus year level');

// Same person added through the modal must get the identical password.
r.w.openStudentModal();
r.d.getElementById('sYear').value='3';
r.w.updateStudentIdPreview();
const generatedId=r.d.getElementById('sID').value;
r.d.getElementById('sLast').value='Dela Cruz';
r.d.getElementById('sFirst').value='Ana';
r.d.getElementById('sMiddle').value='M';
r.w.saveItem('students');
const u2=r.read('users').find(x=>x.username===generatedId);
ok(/^\d{4}-\d{5}$/.test(generatedId)&&u2.password==='delacruz3','manual add generates a read-only ID and uses the selected year level');

r.w.openFacultyModal();
const generatedFacultyId=r.d.getElementById('fID').value;
r.d.getElementById('fLast').value='Lopez';
r.d.getElementById('fFirst').value='Rina';
r.d.getElementById('fMiddle').value='Q';
r.w.saveItem('faculty');
const generatedFaculty=r.read('faculty').find(x=>x.id===generatedFacultyId);
const generatedFacultyUser=r.read('users').find(x=>x.username===generatedFacultyId);
ok(/^\d{2}-\d{5}-\d{3}$/.test(generatedFacultyId)&&r.d.getElementById('fID').readOnly&&generatedFaculty.middle==='Q'&&generatedFacultyUser.password==='lopez0','manual faculty add generates a read-only ID and stores the optional middle initial');

await upload('faculty','12-34567-890,Reyes,Maria\n');
r.w.confirmUpload();
const u3=r.read('users').find(x=>x.username==='12-34567-890');
ok(u3.password==='reyes0','unassigned faculty use lowercase surname plus year 0');
r.w.close(); process.exit(0);
})();
