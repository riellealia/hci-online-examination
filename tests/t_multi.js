const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

console.log('=== FACULTY ASSIGNMENTS. One professor can handle many sections ===');
const seed=SEED();
seed.sections=[{id:'A',name:'1',capacity:30},{id:'B',name:'2',capacity:30}];
seed.sectionSubjects=[{sectionId:'A',assignments:[{id:'OA',subjectCode:'SUB2',facultyId:'F2'}]},{sectionId:'B',assignments:[{id:'OB',subjectCode:'SUB2',facultyId:'F2'}]}];
const r=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});
r.w.openFacultyProfile(0);
r.d.querySelector('.available-subjects').open=true;
[...r.d.querySelectorAll('.subject-only-table tr[role="button"]')].find(row=>/SUB2/.test(row.textContent)).click();
const boxes=[...r.d.querySelectorAll('#facultySectionPickerOptions input')];
ok(boxes.length===2&&boxes.every(input=>input.type==='checkbox'),'section picker permits several handled sections');
boxes.forEach(input=>{input.checked=true;r.w.updateFacultySectionPicker(input)});
r.w.stageFacultySubject();r.w.saveFacultyAssignmentBatch();
const assigned=r.read('sectionSubjects').flatMap(record=>(record.assignments||[]).filter(offer=>offer.subjectCode==='SUB2'&&offer.facultyId==='F1'));
ok(assigned.length===2,'the professor is assigned to the subject in both selected sections');
ok(/A, B/.test(r.d.querySelector('.faculty-handled-table').textContent),'Faculty profile displays all handled sections');
r.w.close(); process.exit(0);
