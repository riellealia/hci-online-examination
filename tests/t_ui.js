const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const today=new Date().toLocaleDateString('en-CA');

console.log('=== TT. Profile menu on every dashboard ===');
for(const [page,user,role,expectName,expectInitials] of [
  ['admin.html',{username:'admin',role:'admin'},'admin','Administrator','AD'],
  ['faculty.html',{username:'F1',role:'faculty'},'faculty','Maria Reyes','MR'],
  ['student.html',{username:'S1',role:'student'},'student','Juan Cruz','JC']]){
  const r=load(page,{...SEED(),currentUser:user});
  const av=r.d.getElementById('avatarBtn');
  const panel=r.d.getElementById('profilePanel');
  ok(!!av,`${page}: avatar button present`);
  ok(av && av.textContent.trim()===expectInitials,`${page}: initials "${av?av.textContent.trim():''}"`);
  ok(r.d.body.dataset.role===role,`${page}: role accent set (data-role="${role}")`);
  ok(panel && !panel.classList.contains('open'),`${page}: panel starts closed`);
  ok(r.d.querySelector('.profile-name')?.textContent.trim()===expectName,`${page}: shows "${expectName}"`);
  ok(!!r.d.querySelector('.avatar-lg'),`${page}: enlarged hero avatar present`);
  ok(!!r.d.getElementById('profileThemeBtn')&&!!r.d.getElementById('profileLogoutBtn'),`${page}: theme toggle + Log out present`);
  ok(!r.d.querySelector('.logout-btn'),`${page}: old duplicate logout button removed`);
  r.w.close();
}

console.log('\n=== UU. Panel opens, closes, and theme toggle works ===');
let r=load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}});
const av=r.d.getElementById('avatarBtn'), panel=r.d.getElementById('profilePanel');
av.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(panel.classList.contains('open'),'opens on click');
ok(av.getAttribute('aria-expanded')==='true','aria-expanded updated');
r.d.body.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(!panel.classList.contains('open'),'closes on click-away');
av.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
r.d.dispatchEvent(new r.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
ok(!panel.classList.contains('open'),'closes on Escape');
av.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
r.d.getElementById('profileThemeBtn').dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(r.d.documentElement.dataset.theme==='dark','theme toggle enables dark mode');
ok(/Light mode/.test(r.d.getElementById('profileThemeBtn').textContent),'toggle changes to the opposite mode label');
r.d.getElementById('profileThemeBtn').dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(r.d.documentElement.dataset.theme==='light','second toggle restores light mode');
r.w.close();
const darkReload=load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}},{raw:{'uiTheme:student:S1':'dark'}});
ok(darkReload.d.documentElement.dataset.theme==='dark'&&/Light mode/.test(darkReload.d.getElementById('profileThemeBtn').textContent),'dark preference persists across page loads');
darkReload.w.close();
const otherAccount=load('student.html',{...SEED(),currentUser:{username:'S2',role:'student'}},{raw:{'uiTheme:student:S1':'dark'}});
ok(otherAccount.d.documentElement.dataset.theme==='light','theme preference is isolated per account');
otherAccount.w.close();

console.log('\n=== VV. Transmuted grade shown to the student ===');
function submitWith(mcqCorrect){
  const s=SEED();
  s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Quiz',desc:'',date:today,start:'00:01',end:'23:59'}];
  // MCQ only, so nothing is left pending and the grade is final immediately.
  s.questions=[{id:'q1',examId:'e1',type:'mcq',text:'Q',points:20,
    options:[{text:'right',isCorrect:true},{text:'wrong',isCorrect:false}]}];
  const st=load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
  st.w.startExam('e1');
  st.d.querySelector(`input[name="q_q1"][value="${mcqCorrect?0:1}"]`).checked=true;
  st.w.reviewAnswers(); st.w.submitExamAnswers();
  return st;
}
let full=submitWith(true);
let box=full.d.getElementById('examResultSection').textContent;
console.log('    full marks ->',box.replace(/\s+/g,' ').match(/1\.00[^·]*·[^]*?Excellent/)?.[0]||'(chip missing)');
ok(/1\.00/.test(box),'20/20 gives rating 1.00');
ok(/100%/.test(box),'shows 100%');
let hist=full.d.querySelector('#resultsTable tbody').textContent;
ok(/1\.00/.test(hist)&&/Passed/.test(hist),'history shows 1.00 Passed');
full.w.close();

let zero=submitWith(false);
box=zero.d.getElementById('examResultSection').textContent;
ok(/5\.00/.test(box),'0/20 gives rating 5.00');
ok(/50%/.test(box),'floors at 50% (transmutation)');
hist=zero.d.querySelector('#resultsTable tbody').textContent;
ok(/Failed/.test(hist),'history shows Failed');
ok(/How grades are calculated/.test(zero.d.body.textContent),'scale reference available to student');
zero.w.close();

console.log('\n=== WW. Rating withheld until written answers are marked ===');
const s=SEED();
s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Mixed',desc:'',date:today,start:'00:01',end:'23:59'}];
let st=load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
st.w.startExam('e1');
st.d.querySelector('input[name="q_q1"]').checked=true;
st.d.querySelector('input[name="q_q1"]').dispatchEvent(new st.w.Event('change',{bubbles:true}));
st.w.goToQuestion(1);
st.d.querySelector('.short-ans-input[data-qid="q2"]').value='essay';
st.d.querySelector('.short-ans-input[data-qid="q2"]').dispatchEvent(new st.w.Event('input',{bubbles:true}));
st.w.reviewAnswers(); st.w.submitExamAnswers();
const pendingSub=st.read('studentSubmissions');
let row=st.d.querySelector('#resultsTable tbody').textContent;
ok(/Pending/.test(row),'rating shows Pending while unmarked');
ok(!/[1-5]\.00/.test(row.replace(/\d+ \/ \d+/,'')),'no rating number shown yet');
st.w.close();

console.log('\n--- after the lecturer marks it ---');
let fa=load('faculty.html',{...s,studentSubmissions:pendingSub,currentUser:{username:'F1',role:'faculty'}});
fa.w.viewResults('e1');
ok(/—/.test(fa.d.querySelector('.grade-chip').textContent),'faculty sees no rating while pending');
fa.w.openGrading(pendingSub[0].id);
fa.d.querySelector('.grade-mark').value='10';   // full marks on the essay
fa.w.saveGrading();
const done=fa.read('studentSubmissions')[0];
ok(done.score===20,'20/20 after marking');
ok(/1\.00/.test(fa.d.getElementById('examsView').textContent),'faculty results now show 1.00');
fa.w.close();

st=load('student.html',{...s,studentSubmissions:[done],currentUser:{username:'S1',role:'student'}});
row=st.d.querySelector('#resultsTable tbody').textContent;
ok(/1\.00/.test(row)&&/Passed/.test(row),'student now sees final 1.00 Passed');
ok(/100%/.test(row),'and the transmuted percentage');
st.w.close(); process.exit(0);
