const fs=require('fs'), {JSDOM,VirtualConsole}=require('jsdom');
const DIR=require('path').join(__dirname,'..','html')+'/';
const roleCss=fs.readFileSync(DIR+'../css/style.css','utf8');
const sharedCss=fs.readFileSync(DIR+'../css/shared-ui.css','utf8');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

ok(/\.btn\.admin\s*\{[^}]*--role-admin/.test(roleCss)&&/\.btn\.faculty\s*\{[^}]*--role-faculty/.test(roleCss)&&/\.btn\.student\s*\{[^}]*--role-student/.test(roleCss),'role picker and login buttons use the shared Admin, Faculty, and Student colors');
ok(/--role-admin:\s*#4A6FA5/.test(sharedCss)&&/--role-faculty:\s*#3A7D78/.test(sharedCss)&&/--role-student:\s*#487F53/.test(sharedCss),'shared role color variables match the three signed-in sites');

function openLogin(role,store={}){
  const mem={}; Object.entries(store).forEach(([k,v])=>mem[k]=JSON.stringify(v));
  const rec={alerts:[],nav:null};
  const vc=new VirtualConsole(); vc.on('jsdomError',()=>{});
  const dom=new JSDOM(fs.readFileSync(DIR+'login.html','utf8'),{
    runScripts:'dangerously', url:`http://localhost/login.html?role=${role}`, virtualConsole:vc,
    beforeParse(w){
      Object.defineProperty(w,'localStorage',{value:{
        getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}}});
      w.alert=m=>rec.alerts.push(String(m));
      w.HTMLFormElement.prototype.submit=()=>{};
    }});
  return {w:dom.window,d:dom.window.document,rec,read:k=>mem[k]?JSON.parse(mem[k]):null,
          submit(u,p){ this.d.getElementById('username').value=u;
                       this.d.getElementById('password').value=p;
                       this.d.getElementById('loginForm').dispatchEvent(
                         new this.w.Event('submit',{bubbles:true,cancelable:true})); }};
}

console.log('=== S. Credentials no longer exposed on screen ===');
let r=openLogin('admin');
const text=[...r.d.body.querySelectorAll('*')].filter(e=>e.tagName!=='SCRIPT').map(e=>e.childNodes).flatMap(n=>[...n]).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ');
ok(!/admin123|Reyes890|Cruz001/.test(text),'no passwords rendered anywhere on the page');
ok(!r.d.getElementById('credHint'),'credentials hint box gone');
ok(r.d.getElementById('username').value==='admin','Admin demo account is pre-filled');
ok(r.d.getElementById('password').value==='admin123','demo password is pre-filled in the masked field');

console.log('\n=== T. Clicking LOG IN on the blank form does nothing ===');
r.submit('','');
ok(r.read('currentUser')===null,'no session created from an empty form');

console.log('\n=== U. Wrong credentials rejected ===');
r=openLogin('admin');
r.submit('admin','wrongpassword');
ok(r.read('currentUser')===null,'bad password rejected');
ok(/do not match a admin account/i.test(r.d.getElementById('authError').textContent),'inline auth error shown');

console.log('\n=== V. Role cannot be crossed at login ===');
r=openLogin('admin');
r.submit('2024-00001','delacruz3'); // valid student creds on the admin form
ok(r.read('currentUser')===null,'student creds rejected on the admin login');

console.log('\n=== W. Correct credentials still work (typed, not pre-filled) ===');
r=openLogin('admin');
r.submit('admin','admin123');
let cu=r.read('currentUser');
ok(cu && cu.username==='admin' && cu.role==='admin','admin logs in');
ok(cu && cu.password===undefined,'session stores no password');

r=openLogin('faculty'); r.submit('12-34567-890','reyes0');
cu=r.read('currentUser');
ok(cu && cu.role==='faculty','faculty logs in with the seeded rule');

r=openLogin('student'); r.submit('2024-00001','delacruz3');
cu=r.read('currentUser');
ok(cu && cu.role==='student','student logs in with the seeded rule');
process.exit(0);
