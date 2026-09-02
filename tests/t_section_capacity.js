const {load,SEED}=require('./harness');
const ok=(condition,message)=>console.log(`  ${condition?'✅':'❌'} ${message}`);

console.log('=== SECTION CAPACITY. Student-only limits per subject offering ===');
const seed=SEED();
seed.students.push({id:'S2',last:'Santos',first:'Ana',yearLevel:1,sections:[]});
seed.sections=[{id:'A',name:'1',sectionNumber:1,program:'BSCS',yearLevel:1,capacity:2}];
seed.subjects.find(subject=>subject.code==='SUB2').yearLevel=1;
seed.sectionSubjects=[{sectionId:'A',assignments:[{id:'O-SUB2-A',subjectCode:'SUB2',facultyId:'F2'}]}];
seed.studentEnrollments=[{id:'E1',studentId:'S1',offeringId:'O-SUB2-A',subjectCode:'SUB2',sectionId:'A'}];
const r=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}});

r.w.openStudentEnrollmentPage(1);
r.d.querySelector('.available-subjects').open=true;
const subjectRow=[...r.d.querySelectorAll('.subject-only-table tr[role="button"]')].find(row=>/SUB2/.test(row.textContent));
ok(/1 enrolled/.test(subjectRow.textContent)&&/1 seat available/.test(subjectRow.textContent),'student subject list summarizes enrollment and remaining availability');
subjectRow.click();
const choice=r.d.querySelector('#studentSectionPickerOptions .student-section-choice');
ok(/1 \/ 2 students/.test(choice.textContent)&&/1 seat available/.test(choice.textContent)&&!choice.disabled,'section picker shows the count, limit, and whether the student can still enroll');
choice.click();
r.w.applyStudentOffering();

// Simulate another administrator filling the final seat before this batch is saved.
r.w.editItem('sections',0);
r.d.getElementById('sectionCapacity').value='1';
r.w.saveSection();
r.w.saveStudentEnrollmentBatch();
ok(r.read('studentEnrollments').filter(item=>item.subjectCode==='SUB2'&&item.sectionId==='A').length===1,'batch save is rejected when the offering reaches capacity');
ok(r.rec.toasts.some(message=>/full/i.test(message)),'the administrator is told that the subject section is full');
r.w.openStudentSectionPicker('SUB2');
ok(r.d.querySelector('#studentSectionPickerOptions .student-section-choice').disabled&&/Full/.test(r.d.getElementById('studentSectionPickerOptions').textContent),'a full subject section stays visible but cannot be selected');

// A faculty assignment exists but does not consume a student seat.
r.w.editItem('sections',0);
r.d.getElementById('sectionCapacity').value='2';
r.w.saveSection();
r.w.openStudentSectionPicker('SUB2');
ok(/1 \/ 2 students/.test(r.d.querySelector('#studentSectionPickerOptions .student-section-choice').textContent),'faculty is excluded from the displayed enrollment count');
r.w.close();
process.exit(0);
