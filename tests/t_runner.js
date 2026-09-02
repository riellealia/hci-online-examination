const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const today=new Date().toLocaleDateString('en-CA');

function seed(extra={}){
  const s=SEED();
  s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Paged Exam',
    desc:'Work carefully.',date:today,start:'00:01',end:'23:59'}];
  return {...s,...extra,currentUser:{username:'S1',role:'student'}};
}

console.log('=== RUNNER. One-question navigation and durable attempt state ===');
let r=load('student.html',seed());
r.w.startExam('e1');
ok(r.d.querySelectorAll('#examQuestionsContainer .q-item').length===1,'only one question is rendered');
ok(/Question 1 of 2/.test(r.d.getElementById('examProgress').textContent),'progress identifies position');
ok(r.d.getElementById('prevQ').disabled,'Previous disabled on first question');
ok(!r.d.getElementById('nextQ').disabled,'Next available on first question');

const first=r.d.querySelector('input[name="q_q1"][value="0"]');
first.checked=true;
first.dispatchEvent(new r.w.Event('change',{bubbles:true}));
ok(/1 answered/.test(r.d.getElementById('examProgress').textContent),'answer updates progress');
ok(r.d.querySelector('.nav-cell[data-index="0"]').classList.contains('is-answered'),'navigator marks answered with a class');
ok(/Answered/.test(r.d.querySelector('.nav-cell[data-index="0"]').getAttribute('aria-label')),'navigator has a non-colour status');

r.d.getElementById('flagQ').click();
ok(r.d.getElementById('flagQ').getAttribute('aria-pressed')==='true','flag button exposes pressed state');
ok(/Unflag/.test(r.d.getElementById('flagQ').textContent),'flag control shows its icon and visible action name');
ok(r.d.getElementById('flagQ').nextElementSibling?.classList.contains('report-question-btn')&&/Report/.test(r.d.getElementById('flagQ').nextElementSibling.textContent),'flag and report actions both show icons and names');
ok(r.d.querySelectorAll('.q-nav button').length===2,'question footer contains only uniform Previous and Next controls');
ok(/Save & Submit Exam/.test(r.d.getElementById('examModalActions').textContent)&&!/Save Draft & Exit/.test(r.d.getElementById('examModalActions').textContent),'attempt footer uses one Save & Submit action instead of a competing draft-exit button');
r.d.querySelector('#takeExamModal .exam-close').click();
ok(/Save draft and leave/.test(r.d.querySelector('.confirm-box')?.textContent||''),'leaving an active attempt opens the Save Draft and Exit confirmation');
r.d.querySelector('.confirm-box .confirm-cancel').click();
r.w.placeNavigatorHandle(120,90,false);
ok(r.d.getElementById('examNavigator').classList.contains('is-positioned')&&r.d.getElementById('examNavigator').style.left==='120px'&&r.d.getElementById('examNavigator').style.top==='90px','question navigator handle can be repositioned');
r.w.toggleNavigator();
const studentNavPanel=r.d.getElementById('questionNavPanel'),studentPanelLeft=parseFloat(studentNavPanel.style.left),studentPanelTop=parseFloat(studentNavPanel.style.top);
ok(studentPanelLeft>=8&&studentPanelTop>=8&&studentPanelLeft+Math.min(300,r.w.innerWidth-36)<=r.w.innerWidth-8,'Student question panel opens beside the dragged handle without leaving the viewport');
r.w.closeNavigator();
ok(/flagged/i.test(r.d.querySelector('.nav-cell[data-index="0"]').getAttribute('aria-label')),'navigator announces flag');

r.w.goToQuestion(1);
ok(/Question 2 of 2/.test(r.d.getElementById('examProgress').textContent),'Next moves to question 2');
ok(r.d.querySelector('.q-title').textContent==='Essay Q','second question content shown');
ok(!r.d.getElementById('nextQ').disabled&&/Review.*Submit/.test(r.d.getElementById('nextQ').textContent),'last-question Next becomes an enabled Review & Submit action');
const essay=r.d.querySelector('.short-ans-input[data-qid="q2"]');
essay.value='Recovered essay';
essay.dispatchEvent(new r.w.Event('input',{bubbles:true}));
r.d.getElementById('nextQ').click();
ok(r.d.getElementById('examReviewSection').style.display==='block'&&/2 of 2/.test(r.d.getElementById('examReviewSection').textContent),'last-question action opens the completeness review instead of exiting');
ok((r.read('studentSubmissions')||[]).length===0,'opening the completeness review does not submit immediately');
r.w.backToQuestions();
r.w.closeExamModal();

const attempts=r.read('examAttempts');
ok(attempts['S1::e1'].answers.q1.selectedIndex===0,'MCQ saved by question id');
ok(attempts['S1::e1'].answers.q2.response==='Recovered essay','essay saved on exit');
ok(attempts['S1::e1'].currentIndex===1,'position saved on exit');
ok(attempts['S1::e1'].flags.includes('q1'),'flag saved on exit');
r.w.close();

