const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
function fac(){
  const s=SEED();
  s.questions=[
    {id:'qA',examId:'e1',type:'mcq',text:'First',points:5,options:[{text:'a',isCorrect:true},{text:'b',isCorrect:false}]},
    {id:'qB',examId:'e1',type:'mcq',text:'Second',points:5,options:[{text:'c',isCorrect:true},{text:'d',isCorrect:false}]},
    {id:'qC',examId:'e1',type:'essay',text:'Third',points:20,expectedAnswer:'guide'},
    {id:'qZ',examId:'e2',type:'mcq',text:'OtherExam',points:5,options:[{text:'z',isCorrect:true},{text:'y',isCorrect:false}]}
  ];
  return load('faculty.html',{...s,currentUser:{username:'F1',role:'faculty'}});
}
const order=r=>r.read('questions').filter(q=>q.examId==='e1').map(q=>q.text);

console.log('=== BB. Question reordering (plan: Module 3) ===');
let r=fac();
r.w.manageQuestions('e1');
console.log('    initial:',order(r).join(' , '));
ok(order(r).join()==='First,Second,Third','baseline order');

r.w.moveQuestion('qC',-1);            // move Third up
console.log('    after Third ↑:',order(r).join(' , '));
ok(order(r).join()==='First,Third,Second','moved up correctly');

r.w.moveQuestion('qFirst_missing',-1);
ok(order(r).join()==='First,Third,Second','unknown id is a no-op');

r.w.moveQuestion('qFirst',-1);
r.w.moveQuestion('First',-1);
ok(order(r).join()==='First,Third,Second','still stable');

r.w.moveQuestion('qA',1);             // move First down
console.log('    after First ↓:',order(r).join(' , '));
ok(order(r).join()==='Third,First,Second','moved down correctly');

console.log('\n=== CC. Reorder cannot run off the ends or touch other exams ===');
r.w.moveQuestion('qC',-1);            // already first
ok(order(r).join()==='Third,First,Second','moving first up is a no-op');
r.w.moveQuestion('qB',1);             // already last
ok(order(r).join()==='Third,First,Second','moving last down is a no-op');
ok(r.read('questions').filter(q=>q.examId==='e2').map(q=>q.text).join()==='OtherExam',"other exam's questions untouched");
ok(r.read('questions').length===4,'no questions lost or duplicated');

console.log('\n=== DD. Reorder persists and renumbers the list ===');
const listed=[...r.d.querySelectorAll('.question-text')].map(e=>e.textContent.trim());
console.log('    rendered:',JSON.stringify(listed));
ok(/^Q1: Third/.test(listed[0])&&/^Q2: First/.test(listed[1]),'display renumbered after move');
const upBtns=[...r.d.querySelectorAll('.move-q-btn')];
ok(upBtns[0].disabled,'first question cannot move up (button disabled)');
ok(upBtns[upBtns.length-1].disabled,'last question cannot move down (button disabled)');
r.w.close();

console.log('\n=== EE. Exam preview ===');
r=fac();
r.w.manageQuestions('e1');
r.w.previewExam('e1');
ok(r.d.getElementById('previewModal').classList.contains('active'),'preview opens');
const body=r.d.getElementById('previewBody').textContent;
ok(/F1 Exam/.test(body),'exam title shown');
ok(/3 question\(s\)/.test(body)&&/30 point\(s\) total/.test(body),'question count + total points');
ok(/First/.test(body)&&/Second/.test(body)&&/Third/.test(body),'all questions rendered');
ok(/correct answer/.test(body),'answer key marked for proofing');
ok(/Marking guide: guide/.test(body),'written-question marking guide shown');
ok(r.d.querySelectorAll('.preview-opt.is-correct').length===2,'correct options highlighted');
r.w.closePreviewModal();
ok(!r.d.getElementById('previewModal').classList.contains('active'),'preview closes');

r.w.close(); process.exit(0);
