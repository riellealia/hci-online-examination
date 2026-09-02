const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

console.log('=== FACULTY ASSIGNMENT EDITING. Uses the Faculty profile workflow ===');
const seed=SEED();
seed.sections=[{id:'A',name:'1',capacity:30},{id:'B',name:'2',capacity:30}];
seed.sectionSubjects=[{sectionId:'A',assignments:[{id:'OA',subjectCode:'SUB1',facultyId:'F1'}]},{sectionId:'B',assignments:[{id:'OB',subjectCode:'SUB1',facultyId:'F2'}]}];
const r=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});

ok(!r.d.getElementById('facultySubjectModal')&&!r.d.getElementById('facultySubjectTable'),'obsolete faculty-subject allotment screen remains removed');
r.w.openFacultyProfile(0);
ok(/SUB1/.test(r.d.querySelector('.faculty-handled-table').textContent),'Faculty profile shows the professor current subject assignment');
r.w.openFacultySectionPicker('SUB1');
const boxes=[...r.d.querySelectorAll('#facultySectionPickerOptions input')];
boxes.forEach(input=>{input.checked=true;r.w.updateFacultySectionPicker(input)});
r.w.stageFacultySubject();
r.w.saveFacultyAssignmentBatch();
const handled=r.read('sectionSubjects').flatMap(record=>(record.assignments||[]).filter(offer=>offer.subjectCode==='SUB1'&&offer.facultyId==='F1').map(()=>record.sectionId));
ok(handled.includes('A')&&handled.includes('B'),'editing through the profile saves the selected subject across multiple sections');
r.w.close(); process.exit(0);
