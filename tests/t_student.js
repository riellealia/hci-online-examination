const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const stu=(seed)=>load('student.html',{...seed,currentUser:{username:'S1',role:'student'}});
const future=new Date(Date.now()+864e5).toISOString().split('T')[0];
const past='2020-01-01';
const today=new Date().toLocaleDateString('en-CA');

console.log('=== K. No fabricated enrolments ===');
let s=SEED(); s.allotments=[];           // student enrolled in nothing
let r=stu(s);
ok(r.d.getElementById('statSubjects').textContent==='0','shows 0 subjects (was showing 3 fake ones)');
ok(/No subjects enrolled/.test(r.d.querySelector('#subjectsTable tbody').textContent),'empty state shown');
ok(!/SUB2/.test(r.d.querySelector('#examTable tbody').textContent),'no unrelated exams leaked');
r.w.close();

console.log('\n=== K2. Enrolled subjects use cards ===');
s=SEED(); s.students.push({id:'S2',last:'Reyes',first:'Ana',sections:['A']}); s.studentEnrollments=[{studentId:'S1',subjectCode:'SUB1',sectionId:'A'},{studentId:'S2',subjectCode:'SUB1',sectionId:'A'}]; s.sectionSubjects=[{sectionId:'A',assignments:[{subjectCode:'SUB1',facultyId:'F1'}]}]; r=stu(s);
ok(r.d.querySelectorAll('#studentSubjectCards .enrolled-subject-card').length>0,'each enrolled subject is rendered as a card');
const studentCourseCard=r.d.querySelector('#studentSubjectCards .student-course-card');
ok(!!studentCourseCard.querySelector('.student-course-icon')&&!!studentCourseCard.querySelector('.student-course-arrow'),'Student subject card matches the Faculty course-card structure');
ok(/Prof\.|To be assigned/.test(studentCourseCard.querySelector('.student-course-professor')?.textContent||'')&&!/Section/i.test(studentCourseCard.querySelector('.student-course-meta')?.textContent||''),'card metadata shows the professor instead of the section');
ok(r.d.getElementById('subjectsTable').classList.contains('compat-table')||r.d.getElementById('subjectsTable').closest('.compat-table'),'the old subject table is not part of the visible interface');
r.d.querySelector('#studentSubjectCards .enrolled-subject-card').click();
ok(r.d.getElementById('subject-detail-panel').style.display==='block','clicking a subject card opens its subject page');
const subjectTabs=[...r.d.querySelectorAll('#studentSubjectDetail .subject-detail-tab')];
ok(subjectTabs.map(tab=>tab.textContent.trim()).join('|')==='Main|Class'&&subjectTabs[0].classList.contains('active'),'subject page opens with underlined Main and Class tabs below the hero');
ok(r.d.querySelectorAll('#studentSubjectDetail .subject-info-cell').length>=5,'subject page separates details, professor, rules, schedule, and exams into cells');
const subjectExamCell=r.d.querySelector('#studentSubjectDetail [data-open-exam]');
ok(!!subjectExamCell,'subject page renders examinations as shared interactive exam cells');
subjectExamCell.click();
ok(r.d.getElementById('takeExamModal').classList.contains('active')&&r.d.getElementById('examBriefing').style.display==='block','clicking a Subject examination opens the exam-details prompt');
r.w.closeExamModal();
ok(!r.d.querySelector('#sidebar [data-panel="subject-detail-panel"]'),'redundant Subject Details sidebar item is absent');
ok(/Handles:/.test(r.d.querySelector('#studentSubjectDetail').textContent),'professor listing identifies handled sections');
const classmate=r.d.querySelector('#studentSubjectDetail .classmate-row');
ok(!!classmate,'subject page lists classmates as clickable limited profiles');
ok(!classmate.closest('.student-subject-tab-panel').classList.contains('active'),'classmates are kept out of the Main tab');
subjectTabs[1].click();
ok(classmate.closest('.student-subject-tab-panel').classList.contains('active')&&!r.d.querySelector('[data-subject-tab-panel="main"]').classList.contains('active'),'Class tab shows classmates and hides Main cells');
classmate.click();
ok(/Limited public information/.test(r.d.getElementById('roleProfileOverlay').textContent)&&/private information are hidden/.test(r.d.querySelector('.role-profile-content').textContent)&&!r.d.querySelector('.role-profile-tabs'),'fellow-student profile hides academic and account details');
r.w.RoleProfileViewer.close();
const emailButton=r.d.querySelector('#studentSubjectDetail .professor-email');
ok(emailButton?.tagName==='BUTTON','professor listing provides an in-site email-composer icon');
emailButton.click();
ok(r.d.getElementById('emailComposerModal').style.display==='flex'&&/Prof\./.test(r.d.getElementById('emailComposerTo').value),'email icon opens a pre-addressed composer prompt');
r.d.getElementById('emailComposerMessage').value='May I ask about the next examination?';
ok(r.w.sendProfessorEmail()===true,'composer sends a completed email');
ok(JSON.parse(r.w.localStorage.getItem('studentEmails')||'[]').some(item=>item.studentId==='S1'&&item.facultyId),'sent email is saved with its student and professor');
ok(r.d.getElementById('emailComposerModal').style.display==='none','composer closes after sending');
r.w.close();

