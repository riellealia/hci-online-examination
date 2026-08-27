const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

// Drive the genuine CSV path: build a File and hand it to handleCSV().
function upload(r,type,text){
  const file=new r.w.File([text],'x.csv',{type:'text/csv'});
  const input={files:[file], value:''};
  return new Promise(res=>{
    const origShow=r.w.showCSVModal;
    r.w.showCSVModal=function(){ origShow.apply(this,arguments); res(); };
    r.w.handleCSV(type,input);
  });
}

(async()=>{
console.log('=== Q. CSV import: real file path ===');
let r=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});
await upload(r,'faculty','F2,Dupe,X\nF9,New,Y\n');
r.w.confirmUpload();
ok(r.read('faculty').filter(f=>f.id==='F2').length===1,'duplicate row skipped (was silently added with no login)');
ok(r.read('faculty').some(f=>f.id==='F9'),'new row imported');
const u=r.read('users').find(x=>x.username==='F9');
ok(!!u,'login created for imported faculty');
ok(u&&u.password==='new0','unassigned imported faculty password uses lowercase surname plus year 0');
ok(/Imported 1/.test(r.rec.alerts.join('|'))&&/Skipped 1/.test(r.rec.alerts.join('|')),'reports imported vs skipped');

console.log('\n=== Q2. subjectAssignments merge into facultyIds ===');
await upload(r,'subjectAssignments','SUB1,F2\n');
r.w.confirmUpload();
const sa=r.read('subjectAssignments').filter(x=>x.subjectCode==='SUB1');
ok(sa.length===1,'merged into the existing subject row, not duplicated');
ok(sa[0].facultyIds.includes('F1')&&sa[0].facultyIds.includes('F2'),'both lecturers on one assignment');
ok(sa[0].facultyId===undefined,'no mixed singular/plural shape left behind');

console.log('\n=== Q3. unmatched references rejected ===');
await upload(r,'subjectAssignments','NOPE,F1\nSUB2,GHOST\n');
r.w.confirmUpload();
ok(!r.read('subjectAssignments').some(x=>x.subjectCode==='NOPE'),'unknown subject rejected');
ok(!(r.read('subjectAssignments').find(x=>x.subjectCode==='SUB2')?.facultyIds||[]).includes('GHOST'),'unknown faculty rejected');
r.w.close();
process.exit(0);
})();
