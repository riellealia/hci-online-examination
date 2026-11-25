const {load,SEED}=require('./harness');
const ok=(condition,message)=>{if(!condition)throw new Error(message);console.log(`  ✅ ${message}`)};

console.log('=== STUDENT RESULTS ANALYTICS ===');
const seed=SEED();
seed.studentEnrollments=[{studentId:'S1',subjectCode:'SUB1',sectionId:'A'}];
seed.exams=[{id:'R1',facultyId:'F1',subjectCode:'SUB1',title:'Analytics Midterm',date:'2026-10-01',start:'09:00',end:'10:00',status:'published',showScore:true}];
seed.studentSubmissions=[
  {id:'SR0',studentId:'S1',examId:'R1',submittedAt:'2026-09-30T10:00:00+08:00',total:20,answers:[{questionId:'Q1',awarded:5,points:10},{questionId:'Q2',awarded:0,points:10}]},
  {id:'SR1',studentId:'S1',examId:'R1',submittedAt:'2026-10-01T10:00:00+08:00',total:20,answers:[{questionId:'Q1',awarded:10,points:10},{questionId:'Q2',awarded:5,points:10}]}
];
const page=load('student.html',{...seed,currentUser:{username:'S1',role:'student'}});

ok(page.d.getElementById('resultAccuracy').textContent==='75%','Accuracy uses earned points divided by total points');
ok(page.d.getElementById('resultTotalPoints').textContent==='15','Total points shows cumulative earned points');
ok(page.d.getElementById('resultGwa').textContent==='1.75','GWA averages final examination ratings');
ok(!!page.d.querySelector('#resultsScoreChart .result-total-line')&&!!page.d.querySelector('#resultsScoreChart .result-score-line'),'general graph compares total score with the student score by subject');
ok(/SUB1 total: 20/.test(page.d.getElementById('resultsScoreChart').textContent)&&/SUB1 your score: 15/.test(page.d.getElementById('resultsScoreChart').textContent),'subject graph values use the latest examination attempt proportionally');
ok(page.d.querySelectorAll('#resultSubjectCards .result-exam-disclosure').length===2,'Results retains every submitted attempt so retake data is not lost');
ok(page.d.querySelectorAll('#resultsScoreChart .chart-point').length===2,'analytics stay proportional with one total and one earned point for the subject');
ok(page.d.querySelectorAll('.result-subject-column-head span').length===5&&/15 \/ 20/.test(page.d.querySelector('.result-subject-summary').textContent),'subject rows expose Subject, Points, Grade, Rating, and Status columns');
ok(page.d.querySelector('.results-controls-row')?.lastElementChild?.id==='studentResultTools','Results keeps its action icons on the right');
ok(!!page.d.querySelector('#results-panel .student-page-heading'),'Results follows the Examinations page hierarchy');
page.d.querySelector('.result-gwa-button').click();
ok(/examination-based estimate/.test([...page.d.querySelectorAll('.toast-body')].at(-1)?.textContent||''),'clicking GWA explains why it may differ from the official final grade');
page.w.close();
const missed = load('student.html', {
  ...seed,
  exams: [...seed.exams,
    {...seed.exams[0], id:'MISSED', date:'2020-01-01'},
    {...seed.exams[0], id:'OPEN', date:''},
    {...seed.exams[0], id:'FUTURE', date:'2999-01-01'},
    {...seed.exams[0], id:'DRAFT', date:'2020-01-01', status:'draft'},
    {...seed.exams[0], id:'OTHER-SECTION', date:'2020-01-01', sections:['OTHER']}
  ],
  currentUser:{username:'S1',role:'student'}
});
ok(missed.d.getElementById('resultGwa').textContent==='3.38','GWA includes a missed eligible exam as 5.00 and excludes unassigned, draft, open, and upcoming exams');
missed.w.close();
