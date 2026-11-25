const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const pages=[
  ['admin.html',  {username:'admin',role:'admin'}, 11, 'Dashboard'],
  ['faculty.html',{username:'F1',role:'faculty'},   6, 'Dashboard'],
  ['student.html',{username:'S1',role:'student'},   6, 'Dashboard']
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
  ok(page==='student.html'?!r.d.querySelector('.topbar'):/NEW ERA UNIVERSITY/.test(r.d.querySelector('#pageTitle,.page-title,.topbar-title')?.textContent||''),page==='student.html'?`${page}: legacy top header is removed`:`${page}: site header shows the institution name`);
  const headerControls=r.d.querySelector('.topbar-right .profile-wrap');
  ok(page==='student.html'?!headerControls:!!headerControls?.querySelector('.header-inbox-btn')&&headerControls.firstElementChild.classList.contains('header-inbox-wrap'),page==='student.html'?`${page}: legacy header controls are removed`:`${page}: inbox sits beside and before the profile icon`);
  ok(links[0].classList.contains('active'),`${page}: first section marked active`);
  ok([...links].every(a=>a.querySelector('.nav-icon')),`${page}: every link has an icon`);
  ok(page==='student.html'||(r.d.body.classList.contains('role-shell-ready')&&!!r.d.querySelector('.role-sidebar-brand')&&!!r.d.querySelector('.role-sidebar-profile')&&!!r.d.getElementById('role-mail-panel')),`${page}: shared shell includes school identity, Mail page, and bottom profile`);
  r.w.close();
}

const adminNavPage=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});
const adminLinks=[...adminNavPage.d.querySelectorAll('#sidebar a')].map(link=>link.dataset.panel);
ok(adminLinks.slice(0,8).join(',')==='dashboardSection,systemSection,academicPeriodsSection,governanceSection,auditSection,loadPolicySection,sectionManagementSection,facultySection','Admin navigation includes merged governance under system settings before school management, with Section Management after Subject Management');
ok(adminNavPage.d.querySelector('#sidebar [data-panel="loadPolicySection"]')?.textContent.includes('Subject Management'),'unified curriculum and load workspace is named Subject Management');
ok(!adminNavPage.d.querySelector('#sidebar [data-panel="subjectSection"]'),'archived legacy Subject Management is removed from navigation');
const adminDividers=[...adminNavPage.d.querySelectorAll('#sidebar .sidebar-divider[role="separator"]')];
ok(adminDividers.map(item=>item.textContent.trim()).join('|')==='System settings|School management','Admin sidebar contains only Admin-owned navigation categories');
ok(adminDividers[0].nextElementSibling?.dataset.panel==='systemSection'&&adminDividers[1].nextElementSibling?.dataset.panel==='loadPolicySection','system and school management items start under the correct category');
ok(!adminNavPage.d.querySelector('#sidebar [data-panel="sectionSection"]'),'Section Management is removed from Admin navigation');
const coordinatorSeed=SEED();coordinatorSeed.users.push({username:'coordinator.demo',role:'coordinator',status:'active'});
const coordinatorNavPage=load('coordinator.html',{...coordinatorSeed,currentUser:{username:'coordinator.demo',role:'coordinator'}});
ok(coordinatorNavPage.d.querySelector('#sidebar [data-panel="sectionManagementSection"]')?.textContent.includes('Section Management'),'Section Management is owned by the Faculty Coordinator');
ok(coordinatorNavPage.d.querySelectorAll('.role-action-card').length===6&&coordinatorNavPage.d.querySelector('.role-action-card-wide')?.textContent.includes('Coordinator logs'),'Coordinator dashboard combines assignment and enrollment applications while keeping Logs full-width');
ok(coordinatorNavPage.d.body.classList.contains('role-shell-ready')&&!!coordinatorNavPage.d.querySelector('.role-sidebar-profile')&&!!coordinatorNavPage.d.getElementById('role-mail-panel'),'Coordinator receives the shared shell, Mail page, and bottom profile');
coordinatorNavPage.w.close();
const deanSeed=SEED();deanSeed.users.push({username:'dean.demo',role:'dean',status:'active'});
const deanNavPage=load('dean.html',{...deanSeed,currentUser:{username:'dean.demo',role:'dean'}});
ok(deanNavPage.d.body.classList.contains('role-shell-ready')&&deanNavPage.d.querySelectorAll('#sidebar a').length===7&&!!deanNavPage.d.querySelector('#sidebar [data-panel="sectionManagementSection"]')&&!!deanNavPage.d.querySelector('.role-sidebar-profile')&&!!deanNavPage.d.getElementById('role-mail-panel'),'Dean receives the shared shell, Mail page, and bottom profile');
deanNavPage.w.close();
adminNavPage.w.close();

