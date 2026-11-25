/* ==================================================================
   Section Management — shared by the Admin, Dean, and Faculty
   Coordinator pages.

   - Admin and Dean create sections directly.
   - A Faculty Coordinator's "Add section" sends a section-create request
     to the Dean; the section is created when the Dean approves it.
     Coordinators still edit, assign subjects to, and delete sections.

   The module brings its own dialogs when a page does not have them, and
   looks its fields up inside its own dialogs, so a page with similarly
   named legacy fields (the archived Admin section modal) is unaffected.
   ================================================================== */
const SectionManagement=(()=>{
  let editingId='',activeSectionId='';
  const programs=['BSCS','BSIT','BSIS','BSGAMEDEV','BSANIMATION'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const read=(key,fallback=[])=>DB.read(key,fallback);
  const actor=()=>DB.read('currentUser',null)||{username:'coordinator',role:'coordinator'};
  const roleOf=user=>typeof PermissionService!=='undefined'&&PermissionService.normalizeRole?PermissionService.normalizeRole(user?.role):String(user?.role||'');
  /* Coordinators request new sections; Admin and Dean create them. */
  const facultyView=()=>roleOf(actor())==='faculty';
  const needsApproval=()=>facultyView()||roleOf(actor())==='coordinator';

  const editor=()=>document.getElementById('sectionEditorDialog');
  const field=id=>editor()?.querySelector(`#${id}`);
  const subjectsDialog=()=>document.getElementById('sectionSubjectsDialog');
  const subjectList=()=>subjectsDialog()?.querySelector('#sectionSubjectList');
  const root=()=>document.getElementById('coordinatorSectionsRoot');

  function details(section){const match=String(section.id||'').match(/^(\d)([A-Z]+)-(\d+)$/);return{yearLevel:Number(section.yearLevel||match?.[1]||1),program:section.program||match?.[2]||'BSCS',sectionNumber:Number(section.sectionNumber||section.name||match?.[3]||1)}}
  function count(id){return new Set(read('studentEnrollments').filter(item=>item.sectionId===id).map(item=>item.studentId).filter(Boolean)).size}
  function open(id){document.getElementById(id)?.classList.add('open')}
  function close(id){document.getElementById(id)?.classList.remove('open')}
  function sectionId(program,year,number){return `${year}${program}-${number}`.toUpperCase()}
  function fail(message,code='SECTION_INVALID'){const error=new Error(message);error.code=code;throw error}

  /* ---------- dialogs (injected on pages that do not ship them) ---------- */
  function ensureDialogs(){
    if(!editor()){
      document.body.insertAdjacentHTML('beforeend',`<div id="sectionEditorDialog" class="section-dialog"><form id="sectionForm" class="section-dialog-card"><header><h3 id="sectionDialogTitle">Add section</h3><button type="button" class="section-dialog-close" onclick="SectionManagement.close('sectionEditorDialog')" aria-label="Close">&times;</button></header><div class="section-form-grid"><label>Curriculum<select id="sectionProgram">${programs.map(program=>`<option>${program}</option>`).join('')}</select></label><label>Year level<select id="sectionYear"><option value="1">1st Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option></select></label><label>Section number<input id="sectionNumber" type="number" min="1" required></label><label>Student capacity<input id="sectionCapacity" type="number" min="1" required></label></div><footer class="section-dialog-actions"><button type="button" onclick="SectionManagement.close('sectionEditorDialog')">Cancel</button><button class="primary" type="submit">Save section</button></footer></form></div>`);
    }
    if(!subjectsDialog()){
      document.body.insertAdjacentHTML('beforeend',`<div id="sectionSubjectsDialog" class="section-dialog"><div class="section-dialog-card"><header><h3 id="sectionSubjectDialogTitle">Subject offerings</h3><button type="button" class="section-dialog-close" onclick="SectionManagement.close('sectionSubjectsDialog')" aria-label="Close">&times;</button></header><div id="sectionSubjectList" class="section-subject-list"></div><footer class="section-dialog-actions"><button type="button" onclick="SectionManagement.close('sectionSubjectsDialog')">Cancel</button><button class="primary" type="button" onclick="SectionManagement.saveSubjects()">Save assignments</button></footer></div></div>`);
    }
    if(!editor().querySelector('[data-archive-edit]')){
      editor().querySelector('.section-dialog-actions').insertAdjacentHTML('afterbegin','<button type="button" data-archive-edit hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 4h18v5H3V4Zm2 7h14v9H5v-9Zm4 2v2h6v-2H9Z"/></svg> Archive section</button>');
      editor().querySelector('[data-archive-edit]').onclick=()=>archive(read('sections').findIndex(section=>section.id===editingId));
    }
    if(!field('sectionReason')){
      editor().querySelector('.section-form-grid').insertAdjacentHTML('afterend','<label class="section-reason-field" hidden>Reason for the Dean<textarea id="sectionReason" rows="3" placeholder="Why this section is needed (e.g., incoming students, overflow from 1BSCS-2)"></textarea><small>New sections need Dean approval. The section is created when the Dean approves the request.</small></label>');
    }
  }

  /* ---------- shared create (direct, or applied when the Dean approves) ---------- */
  function sectionRecord({program,yearLevel,sectionNumber,capacity}){
    const year=Number(yearLevel),number=Number(sectionNumber),limit=Number(capacity);
    if(!programs.includes(program))fail('Choose a curriculum for the section.');
    if(!(year>=1&&year<=4))fail('Choose a year level from 1 to 4.');
    if(!(Number.isInteger(number)&&number>=1))fail('The section number must be a whole number of at least 1.');
    if(!(Number.isInteger(limit)&&limit>=1))fail('The student capacity must be a whole number of at least 1.');
    return{id:sectionId(program,year,number),name:String(number),sectionNumber:number,program,yearLevel:year,capacity:limit,status:'active'};
  }
  function commitNewSection(record,user,extra={}){
    const sections=read('sections');
    if(sections.some(item=>item.id===record.id))fail(`Section ${record.id} already exists.`,'SECTION_EXISTS');
    const saved={...record,createdBy:user?.username||'',createdAt:new Date().toISOString(),...extra};
    if(!DB.write('sections',[...sections,saved]))fail('The section could not be saved.','SAVE_FAILED');
    let synced=0;
    if(typeof SectionService!=='undefined'&&typeof SectionService.ensureOfferingsForSection==='function'){const res=SectionService.ensureOfferingsForSection(saved,read('sectionSubjects'),read('curricula'));if(res.added>0&&DB.write('sectionSubjects',res.records))synced=res.added;}
    if(typeof AuditLog!=='undefined')AuditLog.record('create','section',saved.id,{program:saved.program,yearLevel:saved.yearLevel,sectionNumber:saved.sectionNumber,capacity:saved.capacity,offeringsSynced:synced,...(extra.approvalRequestId?{approvalRequestId:extra.approvalRequestId}:{})},user);
    return{section:saved,synced};
  }

  /* ---------- requests (Coordinator → Dean) ---------- */
  function myRequests(){if(typeof ApprovalService==='undefined')return[];try{return ApprovalService.queryFor(actor(),{}).filter(item=>['section-create','section-archive'].includes(item.type))}catch(_){return[]}}
  function pendingForDean(){if(typeof ApprovalService==='undefined')return[];try{return ApprovalService.queryFor(actor(),{status:'pending'}).filter(item=>['section-create','section-archive'].includes(item.type))}catch(_){return[]}}
  function sectionRequestCard(request){
    const section=request.proposedChange?.section||{};
    const history=request.history||[];
    const sender=typeof RequestDetails!=='undefined'?RequestDetails.personName(request.requesterId):request.requesterId;
    return `<li class="section-request-card" data-status="${esc(request.status)}">
      <header><strong>${esc(section.id||request.targetId)}</strong><small>${esc(section.program)} · Year ${esc(section.yearLevel)} · ${esc(section.capacity)} seats</small></header>
      <h4>${request.type==='section-archive'?'Archive section':'New section'}</h4><span class="section-request-status">${esc(statusLabel(request.status))}</span>
      <p>${esc(request.reason)}</p>
      <small>Sent by: ${esc(sender)}<br>Sent: ${esc(new Date(request.submittedAt).toLocaleString())}</small>
      ${request.reviewerRemarks?`<p>Dean remarks: ${esc(request.reviewerRemarks)}</p>`:''}
      <details><summary>History (${history.length})</summary><ol>${history.map(entry=>`<li>${esc(statusLabel(entry.status))} · ${esc(new Date(entry.at).toLocaleString())}${entry.remarks?` · ${esc(entry.remarks)}`:''}</li>`).join('')}</ol></details>
      ${request.status==='pending'?`<button type="button" data-withdraw-section="${esc(request.id)}">Withdraw</button>`:''}
    </li>`;
  }
  function requestsCard(){
    const role=roleOf(actor());
    if(needsApproval()){
      const items=myRequests();
      return items.length?`<section class="section-requests" aria-label="Section requests"><header><h3>Section requests</h3></header><ul>${items.map(sectionRequestCard).join('')}</ul></section>`:'';
    }
    if(role==='dean'){
      const waiting=pendingForDean().length;
      if(!waiting)return '';
      return `<section class="section-requests is-notice"><div><strong>${waiting} section request${waiting===1?'':'s'}</strong> ${waiting===1?'is':'are'} waiting for your approval.</div><button type="button" onclick="document.querySelector('#sidebar [data-panel=&quot;approvalsSection&quot;]')?.click()">Review in Approvals</button></section>`;
    }
    return '';
  }
  const statusLabel=status=>({pending:'Waiting for Dean',approved:'Approved',rejected:'Rejected',withdrawn:'Withdrawn',cancelled:'Cancelled'}[status]||status);
  function withdraw(requestId){try{ApprovalService.withdraw(requestId,'Withdrawn from Section Management.',actor());render();notify('Section request withdrawn.','success')}catch(error){notify(error.message,'error')}}

  /* ---------- table ---------- */
  function rowMenu(section,index){return `<div class="section-command"><button type="button" class="section-command-trigger" aria-label="Actions for ${esc(section.id)}" title="Actions for ${esc(section.id)}">&#8942;</button><nav class="section-command-menu" role="menu">${facultyView()?'':`<button type="button" onclick="SectionManagement.assign(${index})"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 2.4 1.2L14 5h3.5A2.5 2.5 0 0 1 20 7.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5.5Z"/></svg><span>Assign subjects</span></button><button type="button" onclick="SectionManagement.edit(${index})"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4Z"/></svg><span>Edit section</span></button>`}<button type="button" onclick="SectionManagement.archive(${index})"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v5H3V4Zm2 7h14v9H5v-9Zm4 2v2h6v-2H9Z"/></svg><span>Archive section</span></button></nav></div>`}
  function rows(sections){return sections.map((section,index)=>{if(section.status==='archived')return '';const item=details(section),capacity=Number(section.capacity)||50;return `<tr tabindex="0" data-index="${index}" data-search="${esc(`${section.id} ${item.program} ${item.yearLevel} ${item.sectionNumber}`.toLowerCase())}" data-program="${esc(item.program)}"><td><strong>${esc(section.id)}</strong></td><td>${item.yearLevel}</td><td>${esc(item.program)}</td><td>${item.sectionNumber}</td><td><span class="section-capacity">${count(section.id)}/${capacity}</span>${rowMenu(section,index)}</td></tr>`}).join('')||'<tr><td colspan="5" class="role-empty">No sections have been created.</td></tr>'}
  function render(){
    const host=root();if(!host)return;
    const sections=read('sections'),offerings=read('sectionSubjects'),enrollments=read('studentEnrollments'),activeStudents=new Set(enrollments.map(item=>item.studentId).filter(Boolean)).size,request=needsApproval();
    host.innerHTML=`<header class="section-workspace-head"><div><p>Academic structure</p><h2>Section Management</h2><span>${request?'Request new Student groups for Dean approval, set capacity, and prepare curriculum offerings.':'Create Student groups, set capacity, and prepare curriculum offerings.'}</span></div><button type="button" class="section-add" onclick="SectionManagement.create()"><span aria-hidden="true">＋</span>${request?'Request section':'Add section'}</button></header><div class="section-summary"><article><strong>${sections.filter(section=>section.status!=='archived').length}</strong><span>Sections</span></article><article><strong>${activeStudents}</strong><span>Active Students</span></article><article><strong>${offerings.reduce((sum,item)=>sum+(item.assignments?.length||0),0)}</strong><span>Subject offerings</span></article></div>${requestsCard()}<div class="section-table-shell"><div class="section-table-tools"><input id="sectionSearch" type="search" placeholder="Search sections" aria-label="Search sections"><select id="sectionProgramFilter" aria-label="Filter by curriculum"><option value="">All curricula</option>${programs.map(program=>`<option>${program}</option>`).join('')}</select></div><div class="section-table-scroll"><table id="coordinatorSectionTable"><thead><tr><th>Unique ID</th><th>Year Level</th><th>Curriculum</th><th>Section</th><th>Students</th></tr></thead><tbody>${rows(sections)}</tbody></table></div></div>`;
    host.querySelector('#sectionSearch').oninput=filter;host.querySelector('#sectionProgramFilter').onchange=filter;
    host.querySelectorAll('[data-withdraw-section]').forEach(button=>button.onclick=()=>withdraw(button.dataset.withdrawSection));
    wireRows();
  }
  function filter(){const host=root(),query=host.querySelector('#sectionSearch').value.trim().toLowerCase(),program=host.querySelector('#sectionProgramFilter').value;host.querySelectorAll('#coordinatorSectionTable tbody tr[data-index]').forEach(row=>row.hidden=!!(query&&!row.dataset.search.includes(query)||program&&row.dataset.program!==program))}
  function wireRows(){root().querySelectorAll('#coordinatorSectionTable tbody tr[data-index]').forEach(row=>{const show=(x,y)=>{closeMenus();const menu=row.querySelector('.section-command-menu');menu.style.left=`${Math.min(x,innerWidth-215)}px`;menu.style.top=`${Math.min(y,innerHeight-155)}px`;menu.classList.add('open')};row.oncontextmenu=event=>{event.preventDefault();show(event.clientX,event.clientY)};const trigger=row.querySelector('.section-command-trigger');if(trigger)trigger.onclick=event=>{event.stopPropagation();const box=trigger.getBoundingClientRect();show(box.left,box.bottom+4)};row.onkeydown=event=>{if(event.key==='ContextMenu'||event.shiftKey&&event.key==='F10'){event.preventDefault();const box=row.getBoundingClientRect();show(box.left+30,box.top+30)}}});}

  /* ---------- editor ---------- */
  function showReason(on){editor().querySelector('[data-archive-edit]').hidden=!editingId;const label=editor().querySelector('.section-reason-field');if(label)label.hidden=!on;const reason=field('sectionReason');if(reason){reason.required=!!on;if(!on)reason.value=''}}
  function create(){ensureDialogs();editingId='';editor().querySelector('form').reset();field('sectionProgram').value='BSCS';field('sectionYear').value='1';field('sectionNumber').value='1';field('sectionCapacity').value='50';const request=needsApproval();showReason(request);editor().querySelector('#sectionDialogTitle').textContent=request?'Request a new section':'Add section';editor().querySelector('button[type="submit"]').textContent=request?'Send to Dean':'Save section';open('sectionEditorDialog')}
  function edit(index){ensureDialogs();const section=read('sections')[index];if(!section||facultyView()||section.status==='archived')return;const item=details(section);editingId=section.id;field('sectionProgram').value=item.program;field('sectionYear').value=item.yearLevel;field('sectionNumber').value=item.sectionNumber;field('sectionCapacity').value=section.capacity||50;showReason(false);editor().querySelector('#sectionDialogTitle').textContent=`Edit ${section.id} · ${count(section.id)} students`;editor().querySelector('button[type="submit"]').textContent='Save section';closeMenus();open('sectionEditorDialog')}
  function save(event){
    event.preventDefault();
    let record;
    try{record=sectionRecord({program:field('sectionProgram').value,yearLevel:field('sectionYear').value,sectionNumber:field('sectionNumber').value,capacity:field('sectionCapacity').value})}catch(error){return notify(error.message,'error')}
    const sections=read('sections'),id=record.id;
    if(sections.some(item=>item.id===id&&item.id!==editingId))return notify('That Section ID already exists.','error');
    const user=actor();
    if(!editingId){
      if(needsApproval()){
        const reason=field('sectionReason').value.trim();
        if(!reason)return notify('Add a reason for the Dean.','error');
        try{ApprovalService.submit({type:'section-create',targetType:'section',targetId:id,proposedChange:{section:record},reason,academicPeriod:'current'},user)}catch(error){return notify(error.message,'error')}
        if(typeof AuditLog!=='undefined')AuditLog.record('request-create','section',id,{program:record.program,yearLevel:record.yearLevel,sectionNumber:record.sectionNumber,capacity:record.capacity},user);
        close('sectionEditorDialog');render();notify(`Section ${id} sent to the Dean for approval.`,'success');return;
      }
      let result;try{result=commitNewSection(record,user)}catch(error){return notify(error.message,'error')}
      close('sectionEditorDialog');render();if(typeof renderCoordinatorWorkflows==='function')renderCoordinatorWorkflows();
      notify(result.synced>0?`Section ${id} created; ${result.synced} curriculum offering${result.synced===1?'':'s'} added.`:`Section ${id} saved.`,'success');return;
    }
    const existing=count(editingId);
    if(record.capacity<existing)return notify(`Capacity cannot be below the ${existing} active enrollments.`,'error');
    const prior=sections.find(item=>item.id===editingId)||{};
    const updated={...prior,...record};
    const next=sections.map(item=>item.id===editingId?updated:item);
    if(editingId!==id){const offerings=read('sectionSubjects').map(item=>item.sectionId===editingId?{...item,sectionId:id}:item),enrollments=read('studentEnrollments').map(item=>item.sectionId===editingId?{...item,sectionId:id}:item);if(!DB.write('sectionSubjects',offerings)||!DB.write('studentEnrollments',enrollments))return}
    if(!DB.write('sections',next))return;
    if(typeof AuditLog!=='undefined')AuditLog.record('update','section',id,{program:record.program,yearLevel:record.yearLevel,sectionNumber:record.sectionNumber,capacity:record.capacity,previousId:editingId!==id?editingId:undefined},user);
    close('sectionEditorDialog');render();if(typeof renderCoordinatorWorkflows==='function')renderCoordinatorWorkflows();notify(`Section ${id} saved.`,'success');
  }

  /* ---------- subjects and delete ---------- */
  function assign(index){ensureDialogs();const section=read('sections')[index];if(!section)return;activeSectionId=section.id;const item=details(section),term=SectionService.currentAcademicContext().term,subjects=read('curricula').filter(row=>row.program===item.program&&Number(row.yearLevel)===item.yearLevel&&row.term===term&&row.status!=='archived'&&row.removed!==true),current=read('sectionSubjects').find(row=>row.sectionId===section.id)?.assignments||[],assigned=new Map(current.map(row=>[row.subjectCode,row])),faculty=read('faculty');subjectsDialog().querySelector('#sectionSubjectDialogTitle').textContent=`${section.id} subject offerings`;subjectList().innerHTML=subjects.map(subject=>`<article class="section-subject-cell"><div><strong>${esc(subject.subjectCode)}</strong><span>${esc(subject.subjectName||subject.name||'Subject')}</span></div><label>Professor<select data-subject="${esc(subject.subjectCode)}"><option value="">Unassigned</option>${faculty.map(person=>`<option value="${esc(person.id)}" ${assigned.get(subject.subjectCode)?.facultyId===person.id?'selected':''}>${esc(person.last)}, ${esc(person.first)}</option>`).join('')}</select></label></article>`).join('')||'<p class="role-empty">No active curriculum subjects are available for this Section.</p>';closeMenus();open('sectionSubjectsDialog')}
  function saveSubjects(){const records=read('sectionSubjects'),existing=records.find(item=>item.sectionId===activeSectionId),assignments=[...subjectList().querySelectorAll('[data-subject]')].map((select,index)=>({id:existing?.assignments?.find(item=>item.subjectCode===select.dataset.subject)?.id||`OFR-${activeSectionId}-${select.dataset.subject}-${index+1}`,subjectCode:select.dataset.subject,facultyId:select.value})),next=existing?records.map(item=>item.sectionId===activeSectionId?{...item,assignments}:item):[...records,{sectionId:activeSectionId,assignments}];if(!DB.write('sectionSubjects',next))return;if(typeof AuditLog!=='undefined')AuditLog.record('assign-offerings','section',activeSectionId,{assignments},actor());close('sectionSubjectsDialog');render();if(typeof renderCoordinatorWorkflows==='function')renderCoordinatorWorkflows();notify(`Subject offerings for ${activeSectionId} updated.`,'success')}
  function closeMenus(){document.querySelectorAll('.section-command-menu.open').forEach(menu=>menu.classList.remove('open'))}

  function archiveProblem(section){
    if(!section||section.status==='archived')return 'This section is no longer active.';
    if(count(section.id)||read('students').some(student=>student.sections?.includes(section.id)))return 'Move the students out of this section before archiving it.';
    return '';
  }
  function commitArchive(id,user){
    const sections=read('sections'),problem=archiveProblem(sections.find(section=>section.id===id));
    if(problem)fail(problem);
    const next=sections.map(section=>section.id===id?{...section,status:'archived',archivedAt:new Date().toISOString(),archivedBy:user.username}:section);
    if(!DB.write('sections',next))fail('The section could not be archived.','SAVE_FAILED');
    if(typeof AuditLog!=='undefined')AuditLog.record('archive','section',id,{},user);
  }
  async function archive(index){
    const section=read('sections')[index],problem=archiveProblem(section);
    closeMenus();
    if(problem)return notify(problem,'error');
    const request=needsApproval();
    const fromEditor=editor().classList.contains('open');
    if(fromEditor)close('sectionEditorDialog');
    if(!await confirmDialog({title:`Archive ${section.id}?`,message:request?'Send this archive request to the Dean for approval.':'This section will be removed from active subject choices. Its records will be retained.',confirmLabel:request?'Send to Dean':'Archive section'})){
      if(fromEditor)open('sectionEditorDialog');
      return;
    }
    try{
      const user=actor();
      if(request)ApprovalService.submit({type:'section-archive',targetType:'section',targetId:section.id,proposedChange:{sectionId:section.id},reason:`Archive section ${section.id}.`},user);
      else commitArchive(section.id,user);
      close('sectionEditorDialog');
      render();
      notify(request?'Archive request sent to the Dean.':`Section ${section.id} archived.`,'success');
    }catch(error){notify(error.message,'error')}
  }

  /* ---------- approval: the Dean's approval creates the requested section ---------- */
  function installApproval(){
    if(typeof ApprovalService==='undefined')return;
    ApprovalService.registerApplyHandler('section-archive',(change,request,user)=>commitArchive(request.targetId,user));
    try{ApprovalService.registerApplyHandler('section-create',(change,request,user)=>{commitNewSection(sectionRecord(change.section||{}),user,{requestedBy:request.requesterId,approvalRequestId:request.id})})}catch(_){}
  }
  /* Used by the request cards: can the Dean approve this right now? */
  function reviewRequest(request){
    if(request?.type==='section-archive'){
      const problem=archiveProblem(read('sections').find(section=>section.id===request.targetId));
      return {canApprove:!problem,problems:problem?[problem]:[]};
    }
    const problems=[];let record=null;
    try{record=sectionRecord(request?.proposedChange?.section||{})}catch(error){problems.push(error.message)}
    if(record&&read('sections').some(item=>item.id===record.id))problems.push(`Section ${record.id} already exists.`);
    return{canApprove:!problems.length,problems,section:record};
  }

  function mount(){ensureDialogs();editor().querySelector('form').onsubmit=save;document.addEventListener('click',event=>{if(!event.target.closest('.section-command'))closeMenus()});render()}
  installApproval();
  return{mount,render,create,edit,assign,saveSubjects,archive,close,withdraw,reviewRequest,commitNewSection};
})();
if(typeof window!=='undefined')window.SectionManagement=SectionManagement;
