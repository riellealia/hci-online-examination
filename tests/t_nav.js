const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const pages=[
  ['admin.html',  {username:'admin',role:'admin'},  8, 'Dashboard'],
  ['faculty.html',{username:'F1',role:'faculty'},   4, 'My Subjects'],
  ['student.html',{username:'S1',role:'student'},   4, 'Overview']
];

console.log('=== AAA. Every role now has the same navigation ===');
for(const [page,user,count,firstLabel] of pages){
  const r=load(page,{...SEED(),currentUser:user});
  const bar=r.d.getElementById('sidebar');
  const btn=r.d.querySelector('.menu-btn');
  const links=r.d.querySelectorAll('#sidebar a');
  ok(!!bar,`${page}: has a sidebar`);
  ok(!!btn,`${page}: has a menu button`);
  ok(links.length===count,`${page}: ${links.length} sections (expected ${count})`);
  ok(r.d.getElementById('pageTitle').textContent==='NEW ERA UNIVERSITY',`${page}: site header shows the institution name`);
  const headerControls=r.d.querySelector('.topbar-right .profile-wrap');
  ok(!!headerControls?.querySelector('.header-inbox-btn')&&headerControls.firstElementChild.classList.contains('header-inbox-wrap'),`${page}: inbox sits beside and before the profile icon`);
  ok(links[0].classList.contains('active'),`${page}: first section marked active`);
  ok([...links].every(a=>a.querySelector('.nav-icon')),`${page}: every link has an icon`);
  r.w.close();
}

const adminNavPage=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});
const adminLinks=[...adminNavPage.d.querySelectorAll('#sidebar a')].map(link=>link.dataset.panel);
ok(adminLinks.slice(0,3).join(',')==='dashboardSection,systemSection,auditSection','Admin places System Management and Audit Log directly below Dashboard');
const adminDivider=adminNavPage.d.querySelector('#sidebar .sidebar-divider[role="separator"]');
ok(adminDivider?.textContent.trim()==='School controls'&&adminDivider.nextElementSibling?.dataset.panel==='facultySection','Admin sidebar divider separates system controls from school controls');
adminNavPage.w.close();

console.log('\n=== BBB. Drawer opens, closes, and switches sections ===');
let r=load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}});
const bar=r.d.getElementById('sidebar'), btn=r.d.querySelector('.menu-btn');
ok(bar.style.width!=='260px','starts closed');
btn.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(bar.style.width==='260px','opens on the menu button');
ok(btn.getAttribute('aria-expanded')==='true','aria-expanded set');
r.d.dispatchEvent(new r.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
ok(bar.style.width!=='260px','Escape closes it');
btn.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
r.d.body.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(bar.style.width!=='260px','click-away closes it');

console.log('\n--- switching sections ---');
const panel=id=>r.d.getElementById(id).style.display;
ok(panel('overview-panel')==='block'&&panel('results-panel')==='none','only Overview visible at first');
r.d.querySelector('#sidebar a[data-panel="results-panel"]').dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(panel('results-panel')==='block','My Results now shown');
ok(panel('overview-panel')==='none','Overview hidden');
ok(r.d.getElementById('pageTitle').textContent==='NEW ERA UNIVERSITY','site header remains the institution name after navigation');
ok(bar.style.width!=='260px','drawer closes after choosing');
ok(r.d.querySelector('#sidebar a[data-panel="results-panel"]').classList.contains('active'),'chosen link marked active');

console.log('\n=== CCC. Student Overview surfaces what needs attention ===');
ok(!!r.d.getElementById('nextUp'),'Next up panel exists');
ok(/Nothing needs your attention|Open now|Next|Awaiting/.test(r.d.getElementById('nextUp').textContent),'Next up has content');
ok(![...r.d.querySelectorAll('#nextUp .nextup-tag')].some(item=>item.textContent.trim()==='Next'),'upcoming rows do not repeat a Next pill');
r.w.close();

const today=new Date().toLocaleDateString('en-CA');
const s=SEED();
s.exams=[{id:'e1',facultyId:'F1',subjectCode:'SUB1',title:'Live Quiz',desc:'',date:today,start:'00:01',end:'23:59'}];
r=load('student.html',{...s,currentUser:{username:'S1',role:'student'}});
const nu=r.d.getElementById('nextUp').textContent;
ok(/Today/.test(nu)&&/Open/.test(nu)&&/Live Quiz/.test(nu)&&!/Open now/.test(nu),'an open exam is grouped under Today with a concise Open pill');
r.w.close();

console.log('\n=== DDD. Save actions now confirm themselves ===');
r=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});
r.d.getElementById('subCode').value='NEW-1';
r.d.getElementById('subName').value='Brand New Subject';
r.w.saveItem('subjects');
const t=[...r.d.querySelectorAll('.toast')].pop();
ok(!!t&&t.classList.contains('toast-success'),'adding a subject gives a success toast');
ok(/NEW-1 added/.test(t.textContent),'and names what was added');
r.d.getElementById('fID').value='F9';
r.d.getElementById('fLast').value='Cruz';
r.d.getElementById('fFirst').value='Ana';
r.w.saveItem('faculty');
const t2=[...r.d.querySelectorAll('.toast')].pop();
ok(/Password/.test(t2.textContent),'adding faculty reports the generated password');
r.w.close();
process.exit(0);
