const {load,SEED}=require('./harness');
const assert=require('assert');

const seed=SEED();
seed.students.push({id:'S2',last:'Reyes',first:'Ana',sections:['A']});
seed.users.push({username:'S2',password:'p',role:'student',status:'active'});
seed.sections=[{id:'A',program:'BSCS',yearLevel:1,capacity:2},{id:'B',program:'BSCS',yearLevel:1,capacity:2}];
seed.curricula=[{program:'BSCS',yearLevel:1,term:'first',subjectCode:'SUB1',units:3,status:'active'},{program:'BSCS',yearLevel:1,term:'second',subjectCode:'SUB2',units:3,status:'active'}];
seed.systemSettings={semester:'First Semester'};
seed.sectionSubjects=[{sectionId:'A',assignments:[{id:'O-A',subjectCode:'SUB1',facultyId:'F1'},{id:'O-OTHER',subjectCode:'SUB2',facultyId:'F1'}]},{sectionId:'B',assignments:[{id:'O-B',subjectCode:'SUB1',facultyId:'F1'}]}];
seed.studentEnrollments=[];
seed.approvalRequests=[];seed.applicationAuditLog=[];seed.notifications=[];
const page=load('faculty.html',{...seed,currentUser:{username:'F1',role:'faculty'}}),w=page.w,d=page.d;

(async()=>{

w.displayMyStudents();
assert.ok(d.querySelector('.roster-manage-button.primary'),'Faculty roster exposes student subject management');
w.openStudentAssignModal('S2');
assert.ok(d.getElementById('studentAssignModal').classList.contains('active'));
assert.match(d.getElementById('subjectCheckboxList').textContent,/SUB1/);
assert.doesNotMatch(d.getElementById('subjectCheckboxList').textContent,/SUB2/,'off-semester subjects stay hidden');
w.openFacultySectionPicker('SUB1','add','');
assert.equal(d.querySelectorAll('#facultySectionPickerOptions .faculty-section-option').length,2,'all owned sections are selectable');
w.textareaInputDialog=async()=> 'Requested for class placement.';
await w.saveFacultyStudentOffering('O-B');
assert.equal(page.read('studentEnrollments').filter(item=>item.studentId==='S2').length,0,'Faculty request does not enroll before Dean approval');
let request=page.read('approvalRequests').find(item=>item.proposedChange?.studentId==='S2');
assert.equal(request.proposedChange.offeringId,'O-B');assert.equal(request.status,'pending');
w.loadSubjectsForStudent();assert.match(d.getElementById('subjectCheckboxList').textContent,/Pending/,'current request status is shown in the existing modal');
w.ApprovalService.withdraw(request.id,'Testing the next action.',{username:'F1',role:'faculty'});
w.localStorage.setItem('studentEnrollments',JSON.stringify([{id:'E-S2',studentId:'S2',offeringId:'O-B',subjectCode:'SUB1',sectionId:'B'}]));
w.loadSubjectsForStudent();w.openFacultySectionPicker('SUB1','change','E-S2');await w.saveFacultyStudentOffering('O-A');
request=page.read('approvalRequests').find(item=>item.status==='pending');assert.equal(request.proposedChange.action,'move');assert.equal(request.proposedChange.offeringId,'O-A','existing Change section control now submits a move request');
w.ApprovalService.withdraw(request.id,'Testing removal.',{username:'F1',role:'faculty'});w.loadSubjectsForStudent();
await page.confirmAll(()=>w.removeStudentEnrollment('E-S2','SUB1','B'),true);
request=page.read('approvalRequests').find(item=>item.status==='pending');assert.equal(request.proposedChange.action,'remove','existing Remove control now submits a removal request');
assert.equal(page.read('studentEnrollments')[0].id,'E-S2','remove request leaves enrollment unchanged until approval');
page.w.close();
console.log('✅ Faculty student subject management submits Dean-gated requests without changing the existing layout');
})().catch(error=>{console.error(error);process.exitCode=1});
