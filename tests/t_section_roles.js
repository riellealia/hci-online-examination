const {load,SEED}=require('./harness');
const ok=(c,m)=>console.log(`  ${c?'✅':'❌'} ${m}`);
const {validateProtectedWrite,validateApprovals}=require('../server/protected-write');
const {permitted}=require('../server/access-policy');

function seed(extra={}){
  const s=SEED();
  s.users.push({username:'coordinator.demo',role:'coordinator',status:'active'},{username:'dean.demo',role:'dean',status:'active'});
  s.coordinators=[{id:'coordinator.demo',username:'coordinator.demo',first:'Patricia',last:'Lorenzo',status:'active'}];
  s.sections=[{id:'1BSCS-1',name:'1',program:'BSCS',yearLevel:1,sectionNumber:1,capacity:50}];
  return {...s,...extra};
}
const fill=(r,{program='BSIT',year='2',number='3',capacity='40',reason}={})=>{
  r.d.getElementById('sectionEditorDialog').querySelector('#sectionProgram').value=program;
  r.d.getElementById('sectionEditorDialog').querySelector('#sectionYear').value=year;
  r.d.getElementById('sectionEditorDialog').querySelector('#sectionNumber').value=number;
  r.d.getElementById('sectionEditorDialog').querySelector('#sectionCapacity').value=capacity;
  if(reason!==undefined)r.d.getElementById('sectionReason').value=reason;
  r.d.getElementById('sectionForm').dispatchEvent(new r.w.Event('submit',{bubbles:true,cancelable:true}));
};

console.log('=== ADMIN. Section Management page; sections are created directly ===');
let a=load('admin.html',{...seed(),currentUser:{username:'admin',role:'admin'}});
const adminLink=a.d.querySelector('#sidebar [data-panel="sectionManagementSection"]');
ok(!!adminLink&&/Section Management/.test(adminLink.textContent),'Admin sidebar has Section Management');
adminLink.click();
ok(a.d.getElementById('sectionManagementSection').style.display==='block'&&!!a.d.querySelector('#sectionManagementSection #coordinatorSectionTable'),'the page shows the section table');
ok(/Add section/.test(a.d.querySelector('#sectionManagementSection .section-add').textContent),'Admin gets "Add section"');
a.w.SectionManagement.create();
ok(a.d.querySelector('#sectionEditorDialog .section-reason-field').hidden,'no Dean reason is asked of the Admin');
fill(a);
ok(a.read('sections').some(s=>s.id==='2BSIT-3'&&s.capacity===40&&s.createdBy==='admin'),'Admin creates the section immediately');
ok(!(a.read('approvalRequests')||[]).length,'no approval request is made');
ok(a.d.querySelectorAll('[id="sectionProgram"]').length===2&&a.d.getElementById('sectionModal')?.querySelector('#sectionProgram'),'the archived Admin section form keeps its own fields (no clash)');
a.w.close();

console.log('\n=== DEAN. Section Management page; creates directly and approves Coordinator requests ===');
let d=load('dean.html',{...seed(),currentUser:{username:'dean.demo',role:'dean'}});
const deanLink=d.d.querySelector('#sidebar [data-panel="sectionManagementSection"]');
ok(!!deanLink,'Dean sidebar has Section Management');
d.w.SectionManagement.create();
ok(d.d.querySelector('#sectionEditorDialog .section-reason-field').hidden&&/Save section/.test(d.d.querySelector('#sectionEditorDialog button[type="submit"]').textContent),'Dean gets the direct form');
fill(d,{program:'BSCS',year:'4',number:'1',capacity:'30'});
ok(d.read('sections').some(s=>s.id==='4BSCS-1'&&s.createdBy==='dean.demo'),'Dean creates the section immediately');
const deanSaved={sections:d.read('sections')};
d.w.close();