const studentNavPage=load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}});
ok([...studentNavPage.d.querySelectorAll('#sidebar a')].map(link=>link.children[1]?.textContent.trim()).join('|')==='Dashboard|My Subjects|Examinations|Results|Schedule|Mail','Student sidebar keeps Mail directly beneath Schedule');
ok(!!studentNavPage.d.querySelector('.student-sidebar-brand img')&&/NEW ERA/.test(studentNavPage.d.querySelector('.student-sidebar-brand')?.textContent||''),'Student rail carries the university logo and school name');
const studentBrandLogo=studentNavPage.d.querySelector('.student-sidebar-brand img');studentBrandLogo.click();
ok(studentNavPage.d.body.classList.contains('sidebar-open')&&studentBrandLogo.getAttribute('aria-label')==='Collapse navigation','Student logo expands the compact navigation rail');
studentBrandLogo.click();
ok(!studentNavPage.d.body.classList.contains('sidebar-open')&&studentBrandLogo.getAttribute('aria-label')==='Expand navigation','Student logo collapses the expanded navigation rail');
ok(!studentNavPage.d.querySelector('.student-sidebar-rail-toggle')&&studentNavPage.d.querySelector('.student-sidebar-brand .close-x')?.hidden,'compact Student rail removes the redundant desktop hamburger and legacy X');
ok(!!studentNavPage.d.querySelector('.student-sidebar-profile .student-sidebar-avatar')&&/Student/.test(studentNavPage.d.querySelector('.student-sidebar-profile')?.textContent||''),'Student profile identity and actions live in the sidebar footer');
ok(studentNavPage.d.querySelectorAll('.student-subject-tree-item').length>0&&!!studentNavPage.d.querySelector('.student-subject-tree-toggle'),'My Subjects expands into nested enrolled-subject links');
const subjectTreeToggle=studentNavPage.d.querySelector('.student-subject-tree-toggle'),subjectTree=studentNavPage.d.querySelector('.student-subject-tree');subjectTreeToggle.click();
ok(subjectTree.hidden&&subjectTreeToggle.getAttribute('aria-expanded')==='false','nested subjects can be collapsed independently');
studentNavPage.w.close();

