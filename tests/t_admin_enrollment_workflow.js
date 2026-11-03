const assert=require('assert');
const {load,SEED}=require('./harness');

(async()=>{
  const seed=SEED();
  seed.sections=[{id:'A',program:'BSCS',yearLevel:1,capacity:50}];seed.students[0].sections=['A'];
  seed.subjects=[...Array.from({length:7},(_,index)=>({code:`BASE-${index}`,name:`Base ${index}`,units:3})),{code:'SUB2',name:'Software Engineering',units:3},{code:'SUB3',name:'Schedule Conflict',units:3}];
  seed.curricula=[{program:'BSCS',yearLevel:1,term:'first',subjectCode:'SUB2',units:3,status:'active'},{program:'BSCS',yearLevel:1,term:'first',subjectCode:'SUB3',units:3,status:'active'}];
  seed.sectionSubjects=[{sectionId:'A',assignments:[{id:'BASE-OFFER',subjectCode:'BASE-0',facultyId:'F1',schedule:{days:['Monday'],start:'09:00',end:'10:00'}},{id:'O-SUB2-A',subjectCode:'SUB2',facultyId:'F1',schedule:{days:['Tuesday'],start:'09:00',end:'10:00'}},{id:'O-SUB3-A',subjectCode:'SUB3',facultyId:'F1',schedule:{days:['Monday'],start:'09:30',end:'10:30'}}]}];
  seed.studentEnrollments=Array.from({length:7},(_,index)=>({id:`BASE-${index}`,studentId:'S1',offeringId:index===0?'BASE-OFFER':`LEGACY-${index}`,subjectCode:`BASE-${index}`,sectionId:'A'}));
  seed.approvalRequests=[];seed.applicationAuditLog=[];seed.notifications=[];
  seed.demoCurriculumVersion=31;
  const page=load('admin.html',{...seed,currentUser:{username:'admin',role:'admin'}}),w=page.w,d=page.d;
  w.openStudentEnrollmentPage(0);d.querySelector('.available-subjects').open=true;
  [...d.querySelectorAll('.subject-only-table tr[role="button"]')].find(item=>/SUB2/.test(item.textContent)).click();d.querySelector('#studentSectionPickerOptions .student-section-choice').click();w.applyStudentOffering();
  w.textareaInputDialog=async()=> 'Required to complete the final-term curriculum.';await w.saveStudentEnrollmentBatch();
  assert.ok(!page.read('studentEnrollments').some(item=>item.subjectCode==='SUB2'),'Admin overload attempt must not enroll the Student early');
  const request=page.read('approvalRequests').find(item=>item.type==='student-overload');assert.ok(request&&request.requesterRole==='admin'&&request.status==='pending','Admin routes overload enrollment to Dean approval');
  const conflict=w.AcademicWorkflowService.reviewAdminEnrollmentBatch('S1',[{id:'O-SUB3-A',subjectCode:'SUB3',sectionId:'A'}]);assert.ok(!conflict.canSave&&conflict.problems.some(item=>/current schedule/i.test(item)),'Admin save validation blocks schedule conflicts');
  page.w.close();console.log('✅ Admin routes overload enrollment to Dean after enrollment validation');
})().catch(error=>{console.error(error);process.exitCode=1});