console.log('\n=== L. Exam window is enforced ===');
s=SEED(); s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Future',date:future,start:'08:00',end:'10:00'}];
r=stu(s);
ok(/Not yet open/.test(r.d.querySelector('#examTable tbody').textContent),'upcoming exam not launchable');
r.w.startExam('e1');
ok(/opens on/i.test(r.rec.alerts.join('|')),'direct call blocked, and says when it opens');
ok(r.d.getElementById('examQuestionsContainer').innerHTML==='','no paper was rendered');
r.w.close();

s=SEED(); s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Past',date:past,start:'08:00',end:'10:00'}];
r=stu(s);
ok(/Closed/.test(r.d.querySelector('#examTable tbody').textContent),'closed exam not launchable');
r.w.startExam('e1');
ok(/closed on/i.test(r.rec.alerts.join('|')),'direct call blocked, and says when it closed');
ok(r.d.getElementById('examQuestionsContainer').innerHTML==='','no paper was rendered');
r.w.close();

s=SEED(); s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Now',date:today,start:'00:01',end:'23:59'}];
r=stu(s);
ok(/Active \/ Open/.test(r.d.querySelector('#examTable tbody').textContent),'in-window exam IS open');
r.w.close();

console.log('\n=== M. Grading: written answers no longer auto-score full marks ===');
s=SEED(); s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Mixed',date:today,start:'00:01',end:'23:59'}];
r=stu(s);
r.w.startExam('e1');
r.d.querySelector('input[name="q_q1"]').checked=true;      // correct MCQ (10 pts)
r.d.querySelector('input[name="q_q1"]').dispatchEvent(new r.w.Event('change',{bubbles:true}));
r.w.goToQuestion(1);
r.d.querySelector('.short-ans-input[data-qid="q2"]').value='My essay response';
r.d.querySelector('.short-ans-input[data-qid="q2"]').dispatchEvent(new r.w.Event('input',{bubbles:true}));
r.w.submitExamAnswers();
const sub=r.read('studentSubmissions')[0];
console.log('    submission:',JSON.stringify({score:sub.score,total:sub.total,auto:sub.autoGradedTotal,pending:sub.pendingPoints}));
ok(sub.score===10,'MCQ scored 10');
ok(sub.pendingPoints===10,'essay held for manual grading (was auto-awarded 10)');
ok(sub.score!==sub.total,'score is no longer inflated to full marks');
ok(sub.autoGradedTotal===10,'auto-marked denominator excludes the essay');

console.log('\n=== N. Answers are actually stored (were discarded) ===');
ok(Array.isArray(sub.answers)&&sub.answers.length===2,'answers recorded');
const essay=sub.answers.find(a=>a.questionId==='q2');
ok(essay.response==='My essay response','essay text preserved for grading');
ok(essay.needsManualGrading===true,'flagged for manual grading');
const mcq=sub.answers.find(a=>a.questionId==='q1');
ok(mcq.selectedText==='A'&&mcq.isCorrect===true,'MCQ choice preserved');

console.log('\n=== O. Cannot resubmit the same exam ===');
r.w.startExam('e1');
ok(/used every allowed attempt/i.test(r.rec.alerts.join('|')),'resubmission blocked after the attempt limit');
r.w.close();
process.exit(0);
