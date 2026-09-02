const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const today=new Date().toLocaleDateString('en-CA');
function stu(){
  const s=SEED();
  s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Mixed Exam',desc:'Answer carefully.',date:today,start:'00:01',end:'23:59'}];
  return load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
}
console.log('=== X. Schedule + total points shown (plan: Module 4) ===');
let r=stu();
r.w.startExam('e1');
const meta=r.d.getElementById('modalExamMeta').textContent;
console.log('    meta:',meta.trim());
ok(/2 question\(s\)/.test(meta),'question count shown');
ok(/20 point\(s\) total/.test(meta),'total points shown');
ok(/00:01 to 23:59/.test(meta),'schedule shown');

console.log('\n=== Y. Review step lists answers and flags blanks ===');
r.d.querySelector('input[name="q_q1"]').checked=true;   // answer MCQ only
r.d.querySelector('input[name="q_q1"]').dispatchEvent(new r.w.Event('change',{bubbles:true}));
r.w.reviewAnswers();
const rev=r.d.getElementById('examReviewSection');
ok(rev.style.display==='block','review screen shown');
ok(r.d.getElementById('examQuestionsContainer').style.display==='none','question view hidden');
ok(/1 of 2/.test(rev.textContent),'answered count correct');
ok(/1 unanswered/.test(rev.textContent),'unanswered count flagged');
ok(/cannot be undone/.test(rev.textContent),'final-submission warning present');
ok(rev.querySelectorAll('.review-item.unanswered').length===1,'blank question visually marked');
ok(/Not answered/.test(rev.querySelector('.review-item.unanswered').textContent),'non-colour indicator (text tag) present');
const answered=[...rev.querySelectorAll('.review-item')].find(x=>!x.classList.contains('unanswered'));
ok(/A/.test(answered.querySelector('.review-a').textContent),'chosen MCQ option echoed back');
rev.querySelector('.review-item.unanswered').click();
ok(r.d.getElementById('examQuestionsContainer').style.display==='block'&&/Question 2 of 2/.test(r.d.getElementById('examProgress').textContent),'clicking a review cell returns directly to that question');
r.w.reviewAnswers();

console.log('\n=== Z. Back to questions preserves answers ===');
r.w.backToQuestions();
ok(r.d.getElementById('examQuestionsContainer').style.display==='block','returned to questions');
r.w.goToQuestion(0);
ok(r.d.querySelector('input[name="q_q1"]').checked===true,'MCQ answer preserved');
r.w.goToQuestion(1);
r.d.querySelector('.short-ans-input[data-qid="q2"]').value='Now answered';
r.d.querySelector('.short-ans-input[data-qid="q2"]').dispatchEvent(new r.w.Event('input',{bubbles:true}));
r.w.reviewAnswers();
ok(/2 of 2/.test(r.d.getElementById('examReviewSection').textContent),'newly typed answer picked up');
ok(r.d.getElementById('examReviewSection').querySelectorAll('.review-item.unanswered').length===0,'no blanks left');

console.log('\n=== AA. Submit only happens from the confirm button ===');
const btns=[...r.d.querySelectorAll('#examModalActions button')].map(b=>b.textContent.trim());
console.log('    buttons:',JSON.stringify(btns));
ok(btns.some(b=>/Confirm & Submit Final/.test(b)),'explicit final confirmation button');
ok(r.read('studentSubmissions').length===0,'nothing submitted just by reviewing');
r.w.submitExamAnswers();
ok(r.read('studentSubmissions').length===1,'submitted on confirm');
const sub=r.read('studentSubmissions')[0];
ok(sub.answers.find(a=>a.questionId==='q2').response==='Now answered','typed answer stored');
ok(r.d.getElementById('examReviewSection').style.display==='none','review screen cleared after submit');
r.w.close(); process.exit(0);