console.log('\n=== RESUME. Refresh restores position, answers, and flags ===');
r=load('student.html',seed({examAttempts:attempts}));
r.w.openExamDetails('e1');
ok([...r.d.querySelectorAll('#examModalActions button')].some(b=>/Resume Attempt/.test(b.textContent)),'briefing offers Resume Attempt');
r.w.beginAttempt('e1');
ok(/Question 2 of 2/.test(r.d.getElementById('examProgress').textContent),'resume restores question position');
ok(r.d.querySelector('.short-ans-input').value==='Recovered essay','resume restores written answer');
r.w.goToQuestion(0);
ok(r.d.querySelector('input[name="q_q1"][value="0"]').checked,'resume restores MCQ choice');
ok(r.d.getElementById('flagQ').getAttribute('aria-pressed')==='true','resume restores flag');

r.w.reviewAnswers();
ok(/2 of 2/.test(r.d.getElementById('examReviewSection').textContent),'review reads persisted answers');
ok(/Flagged/.test(r.d.getElementById('examReviewSection').textContent),'review includes flagged state');
r.w.submitExamAnswers();
ok((r.read('studentSubmissions')||[]).length===1,'final submission recorded once');
ok(!r.read('examAttempts')?.['S1::e1'],'draft attempt cleared only after successful submission');
ok(r.d.getElementById('review-detail-panel').style.display==='block'&&!r.d.getElementById('takeExamModal').classList.contains('active'),'successful submission automatically opens the score and review page');
ok(/Submission recorded/.test(r.d.getElementById('studentReviewFeedback').textContent),'result page confirms the recorded submission and score state');
ok(!!r.d.querySelector('.review-result-summary')&&!r.d.querySelector('#studentReviewFeedback .score-box'),'review uses a compact transparent result summary instead of the large score cell');
r.w.close();

console.log('\n=== FACULTY SETTINGS. Presentation and navigation are persisted ===');
let facultySeed=SEED();
let f=load('faculty.html',{...facultySeed,currentUser:{username:'F1',role:'faculty'}});
f.w.openExamModal('SUB1');
f.d.getElementById('examTitle').value='Configured exam';
f.d.getElementById('examDate').value=today;
f.d.getElementById('examStart').value='00:01';
f.d.getElementById('examEnd').value='23:59';
f.d.getElementById('examQuestionLayout').value='all';
f.d.getElementById('examNavigationMode').value='sequential';
f.w.saveExam();
const configured=f.read('exams').find(e=>e.title==='Configured exam');
ok(configured.questionLayout==='all','Faculty saves all-questions layout');
ok(configured.navigationMode==='sequential','Faculty saves navigation mode');
f.w.editExam(configured.id);
ok(f.d.getElementById('examQuestionLayout').value==='all','layout restored when editing');
ok(f.d.getElementById('examNavigationMode').value==='sequential','navigation mode restored when editing');
f.w.close();

console.log('\n=== MODES. All-page, sequential, and forward-only are enforced ===');
let modeSeed=seed();
modeSeed.exams[0].questionLayout='all';
r=load('student.html',modeSeed);
r.w.startExam('e1');
ok(r.d.querySelectorAll('#examQuestionsContainer .q-item').length===2,'all-page mode renders the complete paper');
ok(r.d.getElementById('examNavigator').style.display==='none','all-page mode hides question navigator');
r.w.close();

modeSeed=seed();
modeSeed.questions.push({id:'q3',examId:'e1',type:'mcq',text:'Last',points:5,
  options:[{text:'Yes',isCorrect:true},{text:'No',isCorrect:false}]});
modeSeed.exams[0].navigationMode='sequential';
r=load('student.html',modeSeed);
r.w.startExam('e1');
ok(r.d.querySelector('.nav-cell[data-index="2"]').disabled,'sequential mode locks questions that would be skipped');
r.w.goToQuestion(1);
ok(!r.d.querySelector('.nav-cell[data-index="2"]').disabled,'visiting the next question unlocks the following one');
r.w.close();

modeSeed=seed();
modeSeed.exams[0].navigationMode='forward';
r=load('student.html',modeSeed);
r.w.startExam('e1');
r.d.querySelector('input[name="q_q1"]').checked=true;
r.d.querySelector('input[name="q_q1"]').dispatchEvent(new r.w.Event('change',{bubbles:true}));
r.w.goToQuestion(1);
ok(r.d.getElementById('prevQ').disabled,'forward-only mode disables Previous');
ok(r.d.querySelector('.nav-cell[data-index="0"]').disabled,'forward-only navigator cannot reopen an earlier question');
r.w.goToQuestion(0);
ok(/Question 2 of 2/.test(r.d.getElementById('examProgress').textContent),'direct backward navigation is also blocked');
r.w.close();
process.exit(0);
