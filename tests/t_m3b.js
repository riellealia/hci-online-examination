const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const today=new Date().toLocaleDateString('en-CA');

console.log('=== FF. Preview warns about an unanswerable question ===');
let s=SEED();
s.questions=[{id:'qA',examId:'e1',type:'mcq',text:'Broken',points:5,
              options:[{text:'a',isCorrect:false},{text:'b',isCorrect:false}]}];
let r=load('faculty.html',{...s,currentUser:{username:'F1',role:'faculty'}});
r.w.manageQuestions('e1'); r.w.previewExam('e1');
ok(/No correct answer is marked/.test(r.d.getElementById('previewBody').textContent),
   'flags an MCQ with no correct option');
r.w.close();

console.log('\n=== GG. Reordering actually changes what the student sees ===');
s=SEED();
s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Ordered',desc:'',date:today,start:'00:01',end:'23:59'}];
s.questions=[
  {id:'qA',examId:'e1',type:'mcq',text:'ALPHA',points:5,options:[{text:'a',isCorrect:true},{text:'b',isCorrect:false}]},
  {id:'qB',examId:'e1',type:'mcq',text:'BETA', points:5,options:[{text:'c',isCorrect:true},{text:'d',isCorrect:false}]}
];
// Faculty moves BETA to the top.
r=load('faculty.html',{...s,currentUser:{username:'F1',role:'faculty'}});
r.w.manageQuestions('e1');
r.w.moveQuestion('qB',-1);
const reordered=r.read('questions');
ok(reordered.filter(q=>q.examId==='e1')[0].text==='BETA','faculty moved BETA first');
r.w.close();

// Student opens the same exam and must see the new order.
const st=load('student.html',{...s,questions:reordered,currentUser:{username:'S1',role:'student'}});
st.w.startExam('e1');
let title=st.d.querySelector('#examQuestionsContainer .q-title').textContent.trim();
console.log('    student sees first:',JSON.stringify(title));
ok(title==='BETA','student sees BETA as Question 1');
st.w.goToQuestion(1);
title=st.d.querySelector('#examQuestionsContainer .q-title').textContent.trim();
ok(title==='ALPHA','student sees ALPHA as Question 2');
st.w.close(); process.exit(0);
