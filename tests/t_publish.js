const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const today=new Date().toLocaleDateString('en-CA');

(async()=>{
console.log('=== PUBLISH REVIEW. Draft validation to Student visibility ===');
let s=SEED();
const draft={id:'draft1',facultyId:'F1',subjectCode:'SUB1',title:'Draft Quiz',desc:'',date:today,start:'00:01',end:'23:59',status:'draft'};
s.exams=[...s.exams,draft];
let r=load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
ok(!/Draft Quiz/.test(r.d.querySelector('#examTable tbody').textContent),'draft exam is hidden from students');
r.w.close();

r=load('faculty.html',{...s,currentUser:{username:'F1',role:'faculty'}});
r.w.manageQuestions('draft1');
ok(r.d.getElementById('publishExamBtn').getAttribute('aria-label')==='Review and publish examination','draft offers an accessible review and publish action');
ok(await r.w.reviewAndPublishExam('draft1')===false,'empty exam cannot be published');
ok(r.read('exams').find(ex=>ex.id==='draft1').status==='draft','validation failure preserves draft status');
const validQuestion={id:'dq1',examId:'draft1',type:'mcq',text:'Ready?',points:5,options:[{text:'Yes',isCorrect:true},{text:'No',isCorrect:false}]};
r.w.close();
s.questions.push(validQuestion);
r=load('faculty.html',{...s,currentUser:{username:'F1',role:'faculty'}});
r.w.manageQuestions('draft1');
let publishing=r.w.reviewAndPublishExam('draft1');
ok(r.d.getElementById('previewModal').classList.contains('active'),'student preview opens before publication confirmation');
ok(/1 question.*5 point/.test(r.d.getElementById('confirmMsg').textContent),'impact summary states question and point totals');
r.d.getElementById('confirmNo').click();
ok(await publishing===false && r.read('exams').find(ex=>ex.id==='draft1').status==='draft','cancel keeps exam as draft');
publishing=r.w.reviewAndPublishExam('draft1');
r.d.getElementById('confirmYes').click();
ok(await publishing===true && r.read('exams').find(ex=>ex.id==='draft1').status==='published','confirmed valid exam is published');
r.w.close();

s.exams=s.exams.map(ex=>ex.id==='draft1'?{...ex,status:'published'}:ex);
r=load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
ok(/Draft Quiz/.test(r.d.querySelector('#examTable tbody').textContent),'published exam becomes visible to enrolled students');
r.w.close();
process.exit(0);
})();
