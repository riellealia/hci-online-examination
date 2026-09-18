const fs=require('fs'), {JSDOM,VirtualConsole}=require('jsdom');
const DIR=require('path').join(__dirname,'..','html')+'/';
const roleCss=fs.readFileSync(DIR+'../css/style.css','utf8');
const sharedCss=fs.readFileSync(DIR+'../css/shared-ui.css','utf8');
const indexHtml=fs.readFileSync(DIR+'index.html','utf8');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);

ok(!/role-buttons|goToLogin\s*\(/.test(indexHtml),'landing page no longer offers role-selection controls');
ok(/login\.html/.test(indexHtml),'landing page opens the shared sign-in page');
ok(/\.btn\.admin\s*\{[^}]*--role-admin/.test(roleCss),'shared login button keeps the existing Admin-blue treatment');
ok(/--role-admin:\s*#4A6FA5/.test(sharedCss)&&/--role-faculty:\s*#3A7D78/.test(sharedCss)&&/--role-student:\s*#487F53/.test(sharedCss),'shared role colors remain available to signed-in workspaces');

function openLogin(store={}){
  const mem={}; Object.entries(store).forEach(([k,v])=>mem[k]=JSON.stringify(v));
  const rec={alerts:[]};
  const vc=new VirtualConsole(); vc.on('jsdomError',()=>{});
  const dom=new JSDOM(fs.readFileSync(DIR+'login.html','utf8'),{
    runScripts:'dangerously', url:'http://localhost/login.html', virtualConsole:vc,
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

console.log('=== S. One shared login form ===');
let r=openLogin();
ok(!r.d.getElementById('roleLink')&&!r.d.querySelector('.role-buttons'),'login has no role picker or role-switch link');
ok(r.d.getElementById('username')&&r.d.getElementById('password')&&r.d.getElementById('loginBtn'),'username, password, and login controls open immediately');
ok(!r.d.querySelector('[data-provider],.social-login,.oauth-login'),'login has no third-party provider controls');
const text=[...r.d.body.querySelectorAll('*')].filter(e=>e.tagName!=='SCRIPT').map(e=>e.childNodes).flatMap(n=>[...n]).filter(n=>n.nodeType===3).map(n=>n.textContent).join(' ');
ok(!/admin123|Reyes890|Cruz001/.test(text),'no passwords rendered as visible page text');
ok(!r.d.getElementById('credHint'),'credentials hint box remains absent');
ok(r.d.getElementById('username').value==='admin','default demo account is pre-filled');
ok(r.d.getElementById('password').value==='admin123','demo password is pre-filled in the masked field');
const professorDemoButton=r.d.querySelector('[data-demo-account="professor"]');
professorDemoButton.click();
ok(r.d.getElementById('username').value==='2025-00002'&&r.d.getElementById('password').value==='santos2025','Professor demo control fills credentials without selecting a login role');
const demoCases=[['dean','dean.demo','dean123'],['coordinator','coordinator.demo','coord123'],['student','23-32534-345','reyes23']];
demoCases.forEach(([key,username,password])=>{r.d.querySelector(`[data-demo-account="${key}"]`).click();ok(r.d.getElementById('username').value===username&&r.d.getElementById('password').value===password,`${key} demo control fills its credentials`);});
const adminDemoButton=r.d.querySelector('[data-demo-account="admin"]');
adminDemoButton.click();
ok(r.d.getElementById('username').value==='admin'&&r.d.getElementById('password').value==='admin123','Admin demo control restores the Admin credentials');
const savedMenu=r.d.getElementById('savedAccountsMenu'),usernameField=r.d.getElementById('username');
usernameField.blur();usernameField.focus();
ok(!savedMenu.hidden&&usernameField.getAttribute('aria-expanded')==='true','saved demo accounts open directly below the focused username field');

const forgotButton=r.d.getElementById('forgotPassword'),resetDialog=r.d.getElementById('passwordResetDialog');
forgotButton.click();
ok(!resetDialog.hidden&&r.d.getElementById('resetUsername').value==='admin','forgot-password dialog opens with the typed username');
r.d.getElementById('resetEmail').value='admin@neu.edu.ph';
r.d.getElementById('resetHumanCheck').checked=true;
r.d.getElementById('sendVerificationCode').click();
ok(/^\d{6}$/.test(r.d.getElementById('resetVerificationCode').value),'prototype verification code is generated and filled automatically');
r.d.getElementById('verifyResetCode').click();
r.d.getElementById('newPassword').value='changed88';
r.d.getElementById('confirmNewPassword').value='changed88';
r.d.getElementById('passwordResetForm').dispatchEvent(new r.w.Event('submit',{bubbles:true,cancelable:true}));
ok((r.read('passwordResetRequests')||[]).some(request=>request.username==='admin'&&request.status==='completed'&&request.verificationStatus==='verified'),'verified password change is recorded for future Admin review');
ok((r.read('users')||[]).some(user=>user.username==='admin'&&user.password==='changed88'),'verified account password is changed');
r.d.getElementById('closePasswordReset').click();
ok(resetDialog.hidden,'password-reset dialog closes without leaving the login page');

const repaired=openLogin({demoCurriculumVersion:23,users:[{username:'S-DEMO',password:'student',role:'student'}],faculty:[],students:[],subjects:[]});
const repairedUsers=repaired.read('users');
ok(['admin','dean.demo','coordinator.demo','2025-00002','23-32534-345'].every(username=>repairedUsers.some(user=>user.username===username)),'all five role demo accounts are restored even when this device already has the current data version');
repaired.w.close();

console.log('\n=== T. Blank and invalid forms are rejected ===');
r.submit('','');
ok(r.read('currentUser')===null,'no session created from an empty form');
r.submit('admin','wrongpassword');
ok(r.read('currentUser')===null,'bad password rejected');
ok(/do not match an active account/i.test(r.d.getElementById('authError').textContent),'role-neutral inline error shown');

console.log('\n=== U. Credentials determine the role automatically ===');
r=openLogin();
r.submit('admin','admin123');
let cu=r.read('currentUser');
ok(cu&&cu.username==='admin'&&cu.role==='admin','Admin credentials create an Admin session');
ok(cu&&cu.password===undefined,'session stores no password');

r=openLogin();
r.submit('12-34567-890','reyes0');
cu=r.read('currentUser');
ok(cu&&cu.role==='faculty','Faculty credentials create a Faculty session without role selection');

r=openLogin();
r.submit('2024-00001','delacruz3');
cu=r.read('currentUser');
ok(cu&&cu.role==='student','Student credentials create a Student session without role selection');

console.log('\n=== V. Access controls use the detected account role ===');
r=openLogin({systemSettings:{maintenance:true,maintenanceMessage:'Maintenance test'}});
r.submit('2024-00001','delacruz3');
ok(r.read('currentUser')===null&&/Maintenance test/.test(r.d.getElementById('authError').textContent),'maintenance blocks detected Student account');

r=openLogin({systemSettings:{allowFacultyLogin:false}});
r.submit('12-34567-890','reyes0');
ok(r.read('currentUser')===null&&/Faculty access is currently paused/.test(r.d.getElementById('authError').textContent),'Faculty access toggle blocks detected Faculty account');

process.exit(0);
