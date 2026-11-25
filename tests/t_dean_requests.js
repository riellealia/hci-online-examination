const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const tick=()=>new Promise(r=>setTimeout(r,0));
const at=new Date().toISOString();
const req=(id,type,change,extra={})=>({id,type,requesterId:'coordinator.demo',requesterRole:'coordinator',targetType:type,targetId:id,proposedChange:change,reason:`Reason for ${id}`,academicPeriod:'',status:'pending',submittedAt:at,reviewerId:'',reviewerRole:'dean',reviewerRemarks:'',decisionAt:'',history:[{status:'pending',at,actorId:'coordinator.demo',actorRole:'coordinator',remarks:'sent'}],...extra});

(async()=>{
const s=SEED();
s.users.push({username:'coordinator.demo',role:'coordinator',status:'active'},{username:'dean.demo',role:'dean',status:'active'});
s.coordinators=[{id:'coordinator.demo',username:'coordinator.demo',first:'Andrea',last:'Cruz'}];
s.sections=[{id:'1BSCS-1',program:'BSCS',yearLevel:1,sectionNumber:1,capacity:50}];
s.approvalRequests=[
  req('R-ROLE','role-assignment',{username:'F1',roleId:'r1',roleName:'Exam maker',subjectCode:'*'}),
  req('R-SEC','section-create',{section:{id:'2BSIT-3',name:'3',sectionNumber:3,program:'BSIT',yearLevel:2,capacity:40,status:'active'}}),
  req('R-SEC-DUP','section-create',{section:{id:'1BSCS-1',name:'1',sectionNumber:1,program:'BSCS',yearLevel:1,capacity:50,status:'active'}}),
  req('R-OLD','section-create',{section:{id:'4BSCS-9',name:'9',sectionNumber:9,program:'BSCS',yearLevel:4,capacity:30,status:'active'}},{status:'approved',reviewerId:'dean.demo',reviewerRemarks:'Fine.',decisionAt:at})
];
const r=load('dean.html',{...s,currentUser:{username:'dean.demo',role:'dean'}});
r.w.renderDeanApprovals();
const list=r.d.getElementById('deanApprovalList');

console.log('=== TABS. Underlined tabs by kind of request, toolbar on the right ===');
const bar=r.d.querySelector('#approvalsSection .rq2-tabbar');
ok(!!bar&&bar.querySelector('#deanRequestTabs')&&bar.querySelector('.cw-tools'),'tabs and the toolbar share one row');
const tabs=[...r.d.querySelectorAll('#deanRequestTabs .rq2-tab')].map(t=>t.firstChild.textContent);
ok(tabs.join('|')==='All|Enrollment|Role|Subject|Overload|Section','tabs: All, Enrollment, Role, Subject, Overload, Section');
const count=key=>r.d.querySelector(`#deanRequestTabs [data-rq-tab="${key}"] span`).textContent;
ok(count('all')==='4'&&count('section')==='3'&&count('role')==='1'&&count('subject')==='0','each tab shows how many requests it holds');
ok(['Search requests','Filter by status','Group by'].every(l=>bar.querySelector(`.cw-tools [aria-label="${l}"]`)),'toolbar has search, status filter, and group by');
r.d.querySelector('#deanRequestTabs [data-rq-tab="section"]').click();
ok([...list.querySelectorAll('.rq2-card')].every(c=>c.dataset.tab==='section')&&list.querySelectorAll('.rq2-card').length===3,'the Section tab shows only section requests');
ok(r.d.querySelector('#deanRequestTabs [data-rq-tab="section"]').classList.contains('active'),'the chosen tab is underlined (active)');
r.d.querySelector('#deanRequestTabs [data-rq-tab="all"]').click();

console.log('\n=== GROUPS. Grouped by status by default; by kind or none on request ===');
ok([...list.querySelectorAll('.rq2-group>h4')].map(h=>h.firstChild.textContent).join('|')==='Pending|Approved','grouped by status: Pending, then Approved');
const group=r.d.getElementById('deanApprovalGroup');
group.value='type';group.dispatchEvent(new r.w.Event('change'));
ok([...list.querySelectorAll('.rq2-group>h4')].map(h=>h.firstChild.textContent).join('|')==='Role|Section','group by kind of request');
group.value='none';group.dispatchEvent(new r.w.Event('change'));
ok(!list.querySelector('.rq2-group')&&list.querySelectorAll('.rq2-card').length===4,'no grouping lists every card');
group.value='';group.dispatchEvent(new r.w.Event('change'));

console.log('\n=== CARD. Name, request, reason, then details; decision on the right ===');
const card=list.querySelector('[data-request-type="role-assignment"]');
const main=card.querySelector('.rq2-main');
ok(main.children[0].matches('header.rq2-head')&&main.children[0].querySelector('.rq2-name').textContent==='Reyes, Maria'&&/F1 · All subjects/.test(main.children[0].querySelector('.rq2-context').textContent),'first: name (Last, First) with a small context line');
ok(main.children[1].matches('h4.rq2-type')&&/Role/.test(main.children[1].textContent),'second: what is requested');
ok(main.children[2].matches('.rq2-pill')&&main.children[2].textContent==='Role','third: one pill naming the kind of request');
ok(main.children[3].matches('.rq2-reason')&&main.children[3].textContent==='Reason for R-ROLE','fourth: the reason');
ok(!card.querySelector('.rq2-icon')&&card.children[0].matches('.rq2-main')&&card.lastElementChild.matches('.rq2-actions'),'no icon: details on the left, actions on the right');
ok(!list.querySelector('.rq2-state svg'),'decided cells show their outcome as text, without icons');
const approve=card.querySelector('.rq2-act.approve'),reject=card.querySelector('.rq2-act.reject');
ok(approve&&reject&&!approve.textContent.trim()&&!reject.textContent.trim()&&approve.querySelector('svg')&&reject.querySelector('svg'),'approve and reject are icon buttons');
ok(approve.getAttribute('aria-label')&&reject.getAttribute('aria-label'),'icon buttons are labelled for screen readers');
ok(!card.querySelector('.role-request-status'),'no status pill on pending cards');
const details=card.querySelector('.rq2-details');
ok(!details.textContent.includes('Subject')&&!details.textContent.includes('Schedule'),'request footer does not repeat the subject or show a schedule');
ok(details.querySelector('.rq-sender')?.textContent.trim()==='Sent by Andrea Cruz','sender is shown by name on its own footer line');
ok(!r.d.querySelector('#approvalsSection .cw-stat small'),'status cards omit the per-type breakdown text');
const dupCard=[...list.querySelectorAll('.rq2-card')].find(c=>/1BSCS-1/.test(c.querySelector('.rq2-name').textContent));
ok(dupCard.querySelector('.rq2-act.approve').disabled&&/already exists/.test(dupCard.querySelector('.rq2-act.approve').title),'approve is disabled, with the reason, when the request cannot be applied');
const decided=list.querySelector('[data-status="approved"]');
ok(decided.querySelector('.rq2-state.is-approved')&&/Approved/.test(decided.querySelector('.rq2-state').textContent)&&!decided.querySelector('.rq2-act'),'decided requests show their outcome instead of buttons');
ok(/Dean remarks: Fine\./.test(decided.textContent),'decided requests show the Dean remarks');

console.log('\n=== DECIDE. Approve applies; reject asks for remarks ===');
const secCard=[...list.querySelectorAll('.rq2-card')].find(c=>/2BSIT-3/.test(c.textContent));
secCard.querySelector('.rq2-act.approve').click();
ok(r.read('sections').some(x=>x.id==='2BSIT-3')&&r.read('approvalRequests').find(x=>x.id==='R-SEC').status==='approved','approve creates the section and marks the request approved');
const roleCard=list.querySelector('[data-request-type="role-assignment"]');
roleCard.querySelector('.rq2-act.reject').click();await tick();
const dialog=r.d.querySelector('.confirm-box textarea');
ok(!!dialog,'reject opens a remarks prompt');
r.d.querySelector('.confirm-box .confirm-cancel').click();await tick();
ok(r.read('approvalRequests').find(x=>x.id==='R-ROLE').status==='pending','cancelling the prompt leaves the request pending');
list.querySelector('[data-request-type="role-assignment"] .rq2-act.reject').click();await tick();
r.d.querySelector('.confirm-box textarea').value='Not needed this term.';
r.d.querySelector('.confirm-box .confirm-ok').click();await tick();
const rejected=r.read('approvalRequests').find(x=>x.id==='R-ROLE');
ok(rejected.status==='rejected'&&rejected.reviewerRemarks==='Not needed this term.','reject records the remarks');
r.d.getElementById('remarks-R-SEC-DUP').value='Duplicate of an existing section.';
list.querySelector('#remarks-R-SEC-DUP').closest('.rq2-card').querySelector('.rq2-act.reject').click();await tick();
ok(r.read('approvalRequests').find(x=>x.id==='R-SEC-DUP').reviewerRemarks==='Duplicate of an existing section.'&&!r.d.querySelector('.confirm-box textarea'),'remarks typed under "Add remarks" are used without a prompt');
r.w.close();
process.exit(0);
})();
