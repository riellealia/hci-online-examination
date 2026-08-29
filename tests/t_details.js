const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const today=new Date().toLocaleDateString('en-CA');
const toasts=r=>[...r.d.querySelectorAll('.toast-body')].map(t=>t.textContent.replace(/\s+/g,' ').trim());

function stu(examOverrides={}){
  const s=SEED();
  s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Midterm',
            desc:'Answer all questions.',date:today,start:'00:01',end:'23:59',
            durationMinutes:60,passingPercent:75,materials:'One A4 sheet',...examOverrides}];
  return load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
}
(async()=>{

console.log('=== UUU. Selecting an exam shows details, not the paper ===');
let r=stu();
ok(r.d.querySelectorAll('#overview-panel button.stat-card').length===3,'overview statistic cards are clickable navigation controls');
ok(r.d.querySelector('#examTable .exam-clickable-row')?.tabIndex===0,'an exam table row is clickable and keyboard accessible');
ok(r.d.querySelectorAll('#examSubjectCards .exam-list-row').length===1,'examinations use a compact list');
ok(/2 items/.test(r.d.querySelector('#examSubjectCards .exam-list-row').textContent),'list shows the actual number of questions');
const examTabs=[...r.d.querySelectorAll('#examFilterTabs .exam-filter-tab')];
ok(examTabs.map(tab=>tab.textContent.replace(/\d+/g,'').trim()).join('|')==='Overview|Done|Pending|Missed','examinations provide Overview, Done, Pending, and Missed tabs');
ok(examTabs.every(tab=>tab.querySelector('.exam-filter-count')),'every examination tab has a live count pill');
r.w.selectExamFilter('pending');
ok(r.d.querySelectorAll('#examSubjectCards .exam-list-row').length===1&&r.d.querySelector('.exam-filter-tab.active')?.textContent.includes('Pending'),'Pending filters the examination list and updates the active tab');
const examinationCell=r.d.querySelector('#examSubjectCards [data-open-exam]');
examinationCell.click();
ok(r.d.getElementById('takeExamModal').classList.contains('active'),'clicking a My Examinations cell opens the shared details dialog');
r.w.closeExamModal();
const calendarExam=r.d.querySelector('#examCalendar .calendar-exam');
ok(!!calendarExam,'the monthly calendar places the exam in its date cell');
calendarExam.click();
ok(r.d.getElementById('takeExamModal').classList.contains('active'),'clicking a calendar exam opens the shared details dialog');
ok(r.d.getElementById('takeExamModal').classList.contains('exam-page-shell'),'the examination opens as a dedicated full-page workspace');
ok(!!r.d.querySelector('#nextUp .nextup-date')&&!!r.d.querySelector('#nextUp .countdown[data-time]'),'Next up is grouped by date and includes a live countdown');
const brief=r.d.getElementById('examBriefing');
ok(brief.style.display==='block','briefing shown');
ok(r.d.getElementById('examQuestionsContainer').style.display==='none','paper NOT shown yet');
ok(r.d.getElementById('examTimer').style.display==='none','timer not running yet');
const bt=brief.textContent;
ok(/Answer all questions/.test(bt),'instructions shown');
ok(/One A4 sheet/.test(bt),'allowed materials shown');
ok(/2 question\(s\), 20 point\(s\)/.test(bt),'question count and total points');
ok(/75%/.test(bt),'passing grade shown');
ok(/1 hour/.test(bt),'attempt time limit shown');
ok(/0 of 1 used/.test(bt),'attempts shown');
const reusable=r.w.examBriefing({...r.read('exams')[0],date:'',start:'',end:'',maxAttempts:99,durationMinutes:0},{questions:r.read('questions'),attemptsUsed:1});
ok(reusable.canStart&&reusable.attemptsAllowed===99&&reusable.attemptsUsed===1&&reusable.closes===null,'no-deadline practice exam remains open and reports 99 attempts');
ok(/local time zone/.test(bt),'time zone disclosed');
ok(/Maria Reyes/.test(r.d.getElementById('modalExamMeta').textContent),'instructor named');
const acts=[...r.d.querySelectorAll('#examModalActions button')].map(b=>b.textContent.trim());
ok(acts.some(label=>label.includes('Start Exam')),'Start Exam offered');
ok(toasts(r).length===0,'nothing submitted or warned merely by looking');
r.w.close();

console.log('\n=== UUU1. Draft and repeat-attempt actions are explicit ===');
let draftSeed=SEED();
draftSeed.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Practice',date:'',start:'',end:'',durationMinutes:0,maxAttempts:99,scoreRelease:'immediate',answerRelease:'immediate',showSubmittedAnswers:true}];
draftSeed.examAttempts={'S1::e1':{studentId:'S1',examId:'e1',answers:{q1:{type:'mcq',selectedIndex:0}},currentIndex:0,flagged:[],startedAt:new Date().toISOString()}};
r=load('student.html',{...draftSeed,currentUser:{username:'S1',role:'student'}}); r.w.openExamDetails('e1');
ok(/Draft/.test(r.d.getElementById('examBriefing').textContent)&&/not submitted/.test(r.d.getElementById('examBriefing').textContent),'saved answers are identified as an unsubmitted draft');
ok(/Back/.test(r.d.getElementById('examModalActions').textContent)&&/Review Draft/.test(r.d.getElementById('examModalActions').textContent)&&/Resume Attempt/.test(r.d.getElementById('examModalActions').textContent),'draft offers Back, Review Draft, and Resume Attempt');
r.w.close();

draftSeed.examAttempts={}; draftSeed.studentSubmissions=[{id:'s1',studentId:'S1',examId:'e1',submittedAt:new Date().toISOString(),total:20,answers:[{questionId:'q1',awarded:10,needsManualGrading:false}]}];
r=load('student.html',{...draftSeed,currentUser:{username:'S1',role:'student'}}); r.w.openExamDetails('e1');
ok(/1 of 99 used/.test(r.d.getElementById('examBriefing').textContent)&&/10 \/ 20/.test(r.d.getElementById('examBriefing').textContent),'submitted practice attempt records its usage and latest score');
ok(/Back/.test(r.d.getElementById('examModalActions').textContent)&&/Review/.test(r.d.getElementById('examModalActions').textContent)&&/Attempt Again/.test(r.d.getElementById('examModalActions').textContent),'completed reusable exam offers Back, Review, and Attempt Again');
r.w.close();

console.log('\n=== UUU2. No-limit timer stays on one line ===');
r=stu({date:'',start:'',end:'',durationMinutes:0});
r.w.openExamDetails('e1'); r.w.beginAttempt('e1');
ok(r.d.getElementById('examTimer').classList.contains('no-limit'),'no-limit timer uses the compact one-line state');
r.w.close();

console.log('\n=== VVV. A disabled Start explains why ===');
const future=new Date(Date.now()+864e5).toISOString().split('T')[0];
r=stu({date:future,start:'08:00',end:'10:00'});
r.w.openExamDetails('e1');
const startBtn=[...r.d.querySelectorAll('#examModalActions button')].find(b=>/Start Exam/.test(b.textContent));
ok(startBtn.disabled,'Start is disabled before the window opens');
ok(/opens on/i.test(startBtn.getAttribute('title')||''),'the button itself says why');
ok(/opens on/i.test(r.d.querySelector('.brief-blocked').textContent),'and the reason is shown in the panel');
r.w.close();

console.log('\n=== WWW. Starting the attempt runs the timer ===');
r=stu();
r.w.openExamDetails('e1');
r.w.beginAttempt('e1');
ok(r.d.getElementById('examBriefing').style.display==='none','briefing hidden once started');
ok(r.d.getElementById('examQuestionsContainer').style.display==='block','paper now shown');
const timer=r.d.getElementById('examTimer');
ok(timer.style.display==='flex','timer visible');
ok(/attempt/i.test(r.d.getElementById('timerLabel').textContent),
   `labelled "${r.d.getElementById('timerLabel').textContent}"`);
ok(/^\d+:\d\d/.test(r.d.getElementById('timerClock').textContent),
   `counting: ${r.d.getElementById('timerClock').textContent}`);
r.w.close();

console.log('\n=== XXX. Timer labels the DEADLINE when that comes first ===');
// A 600-minute allowance inside a window that closes today at 23:59.
const now=new Date();
const soon=new Date(now.getTime()+4*60000);
const hhmm=d=>String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
r=stu({start:'00:01',end:hhmm(soon),durationMinutes:600});
r.w.openExamDetails('e1'); r.w.beginAttempt('e1');
ok(/closes/i.test(r.d.getElementById('timerLabel').textContent),
   `labelled "${r.d.getElementById('timerLabel').textContent}" because the deadline wins`);
r.w.close();

console.log('\n=== YYY. Autosubmit when the effective end passes ===');
// Start a real attempt inside a valid window so the paper is loaded,
// then run the timer against a schedule whose deadline has already passed.
r=stu();
r.w.openExamDetails('e1');
r.w.beginAttempt('e1');
const expired={...r.read('exams')[0], end:hhmm(new Date(Date.now()-60000)), durationMinutes:0};
r.w.startAttemptTimer(expired);
await new Promise(s=>setTimeout(s,80));
const subs=r.read('studentSubmissions')||[];
ok(subs.length===1,'the attempt was submitted automatically');
ok(subs[0].submittedBy==='timeout','recorded as a timeout, not a manual submit');
ok(!!subs[0].timeoutReason,`reason recorded: ${subs[0].timeoutReason}`);
ok(toasts(r).some(x=>/submitted automatically/.test(x)),'and the student is told why');
ok(r.d.getElementById('examTimer').style.display==='none','timer stopped after submitting');
r.w.close();

console.log('\n=== ZZZ. A manual submit is recorded as the student’s own ===');
r=stu();
r.w.openExamDetails('e1'); r.w.beginAttempt('e1');
r.d.querySelector('input[name="q_q1"]').checked=true;
r.d.querySelector('input[name="q_q1"]').dispatchEvent(new r.w.Event('change',{bubbles:true}));
r.w.goToQuestion(1);
r.d.querySelector('.short-ans-input[data-qid="q2"]').value='essay';
r.d.querySelector('.short-ans-input[data-qid="q2"]').dispatchEvent(new r.w.Event('input',{bubbles:true}));
r.w.reviewAnswers();
await r.w.submitExamAnswers();
const s2=r.read('studentSubmissions');
ok(s2.length===1&&s2[0].submittedBy==='student','submittedBy = student');
ok(s2[0].timeoutReason===null,'no timeout reason');
ok(!!s2[0].startedAt,'attempt start time recorded');
ok(r.d.getElementById('examTimer').style.display==='none','timer stopped on manual submit');
r.w.close();
process.exit(0);
})();
