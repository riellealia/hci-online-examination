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
r.d.getElementById('sID').value='2024-00099';
r.d.getElementById('sLast').value='Dela Cruz';
r.d.getElementById('sFirst').value='Ana';
const sectionChoice=r.d.querySelector('#sSections input[name="studentSection"]');
if(sectionChoice)sectionChoice.checked=true;
r.w.saveItem('students');
const u2=r.read('users').find(x=>x.username==='2024-00099');
ok(u2.password==='delacruz0','manual add uses lowercase surname plus the selected section year');

await upload('faculty','12-34567-890,Reyes,Maria\n');
r.w.confirmUpload();
const u3=r.read('users').find(x=>x.username==='12-34567-890');
ok(u3.password==='reyes0','unassigned faculty use lowercase surname plus year 0');
r.w.close(); process.exit(0);
})();
