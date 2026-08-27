const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const adm=()=>load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});
(async()=>{

console.log('=== XX. alert() is gone; toasts replace it ===');
let r=adm();
ok(r.d.querySelectorAll('.toast').length===0,'no toast on a clean load');
r.d.getElementById('fID').value='F2';   // duplicate
r.d.getElementById('fLast').value='Dupe';
r.d.getElementById('fFirst').value='X';
r.w.saveItem('faculty');
const t=r.d.querySelector('.toast');
ok(!!t,'toast appears on a validation failure');
ok(t.classList.contains('toast-error'),'typed as an error');
ok(/already exists/.test(t.textContent),'carries the message');
ok(/Problem:/.test(t.textContent),'has a word, not just a colour (non-colour indicator)');
ok(!!t.querySelector('.toast-icon'),'has an icon');
ok(r.d.getElementById('toastHost').getAttribute('aria-live')==='polite','announced to screen readers');
ok(!!t.querySelector('.toast-close'),'can be dismissed');
t.querySelector('.toast-close').click();
await new Promise(s=>setTimeout(s,260));
ok(r.d.querySelectorAll('.toast').length===0,'dismiss removes it');

console.log('\n--- success toasts are distinguishable ---');
function upload(r,type,text){
  const f=new r.w.File([text],'x.csv',{type:'text/csv'});
  return new Promise(res=>{const o=r.w.showCSVModal;
    r.w.showCSVModal=function(){o.apply(this,arguments);res()};
    r.w.handleCSV(type,{files:[f],value:''});});
}
await upload(r,'faculty','F9,New,Y\n');
r.w.confirmUpload();
const st=[...r.d.querySelectorAll('.toast')].pop();
ok(st.classList.contains('toast-success'),'import reports success, not error');
ok(/Success:/.test(st.textContent),'labelled Success');
r.w.close();

console.log('\n=== YY. Designed confirmation dialog replaces confirm() ===');
r=adm();
const p=r.w.deleteItem('faculty',0);
await new Promise(s=>setTimeout(s,0));
const dlg=r.d.querySelector('.confirm-box');
ok(!!dlg,'dialog rendered');
ok(dlg.getAttribute('role')==='alertdialog','uses role=alertdialog');
ok(dlg.getAttribute('aria-modal')==='true','marked modal');
ok(/Delete faculty F1\?/.test(dlg.textContent),'names what is being deleted');
ok(/exam\(s\)/.test(dlg.textContent)&&/enrolment\(s\)/.test(dlg.textContent),'spells out the cascade');
ok(/cannot be undone/.test(dlg.textContent),'warns it is irreversible');
ok(r.d.getElementById('confirmYes').classList.contains('is-danger'),'destructive action styled as dangerous');
ok(r.d.activeElement===r.d.getElementById('confirmNo'),'focus starts on Cancel, not Delete');

console.log('\n--- cancelling really cancels ---');
r.d.getElementById('confirmNo').click();
await p;
ok(r.read('faculty').some(f=>f.id==='F1'),'record still present after Cancel');
ok(!r.d.querySelector('.confirm-box'),'dialog dismissed');

console.log('\n--- Escape cancels too ---');
const p2=r.w.deleteItem('faculty',0);
await new Promise(s=>setTimeout(s,0));
r.d.querySelector('.confirm-bg').dispatchEvent(new r.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
await p2;
ok(r.read('faculty').some(f=>f.id==='F1'),'Escape leaves the record alone');

console.log('\n--- confirming proceeds ---');
await r.confirmAll(()=>r.w.deleteItem('faculty',0));
ok(!r.read('faculty').some(f=>f.id==='F1'),'record deleted on confirm');
r.w.close();

console.log('\n=== ZZ. Accessible login error (plan: Foundation) ===');
const fs=require('fs'),{JSDOM,VirtualConsole}=require('jsdom');
const DIR=require('path').join(__dirname,'..','html')+'/';
const mem={users:JSON.stringify([{username:'admin',password:'admin123',role:'admin'}])};
const vc=new VirtualConsole(); vc.on('jsdomError',()=>{});
const dom=new JSDOM(fs.readFileSync(DIR+'login.html','utf8'),{
  runScripts:'dangerously',url:'http://localhost/login.html?role=admin',virtualConsole:vc,
  beforeParse(w){Object.defineProperty(w,'localStorage',{value:{
    getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}}});
    w.alert=()=>{ throw new Error('alert() should no longer be used on login'); };}});
const w=dom.window,d=dom.window.document;
const err=d.getElementById('authError');
ok(!!err,'error region exists');
ok(err.getAttribute('role')==='alert','role=alert');
ok(err.getAttribute('aria-live')==='assertive','aria-live=assertive');
ok(!err.classList.contains('show'),'hidden until needed');

const submit=()=>d.getElementById('loginForm').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
d.getElementById('username').value='';
d.getElementById('password').value='';
submit();
ok(err.classList.contains('show')&&/enter both/i.test(err.textContent),'empty form gives a specific message');

d.getElementById('username').value='admin';
d.getElementById('password').value='wrong';
submit();
ok(/do not match a admin account/i.test(err.textContent),'wrong password explained without leaking which field');
ok(d.getElementById('username').getAttribute('aria-invalid')==='true','fields marked invalid');

d.getElementById('password').dispatchEvent(new w.Event('input',{bubbles:true}));
ok(!err.classList.contains('show'),'error clears as soon as the user types');
ok(!d.getElementById('username').getAttribute('aria-invalid'),'aria-invalid cleared');

d.getElementById('password').value='admin123';
submit();
ok(JSON.parse(mem.currentUser||'null')?.role==='admin','correct credentials still log in');
process.exit(0);
})();
