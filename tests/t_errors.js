const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const adm=(o={})=>load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}},o);
const toasts=r=>[...r.d.querySelectorAll('.toast')].map(t=>t.textContent.replace(/\s+/g,' ').trim());
(async()=>{

console.log('=== EEE. Storage full: the save must NOT claim success ===');
let r=adm({quotaFull:true});
r.d.getElementById('subCode').value='NEW-1';
r.d.getElementById('subName').value='Test Subject';
r.w.saveItem('subjects');
const t=toasts(r);
console.log('    toasts:',JSON.stringify(t));
ok(t.some(x=>/Storage is full/.test(x)),'user is told storage is full');
ok(!t.some(x=>/added/i.test(x)&&/Success/.test(x)),'no false "added" success message');
ok(r.d.getElementById('subjectModal').style.display!=='none'
   ||!t.some(x=>/Success/.test(x)),'modal not closed as though it saved');
r.w.close();

console.log('\n=== FFF. Corrupted saved data is reported, not silently dropped ===');
// A corrupted 'subjects' value is read during page start-up.
r=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}},
       {raw:{subjects:'{not valid json'}});
ok(toasts(r).some(x=>/unreadable/.test(x)),'user is warned the data was unreadable');
ok(!/undefined|NaN/.test(r.d.getElementById('countSubjects').textContent),'page still renders with a safe fallback');
ok(r.d.getElementById('countSubjects').textContent==='0','count falls back to 0 rather than crashing');
r.w.close();

console.log('\n=== GGG. Storage blocked entirely (private mode) ===');
r=adm({blockReads:true});
ok(toasts(r).some(x=>/blocking local storage/.test(x)),'blocked storage is explained to the user');
ok(r.blocked,'and the dashboard refuses to open without a readable session');
r.w.close();

console.log('\n=== HHH. An uncaught failure surfaces as a toast ===');
r=adm();
ok(toasts(r).length===0,'no toast on a clean load');
r.w.dispatchEvent(Object.assign(new r.w.Event('error'),{message:'boom',error:new Error('boom')}));
await new Promise(s=>setTimeout(s,10));
ok(toasts(r).some(x=>/did not complete/.test(x)),'thrown error becomes a visible message');
ok(toasts(r).some(x=>/Nothing was changed/.test(x)),'and reassures nothing was changed');
r.w.close();

console.log('\n=== III. Repeated identical failures do not stack ===');
r=adm();
for(let i=0;i<5;i++){
  r.w.dispatchEvent(Object.assign(new r.w.Event('error'),{message:'same',error:new Error('same')}));
}
await new Promise(s=>setTimeout(s,10));
ok(toasts(r).length===1,`5 identical errors -> ${toasts(r).length} toast (not 5)`);
r.w.close();

console.log('\n=== JJJ. guard() turns a throw into a message ===');
r=adm();
const out2=r.w.guard('Saving the exam',()=>{ throw new Error('nope'); });
await new Promise(s=>setTimeout(s,10));
ok(out2===undefined,'guard returns undefined on failure');
ok(toasts(r).some(x=>/Saving the exam did not complete/.test(x)),'names the action that failed');
const good=r.w.guard('Doing a thing',()=>42);
ok(good===42,'guard passes through a successful result');
r.w.close();

console.log('\n=== KKK. Clicking a stale record responds instead of doing nothing ===');
r=adm();
r.w.editItem('faculty',999);          // index that does not exist
ok(toasts(r).some(x=>/no longer exists/.test(x)),'editing a missing record explains itself');
r.w.close();

r=adm();
await r.confirmAll(()=>r.w.deleteItem('faculty',999));
ok(toasts(r).some(x=>/no longer exists/.test(x)),'deleting a missing record explains itself');
r.w.close();

console.log('\n=== LLL. Faculty and student stale records respond too ===');
let f=load('faculty.html',{...SEED(),currentUser:{username:'F1',role:'faculty'}});
f.w.previewExam('does-not-exist');
ok(toasts(f).some(x=>/no longer exists/.test(x)),'faculty: previewing a missing exam responds');
f.w.viewResults('does-not-exist');
ok(toasts(f).some(x=>/no longer exists/.test(x)),'faculty: results for a missing exam responds');
f.w.close();

let s=load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}});
s.w.startExam('does-not-exist');
ok(toasts(s).some(x=>/no longer available/.test(x)),'student: starting a missing exam responds');
s.w.close();
process.exit(0);
})();
