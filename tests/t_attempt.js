/* Pure-module tests for attempt state, with a stubbed DB. */
const fs=require('fs'),path=require('path');
let store={}; let failWrites=false;
global.DB={ read:(k,f)=>k in store?JSON.parse(JSON.stringify(store[k])):f,
            write:(k,v)=>{ if(failWrites) return false; store[k]=JSON.parse(JSON.stringify(v)); return true; } };
eval(fs.readFileSync(path.join(__dirname,'..','js','attempt.js'),'utf8'));
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const QS=[{id:'q1',type:'mcq'},{id:'q2',type:'essay'},{id:'q3',type:'mcq'}];

console.log('=== AAAA. A fresh attempt ===');
let a=loadAttempt('S1','e1');
ok(Object.keys(a.answers).length===0&&a.flags.length===0,'starts empty');
ok(a.currentIndex===0,'starts at the first question');
ok(resumableAttempt('S1','e1')===null,'nothing to resume yet');

console.log('\n=== BBBB. Answers survive a save and reload ===');
setAnswer(a,QS[0],2);
setAnswer(a,QS[1],'my essay');
a.startedAt=new Date().toISOString();
a.currentIndex=1;
ok(saveAttempt(a)===true,'saved');
let b=loadAttempt('S1','e1');
ok(getAnswer(b,'q1').selectedIndex===2,'MCQ choice restored');
ok(getAnswer(b,'q2').response==='my essay','written answer restored');
ok(b.currentIndex===1,'position restored');
ok(!!b.startedAt,'start time restored');
ok(!!resumableAttempt('S1','e1'),'now offers to resume');

console.log('\n=== CCCC. Answers are keyed by question id, not position ===');
const reordered=[QS[2],QS[0],QS[1]];
ok(getAnswer(b,'q1').selectedIndex===2,'q1 answer still belongs to q1 after reordering');
ok(isAnswered(b,reordered[1]),'reordered paper keeps the answer on the right question');

console.log('\n=== DDDD. Answered detection ===');
ok(isAnswered(b,QS[0])===true,'MCQ with a choice counts as answered');
ok(isAnswered(b,QS[2])===false,'untouched MCQ is unanswered');
let c=loadAttempt('S2','e1');
setAnswer(c,QS[1],'   ');
ok(isAnswered(c,QS[1])===false,'whitespace-only text is NOT an answer');
setAnswer(c,QS[0],0);
ok(isAnswered(c,QS[0])===true,'option 0 counts as answered (not falsy-dropped)');

console.log('\n=== EEEE. Flags ===');
ok(toggleFlag(b,'q3')===true,'flag on');
ok(isFlagged(b,'q3'),'reads back as flagged');
saveAttempt(b);
ok(isFlagged(loadAttempt('S1','e1'),'q3'),'flag survives reload');
ok(toggleFlag(b,'q3')===false,'flag off');
ok(!isFlagged(b,'q3'),'unflagged');

console.log('\n=== FFFF. Progress and navigator states ===');
const p=attemptProgress(b,QS);
ok(p.answered===2&&p.unanswered===1&&p.total===3,`${p.answered}/${p.total} answered, ${p.unanswered} left`);
toggleFlag(b,'q3');
const st=questionStates(b,QS,1);
ok(st[1].current===true&&st[0].current===false,'current question marked');
ok(st[0].answered&&st[0].status==='Answered','answered carries a word, not just colour');
ok(st[2].flagged&&st[2].status==='Flagged','flagged carries a word');
setAnswer(b,QS[2],1);
ok(questionStates(b,QS,0)[2].status==='Answered, flagged','answered AND flagged is distinguishable');

console.log('\n=== GGGG. A failed write must not destroy stored work ===');
failWrites=true;
const before=JSON.stringify(loadAttempt('S1','e1').answers);
const doomed=loadAttempt('S1','e1');
setAnswer(doomed,QS[2],9);
ok(saveAttempt(doomed)===false,'write failure is reported');
ok(JSON.stringify(loadAttempt('S1','e1').answers)===before,'previously saved answers are untouched');
failWrites=false;

console.log('\n=== HHHH. Corrupted attempt data is repaired, not discarded ===');
store['examAttempts']={'S3::e1':{studentId:'S3',examId:'e1',answers:{q1:{type:'mcq',selectedIndex:1}},
                              flags:'not-an-array',currentIndex:'nope',startedAt:'2026-01-01T00:00:00Z'}};
const r=loadAttempt('S3','e1');
ok(getAnswer(r,'q1').selectedIndex===1,'the good answer survived');
ok(Array.isArray(r.flags)&&r.flags.length===0,'bad flags repaired to an empty list');
ok(r.currentIndex===0,'bad position repaired to the first question');

console.log('\n=== IIII. Clearing after submission ===');
clearAttempt('S1','e1');
ok(resumableAttempt('S1','e1')===null,'nothing left to resume');
ok(Object.keys(loadAttempt('S1','e1').answers).length===0,'attempt is gone');
ok(!!loadAttempt('S3','e1').startedAt,'another student’s attempt is untouched');