console.log('\n=== COORDINATOR. Requests a section; the Dean approves it ===');
let c=load('coordinator.html',{...seed(deanSaved),currentUser:{username:'coordinator.demo',role:'coordinator'}});
ok(/Request section/.test(c.d.querySelector('#sectionManagementSection .section-add').textContent),'Coordinator gets "Request section"');
c.w.SectionManagement.create();
ok(!c.d.querySelector('#sectionEditorDialog .section-reason-field').hidden,'Coordinator is asked for a reason');
fill(c,{program:'BSIS',year:'1',number:'2',capacity:'45',reason:'Overflow from 1BSIS-1.'});
const req=c.read('approvalRequests').find(r=>r.type==='section-create');
ok(req&&req.status==='pending'&&req.targetId==='1BSIS-2'&&req.proposedChange.section.capacity===45,'request carries the proposed section');
ok(!c.read('sections').some(s=>s.id==='1BSIS-2'),'nothing is created before approval');
fill(c,{program:'BSCS',year:'4',number:'1',capacity:'30',reason:'Duplicate'});
ok(c.read('approvalRequests').filter(r=>r.type==='section-create').length===1,'requesting an existing Section ID is refused');
c.w.SectionManagement.create();fill(c,{program:'BSIS',year:'1',number:'2',capacity:'45',reason:'Again'});
ok(c.read('approvalRequests').filter(r=>r.type==='section-create').length===1,'a second pending request for the same section is refused');
// withdraw a second, different request
c.w.SectionManagement.create();fill(c,{program:'BSIT',year:'3',number:'9',capacity:'20',reason:'Maybe'});
const extra=c.read('approvalRequests').find(r=>r.targetId==='3BSIT-9');
c.w.SectionManagement.withdraw(extra.id);
ok(c.read('approvalRequests').find(r=>r.id===extra.id).status==='withdrawn','Coordinator can withdraw a pending section request');
const afterCoordinator={sections:c.read('sections'),approvalRequests:c.read('approvalRequests'),notifications:c.read('notifications')||[]};
c.w.close();

d=load('dean.html',{...seed(afterCoordinator),currentUser:{username:'dean.demo',role:'dean'}});
d.w.SectionManagement.render();
ok(/1 section request/.test(d.d.querySelector('#coordinatorSectionsRoot .section-requests')?.textContent||''),'Dean sees how many section requests wait for approval');
d.w.renderDeanApprovals();
const card=[...d.d.querySelectorAll('#deanApprovalList .role-request-card')].find(el=>el.dataset.requestType==='section-create'&&/1BSIS-2/.test(el.textContent));
ok(!!card&&/New section/.test(card.textContent)&&/BSIS/.test(card.textContent)&&/45 students/.test(card.textContent),'the approval card describes the requested section');
d.w.reviewAssignment(req.id,'approved');
ok(d.read('sections').some(s=>s.id==='1BSIS-2'&&s.capacity===45&&s.requestedBy==='coordinator.demo'&&s.approvalRequestId===req.id),'Dean approval creates the section');
ok(d.read('approvalRequests').find(r=>r.id===req.id).status==='approved','request is marked approved');
// A request whose Section ID now exists cannot be approved
const dupReq={...req,id:'APR-DUP',status:'pending',history:[req.history[0]]};
const dupState={sections:d.read('sections'),approvalRequests:[...d.read('approvalRequests'),dupReq]};
d.w.close();
d=load('dean.html',{...seed(dupState),currentUser:{username:'dean.demo',role:'dean'}});
ok(d.w.SectionManagement.reviewRequest(dupReq).canApprove===false,'a request for an existing Section ID is flagged as blocked');
d.w.reviewAssignment('APR-DUP','approved');
ok(d.read('approvalRequests').find(r=>r.id==='APR-DUP').status==='pending'&&d.read('sections').filter(s=>s.id==='1BSIS-2').length===1,'approving it fails without creating a duplicate');
d.w.close();

console.log('\n=== SERVER. Write rules ===');
const store=data=>({read:(k,f)=>k in data?data[k]:f});
const coord={username:'coordinator.demo',role:'coordinator'},dean={username:'dean.demo',role:'dean'};
const base=[{id:'1BSCS-1',capacity:50}];
let threw=null;try{validateProtectedWrite(store({sections:base}),coord,'sections',[...base,{id:'1BSCS-2',capacity:50}])}catch(e){threw=e}
ok(threw&&threw.status===403&&/Dean approval/.test(threw.message),'a Coordinator cannot add a section directly');
threw=null;try{validateProtectedWrite(store({sections:base}),coord,'sections',[{id:'1BSCS-1',capacity:40}])}catch(e){threw=e}
ok(!threw,'a Coordinator can still edit a section');
threw=null;try{validateProtectedWrite(store({sections:base}),coord,'sections',[])}catch(e){threw=e}
ok(!threw,'a Coordinator can still delete a section');
ok(permitted(dean,'sections','PUT')&&permitted({role:'admin'},'sections','PUT'),'Dean and Admin may write sections');
threw=null;try{validateApprovals([],[req],coord)}catch(e){threw=e}
ok(!threw,'the server accepts a Coordinator section-create request');
process.exit(0);