console.log('\n=== BBB. Drawer opens, closes, and switches sections ===');
let r=load('student.html',{...SEED(),currentUser:{username:'S1',role:'student'}});
const bar=r.d.getElementById('sidebar'), btn=r.d.querySelector('.menu-btn');
ok(bar.style.width==='76px','Student navigation starts as a compact icon rail');
btn.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(bar.style.width==='280px','Student navigation expands on the menu button');
ok(btn.getAttribute('aria-expanded')==='true','aria-expanded set');
ok(r.d.body.classList.contains('sidebar-open'),'open drawer resizes the shared page shell');
r.d.dispatchEvent(new r.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
ok(bar.style.width==='76px','Escape restores the compact rail');
ok(!r.d.body.classList.contains('sidebar-open'),'closing drawer restores the full page width');
btn.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
r.d.body.dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(bar.style.width==='76px','click-away restores the compact rail');

console.log('\n--- switching sections ---');
const panel=id=>r.d.getElementById(id).style.display;
ok(panel('overview-panel')==='block'&&panel('results-panel')==='none','only Overview visible at first');
r.d.querySelector('#sidebar a[data-panel="mail-panel"]').dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(panel('mail-panel')==='block'&&r.d.getElementById('mail-panel').hidden===false&&['overview-panel','subjects-panel','exams-panel','results-panel','schedule-panel'].every(id=>r.d.getElementById(id).hidden),'Mail is an isolated sidebar tab instead of stacking inside another page');
r.d.querySelector('#sidebar a[data-panel="results-panel"]').dispatchEvent(new r.w.MouseEvent('click',{bubbles:true}));
ok(panel('results-panel')==='block','My Results now shown');
ok(panel('overview-panel')==='none','Overview hidden');
ok(!r.d.querySelector('.topbar')&&!!r.d.querySelector('.student-sidebar-brand'),'Student navigation keeps identity in the sidebar instead of a top header');
ok(bar.style.width==='76px','drawer returns to the compact rail after choosing');
ok(r.d.querySelector('#sidebar a[data-panel="results-panel"]').classList.contains('active'),'chosen link marked active');

console.log('\n--- Back returns to the actual previous screen ---');
r.w.eval("studentNav.show('subjects-panel')");
r.d.querySelector('#studentSubjectCards .enrolled-subject-card')?.click();
ok(panel('subject-detail-panel')==='block','Student opens a nested subject page');
r.d.querySelector('#studentSubjectDetail [aria-label="Go back"]')?.click();
ok(panel('subjects-panel')==='block','Student detail Back returns to the immediately previous subject list');
r.w.eval('studentNav.back()');
ok(panel('results-panel')==='block','a second Student Back returns to the screen visited before the subject list');

const facultyHistory=load('faculty.html',{...SEED(),currentUser:{username:'F1',role:'faculty'}});
facultyHistory.w.eval("facultyNav.show('exams-tab');facultyNav.show('reports-tab');facultyNav.back()");
ok(facultyHistory.d.getElementById('exams-tab').style.display==='block','Faculty Back returns to the immediately previous page');
facultyHistory.w.close();

const adminHistory=load('admin.html',{...SEED(),currentUser:{username:'admin',role:'admin'}});
adminHistory.w.eval("adminNav.show('facultySection');adminNav.show('systemSection');adminNav.back()");
ok(adminHistory.d.getElementById('facultySection').style.display==='block','Admin Back returns to the immediately previous page');
adminHistory.w.close();

console.log('\n=== CCC. Student Overview surfaces what needs attention ===');
ok(!!r.d.getElementById('nextUp'),'Next up panel exists');
ok(/Nothing needs your attention|Open now|Next|Awaiting/.test(r.d.getElementById('nextUp').textContent),'Next up has content');
ok(![...r.d.querySelectorAll('#nextUp .nextup-tag')].some(item=>item.textContent.trim()==='Next'),'upcoming rows do not repeat a Next pill');
r.w.close();

const today=new Date().toLocaleDateString('en-CA');
const s=SEED();
s.studentEnrollments=[{studentId:'S1',subjectCode:'SUB1',sectionId:'A'}];
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
ok(!!t&&t.classList.contains('toast-info'),'legacy subject creation redirects to the curriculum source of truth');
ok(/Subject Management/.test(t.textContent),'and names where subjects are now added');
r.d.getElementById('fID').value='F9';
r.d.getElementById('fLast').value='Cruz';
r.d.getElementById('fFirst').value='Ana';
r.w.saveItem('faculty');
const t2=[...r.d.querySelectorAll('.toast')].pop();
ok(/Password/.test(t2.textContent),'adding faculty reports the generated password');
r.w.close();
process.exit(0);
