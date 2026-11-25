/* ==================================================================
   Dean · Member management. Two charts on top (members by role, heaviest
   teaching loads), then the members table in the shared card style with
   the icon toolbar (add, search, sort, direction, group by, export).
   Add Professor and Appoint Coordinator open as themed dialogs.
   ================================================================== */
const DeanPersonnel=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const read=key=>DB.read(key,[]);
  const NORMAL_LOAD=24;
  const initials=(first,last)=>`${String(first||'')[0]||''}${String(last||'')[0]||''}`.toUpperCase();
  async function api(path,body){const token=sessionStorage.getItem('serverSessionToken'),response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)}),data=await response.json();if(!response.ok)throw new Error(data.error||'The personnel change was rejected.');return data;}
  function loadFor(id){const offerings=read('sectionSubjects').flatMap(record=>(record.assignments||[]).map(item=>({...item,sectionId:record.sectionId}))).filter(item=>item.facultyId===id);return offerings.reduce((sum,item)=>sum+(AcademicWorkflowService.unitRecord(item.subjectCode)?.units||0),0);}
  function people(){const appointed=read('coordinators'),ids=new Set(appointed.map(item=>item.id||item.username)),faculty=read('faculty'),facultyIds=new Set(faculty.map(p=>p.id));
    // Faculty Coordinators who are not also in the faculty records are listed too (no teaching load of their own).
    const coordinatorRows=appointed.filter(c=>!facultyIds.has(c.id||c.username)&&c.status!=='disabled'&&c.disabled!==true).map(c=>({id:c.id||c.username,first:c.first||'',last:c.last||c.username,program:c.program||c.college||'CICS',displayRole:'Faculty Coordinator',load:null}));
    return[...faculty.map(person=>({...person,displayRole:ids.has(person.id)?'Faculty Coordinator':'Professor',load:loadFor(person.id)})),...coordinatorRows];}

  function charts(rows){
    const P=typeof CoordinatorPages!=='undefined'?CoordinatorPages:null;if(!P)return'';
    const professors=rows.filter(p=>p.displayRole==='Professor').length,coordinators=rows.length-professors;
    const donut=P.donut([{label:'Professors',value:professors,color:'var(--role-shell-role)'},{label:'Faculty Coordinators',value:coordinators,color:'#2f8d83'}],'members');
    const top=rows.filter(p=>p.load!==null).slice().sort((a,b)=>b.load-a.load).slice(0,8).map(p=>({label:`${p.last}, ${p.first}`,pct:Math.min(100,p.load/NORMAL_LOAD*100),text:`${p.load}/${NORMAL_LOAD}`,tone:p.load>NORMAL_LOAD?'over':p.load>=NORMAL_LOAD*.9?'high':'',title:`${p.last}, ${p.first}: ${p.load} of ${NORMAL_LOAD} units`}));
    return P.insights(P.card('Members by role',`${rows.length} people in the college`,donut),P.card('Heaviest teaching loads',`Units against the normal load of ${NORMAL_LOAD}`,P.bars(top)));
  }

  function row(person){
    const pct=Math.min(100,person.load/NORMAL_LOAD*100),tone=person.load>NORMAL_LOAD?'over':person.load>=NORMAL_LOAD*.9?'high':'';
    const coordinator=person.displayRole==='Faculty Coordinator';
    return`<tr data-id="${esc(person.id)}" data-kind="${coordinator&&person.load===null?'coordinator':'faculty'}" data-coordinator="${coordinator}" tabindex="0"><td><span class="ck-person"><span class="ck-avatar">${esc(initials(person.first,person.last))}</span><span>${esc(`${person.last||''}, ${person.first||''}`)}</span></span></td><td>${esc(person.id)}</td><td><span class="dp-pill${coordinator?' gold':''}">${esc(person.displayRole)}</span></td><td>${esc(person.program||'CICS')}</td><td class="dp-load-column">${person.load===null?'<span class="dp-muted">No teaching load</span>':`<span class="dp-load-meter"><span class="dp-load">${person.load}/${NORMAL_LOAD} units</span><i class="ck-mini"><b class="${tone}" style="width:${pct}%"></b></i></span>`}</td></tr>`;
  }

  /* ---------- Members tabs: College members · Students · Archived · Role assignments ---------- */
  let tab='members';
  const tabsNav=()=>{const n=(typeof RoleAccess!=='undefined'?RoleAccess.assignments().length:0),tabs=[['members','College members',null],['students','Students',read('students').length],['archived','Archived',read('archivedPeople').length],['roles','Role assignments',n]];return`<nav class="dp-tabs" role="tablist" aria-label="Members">${tabs.map(([id,label,count])=>`<button type="button" role="tab" data-dp-tab="${id}" class="${tab===id?'active':''}" aria-selected="${tab===id}">${label}${count===null?'':`<span>${count}</span>`}</button>`).join('')}</nav>`;};
  const HINT='<span class="dp-hint"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 2v7h8V7a3 3 0 0 0-3-3h-5Z"/></svg>Right-click a row for member actions</span>';

  /* Students: everyone currently on the roster (archived Students are not here). */
  function renderStudents(host){
    const sections=new Map(read('sections').map(s=>[s.id,s])),enrolled=new Map();
    read('studentEnrollments').forEach(e=>enrolled.set(e.studentId,(enrolled.get(e.studentId)||0)+1));
    const students=read('students').slice().sort((a,b)=>`${a.last} ${a.first}`.localeCompare(`${b.last} ${b.first}`));
    const yearName=y=>['','1st year','2nd year','3rd year','4th year'][y]||'—';
    const rows=students.map(s=>{const sec=sections.get((s.sections||[])[0]),name=`${s.last||''}, ${s.first||''}${s.middle?` ${s.middle}.`:''}`;return`<tr data-id="${esc(s.id)}" data-kind="student" tabindex="0"><td><span class="ck-person"><span class="ck-avatar">${esc(initials(s.first,s.last))}</span><span>${esc(name)}</span></span></td><td>${esc(s.id)}</td><td>${esc(sec?.program||'—')}</td><td>${esc(yearName(Number(sec?.yearLevel)))}</td><td>${esc(sec?.id||'No section')}</td><td>${enrolled.get(s.id)||0}</td></tr>`;}).join('');
    host.innerHTML=`${tabsNav()}<section class="dp-table-card"><header class="dp-table-head"><div><h3>Students</h3><p>${students.length} enrolled Students · ${HINT}</p></div><div class="dp-tools" id="deanStudentTools"></div></header><div class="dp-table-scroll"><table class="dp-table" id="deanStudentTable"><thead><tr><th>Name</th><th>ID</th><th>Program</th><th>Year</th><th>Section</th><th>Subjects</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="dp-muted">No Students yet.</td></tr>'}</tbody></table></div></section><div id="deanPersonnelForm"></div>`;
    bindTabs(host);
    if(typeof AdminTableTools!=='undefined')AdminTableTools.mount('dean-students',document.getElementById('deanStudentTable'),document.getElementById('deanStudentTools'),{exportName:'students'});
  }

  /* Archived: Students and Professors taken off every list, by the Dean or the Administrator. */
  function archivedName(entry){const r=entry.record||{};return r.first||r.last?`${r.last||''}, ${r.first||''}`:(typeof RoleAccess!=='undefined'?RoleAccess.nameOf(entry.username):entry.username);}
  function renderArchived(host){
    const list=read('archivedPeople').slice().sort((a,b)=>String(b.archivedAt).localeCompare(String(a.archivedAt)));
    const kind={student:'Student',faculty:'Professor'},by={admin:'Administrator',dean:'Dean'};
    const rows=list.map(a=>{const name=archivedName(a);return`<tr data-id="${esc(a.id)}" data-kind="archived" tabindex="0"><td><span class="ck-person"><span class="ck-avatar">${esc(initials(a.record?.first,a.record?.last)||'?')}</span><span>${esc(name)}</span></span></td><td>${esc(a.id)}</td><td><span class="dp-pill${a.kind==='faculty'?' gold':''}">${esc(kind[a.kind]||a.kind)}</span></td><td>${esc(new Date(a.archivedAt).toLocaleDateString())}</td><td>${esc(`${a.archivedBy}${by[a.archivedByRole]?` · ${by[a.archivedByRole]}`:''}`)}</td><td class="dp-reason">${esc(a.reason||'—')}</td><td><button type="button" class="dp-row-action" data-restore="${esc(a.id)}">Restore</button></td></tr>`;}).join('');
    host.innerHTML=`${tabsNav()}<section class="dp-table-card"><header class="dp-table-head"><div><h3>Archived</h3><p>Removed from every list until restored. Restoring brings back their enrollments or classes.</p></div><div class="dp-tools" id="deanArchiveTools"></div></header><div class="dp-table-scroll"><table class="dp-table" id="deanArchiveTable"><thead><tr><th>Name</th><th>ID</th><th>Type</th><th>Archived</th><th>By</th><th>Reason</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="dp-muted">Nobody is archived.</td></tr>'}</tbody></table></div></section><div id="deanPersonnelForm"></div>`;
    bindTabs(host);
    if(typeof AdminTableTools!=='undefined')AdminTableTools.mount('dean-archive',document.getElementById('deanArchiveTable'),document.getElementById('deanArchiveTools'),{exportName:'archived'});
    host.querySelectorAll('[data-restore]').forEach(b=>b.onclick=()=>restorePerson(b.dataset.restore));
  }
  function bindTabs(host){host.querySelectorAll('[data-dp-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.dpTab;render();});}
  function renderRoles(host){
    const RA=RoleAccess,list=RA.assignments().slice().sort((a,b)=>String(b.assignedAt).localeCompare(String(a.assignedAt)));
    const byRole=RA.roles().map(r=>[r.name,list.filter(a=>a.roleId===r.id).length,r.color]);
    const P=typeof CoordinatorPages!=='undefined'?CoordinatorPages:null;
    const charts=P?P.insights(P.card('Assignments by role',`${list.length} assignment${list.length===1?'':'s'}`,P.donut(byRole.filter(r=>r[1]).map(([label,value,color])=>({label,value,color})),'assigned')),P.card('How roles work','',`<ul class="dp-howto"><li><b>Administrator</b> defines roles and their permissions.</li><li><b>You</b> give a role to a person for one subject or all subjects.</li><li><b>Faculty Coordinators</b> can request a role for a Professor; it appears in Approvals.</li><li><b>Exam maker</b> lets a person create exams in that subject. <b>Intern</b> lets them view the Professor workspace without editing.</li></ul>`)):'';
    host.innerHTML=`${tabsNav()}${charts}<section class="dp-table-card"><header class="dp-table-head"><div><h3>Role assignments</h3><p>Who holds which role, and in which subject</p></div><div class="dp-tools" id="deanRoleTools"></div></header><div class="dp-table-scroll"><table class="dp-table" id="deanRoleTable"><thead><tr><th>Person</th><th>Role</th><th>Subject</th><th>Given by</th><th>Date</th><th>Until</th><th>Action</th></tr></thead><tbody>${list.map(a=>{const r=RA.roleById(a.roleId),name=RA.nameOf(a.username);return`<tr data-ra="${esc(a.id)}"><td><span class="ck-person"><span class="ck-avatar">${esc(name.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase())}</span><span>${esc(name)}<small class="dp-muted"> · ${esc(a.username)}</small></span></span></td><td><span class="ra-pill" style="--c:${esc(r?.color||'#888')}">${esc(r?.name||a.roleId)}</span></td><td><span class="ra-subject">${esc(RA.subjectName(a.subjectCode))}</span></td><td>${esc(a.via==='request'?`${a.assignedBy} · approved request`:a.assignedBy)}</td><td>${esc(new Date(a.assignedAt).toLocaleDateString())}</td><td><span class="dp-until${RA.isLive&&!RA.isLive(a)?' ended':''}">${esc(RA.expiryLabel?RA.expiryLabel(a).replace(/^Until /,''):'')}</span></td><td><button type="button" class="dp-row-action" data-ra-remove="${esc(a.id)}">Remove</button></td></tr>`;}).join('')||'<tr><td colspan="7" class="dp-muted">No roles assigned yet. Use + to give someone a role.</td></tr>'}</tbody></table></div></section><div id="deanPersonnelForm"></div>`;
    bindTabs(host);
    if(typeof AdminTableTools!=='undefined')AdminTableTools.mount('dean-roles',document.getElementById('deanRoleTable'),document.getElementById('deanRoleTools'),{exportName:'role-assignments',add:{label:'Assign a role',onClick:showAssign}});
    host.querySelectorAll('[data-ra-remove]').forEach(b=>b.onclick=async()=>{if(typeof confirmDialog==='function'&&!await confirmDialog({title:'Remove this role?',message:'The person loses the role in that subject right away.',confirmLabel:'Remove',danger:true}))return;RoleAccess.unassign(b.dataset.raRemove);notify('Role removed.','success');render();});
  }
  function showAssign(){
    const RA=RoleAccess,people=read('users').filter(u=>u.role!=='admin').map(u=>({id:u.username,name:RA.nameOf(u.username),role:u.role})),subjects=read('subjects');
    const roleLabel={faculty:'Professor',coordinator:'Faculty Coordinator',dean:'Dean',student:'Student'};
    dialog('Assign a role',`<label>Role<select name="roleId" required>${RA.roles().map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select></label><label>Subject<select name="subjectCode"><option value="*">All subjects</option>${subjects.map(s=>`<option value="${esc(s.code)}">${esc(s.code)} — ${esc(s.name)}</option>`).join('')}</select></label><label>Until<select name="until" data-dp-until><option value="">The role's own end date</option><option value="none">No end date</option><option value="date">Pick a date…</option></select></label><label data-dp-until-date hidden>Last day<input type="date" name="untilDate"></label><label class="dp-wide">Person<input name="person" list="dpPeople" required placeholder="Type a name or ID"><datalist id="dpPeople">${people.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(roleLabel[p.role]||p.role)}</option>`).join('')}</datalist></label>`,'Any account can hold any role. The role applies only in the chosen subject (or every subject).','Assign role',async values=>{const person=people.find(p=>p.id===values.person.trim()||p.name.toLowerCase()===values.person.trim().toLowerCase());if(!person)throw new Error('Pick a person from the list.');RA.assign({username:person.id,roleId:values.roleId,subjectCode:values.subjectCode,until:values.until==='date'?values.untilDate:values.until});document.getElementById('deanPersonnelForm').innerHTML='';notify(`${person.name} now has the ${RA.roleById(values.roleId)?.name} role.`,'success');render();});
    // Until: show the date box only for 'Pick a date…', and name the role's own rule.
    const form=document.querySelector('#deanPersonnelForm form');if(form){const sel=form.querySelector('[data-dp-until]'),box=form.querySelector('[data-dp-until-date]'),roleSel=form.querySelector('[name=roleId]');const sync=()=>{const on=sel.value==='date';box.hidden=!on;box.querySelector('input').required=on;const r=RA.roleById(roleSel.value);sel.options[0].textContent=`Role default · ${RA.roleExpiryLabel?RA.roleExpiryLabel(r):'No end date'}`;};sel.addEventListener('change',sync);roleSel.addEventListener('change',sync);sync();}
  }

  function render(){
    const host=document.getElementById('deanPersonnelRoot');if(!host)return;
    host.closest('section')?.classList.add('dp-page');
    bindMenu(host);
    if(tab==='roles'&&typeof RoleAccess!=='undefined')return renderRoles(host);
    if(tab==='students')return renderStudents(host);
    if(tab==='archived')return renderArchived(host);
    const rows=people();
    host.innerHTML=`${typeof RoleAccess!=='undefined'?tabsNav():''}${charts(rows)}<section class="dp-table-card"><header class="dp-table-head"><div><h3>College members</h3><p>${rows.filter(p=>p.displayRole==='Professor').length} Professors · ${rows.filter(p=>p.displayRole!=='Professor').length} Faculty Coordinators · ${HINT}</p></div><div class="dp-tools" id="deanPersonnelTools"></div></header><div class="dp-table-scroll"><table class="dp-table" id="deanPersonnelTable"><thead><tr><th>Name</th><th>ID</th><th>Role</th><th>Program</th><th class="dp-load-column" scope="col">Load</th></tr></thead><tbody>${rows.map(row).join('')||'<tr><td colspan="5" class="dp-muted">No personnel yet.</td></tr>'}</tbody></table></div></section><div id="deanPersonnelForm"></div>`;
    if(typeof AdminTableTools!=='undefined')AdminTableTools.mount('dean-members',document.getElementById('deanPersonnelTable'),document.getElementById('deanPersonnelTools'),{exportName:'college-members',add:{label:'Add Professor',onClick:showHire}});
    bindTabs(host);
  }

  /* ---------- right-click menu on Students, College members, Archived ---------- */
  const ICON={
    appoint:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM2 20v-2a7 7 0 0 1 12-5v7H2Zm17-8v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z"/></svg>',
    role:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm1 6v3h3v2h-3v3h-2v-3H8v-2h3V8h2Z"/></svg>',
    archive:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v5H3V3Zm1 6h16v12H4V9Zm5 3v2h6v-2H9Z"/></svg>',
    restore:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3Zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12Z"/></svg>',
    'exam.manage':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>',
    'workspace.view':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>'
  };
  const closeMenu=()=>document.getElementById('dpMenu')?.remove();
  function personName(id,kind){
    if(kind==='archived'){const a=read('archivedPeople').find(x=>x.id===id);return a?archivedName(a).replace(/^(.*), (.*)$/,'$2 $1'):id;}
    return typeof RoleAccess!=='undefined'?RoleAccess.nameOf(id):id;
  }
  function openMenu(row,x,y){
    closeMenu();
    const id=row.dataset.id,kind=row.dataset.kind,name=personName(id,kind);
    const item=(action,label,note,extra='')=>`<button type="button" role="menuitem" data-dp-menu="${action}"${extra}>${ICON[action]}<span>${label}${note?`<small>${note}</small>`:''}</span></button>`;
    const appointment=kind==='faculty'&&row.dataset.coordinator==='false'
      ?item('appoint','Appoint coordinator…','',' data-appoint')
      :'';
    const items=kind==='archived'
      ?item('restore','Restore','Back to every list')
      :item('role','Add role…','Choose one or more roles')+appointment+(kind==='coordinator'
        ?item('archive','Archive…','Only Students and Professors',' disabled')
        :item('archive','Archive…',kind==='student'?'Remove from every Student list':'Remove from every Professor list',' class="danger"'));
    const menu=document.createElement('div');menu.id='dpMenu';menu.className='ra-menu dp-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',`Actions for ${name}`);
    menu.innerHTML=`<p class="dp-menu-head"><strong>${esc(name)}</strong><small>${esc(id)}</small></p>${items}`;
    document.body.appendChild(menu);
    const r=menu.getBoundingClientRect();menu.style.left=`${Math.max(8,Math.min(x,innerWidth-r.width-8))}px`;menu.style.top=`${Math.max(8,Math.min(y,innerHeight-r.height-8))}px`;
    menu.querySelector('button:not([disabled])')?.focus();
    menu.addEventListener('keydown',e=>{const all=[...menu.querySelectorAll('button:not([disabled])')],i=all.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();all[(i+(e.key==='ArrowDown'?1:all.length-1))%all.length]?.focus();}if(e.key==='Escape'){closeMenu();row.focus();}});
    menu.onclick=e=>{const b=e.target.closest('[data-dp-menu]');if(!b||b.disabled)return;closeMenu();({role:()=>showAddRole(id),appoint:()=>showAppointment(id),archive:()=>showArchive(id,kind),restore:()=>restorePerson(id)})[b.dataset.dpMenu]();};
  }
  function bindMenu(host){
    if(host.dataset.dpMenu)return;host.dataset.dpMenu='1';
    const rowOf=t=>t.closest('#deanPersonnelTable tbody tr[data-id], #deanStudentTable tbody tr[data-id], #deanArchiveTable tbody tr[data-id]');
    host.addEventListener('contextmenu',e=>{const row=rowOf(e.target);if(!row)return;e.preventDefault();
      // Keyboard (menu key / Shift+F10) has no pointer position: open beside the row.
      const r=row.getBoundingClientRect();openMenu(row,e.clientX||r.left+24,e.clientY||r.bottom);});
    host.addEventListener('keydown',e=>{
      if(e.key!=='ContextMenu'&&!(e.shiftKey&&e.key==='F10'))return;
      const row=rowOf(e.target);if(!row)return;
      e.preventDefault();
      const bounds=row.getBoundingClientRect();
      openMenu(row,bounds.left+24,bounds.bottom);
    });
    document.addEventListener('click',e=>{if(!e.target.closest('#dpMenu'))closeMenu();});
    document.addEventListener('scroll',closeMenu,true);
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  }

  /* Add role: only roles the Administrator created (accessRoles), pick one or many. */
  const adminRoles=()=>{const r=DB.read('accessRoles',[]);return Array.isArray(r)?r.filter(x=>x&&x.id&&x.name):[];};
  function showAddRole(username){
    const RA=RoleAccess,roles=adminRoles(),name=RA.nameOf(username),subjects=read('subjects');
    if(!roles.length){notify('The Administrator has not created any roles yet.','info');return;}
    const caps=r=>Object.keys(r.grants||{}).filter(k=>r.grants[k]).map(k=>`<span class="dp-cap">${ICON[k]||''}${esc(RA.CAPS[k]?.label||k)}</span>`).join('')||'<span class="dp-cap">No permissions yet</span>';
    const cards=roles.map(r=>`<label class="dp-role-card" style="--c:${esc(r.color||'#888')}"><input type="checkbox" name="roleId" value="${esc(r.id)}"><span class="dp-role-dot" aria-hidden="true"></span><span class="dp-role-text"><strong>${esc(r.name)}</strong>${caps(r)}<small class="dp-role-ends">${esc(RA.roleExpiryLabel?RA.roleExpiryLabel(r):'')}</small></span><em class="dp-role-held" hidden>Already has it</em></label>`).join('');
    dialog(`Add role · ${name}`,`<fieldset class="dp-wide dp-role-grid"><legend>Roles <small>Created by the Administrator · choose one or more</small></legend>${cards}</fieldset><label>Subject<select name="subjectCode"><option value="*">All subjects</option>${subjects.map(s=>`<option value="${esc(s.code)}">${esc(s.code)} — ${esc(s.name)}</option>`).join('')}</select></label><label>Until<select name="until"><option value="">Each role's own end date</option><option value="none">No end date</option></select></label>`,'Each role applies only in the chosen subject, or in every subject.','Add roles',async values=>{
      const form=document.querySelector('#deanPersonnelForm form'),chosen=[...form.querySelectorAll('input[name=roleId]:checked:not(:disabled)')].map(i=>i.value);
      if(!chosen.length)throw new Error('Choose at least one role.');
      const added=[];for(const roleId of chosen){RA.assign({username,roleId,subjectCode:values.subjectCode,until:values.until});added.push(RA.roleById(roleId)?.name||roleId);}
      document.getElementById('deanPersonnelForm').innerHTML='';
      notify(`${name} now has ${added.join(', ')}${values.subjectCode==='*'?'':` in ${values.subjectCode}`}.`,'success');render();
    });
    // Roles the person already holds for the chosen subject are ticked and locked.
    const form=document.querySelector('#deanPersonnelForm form');if(!form)return;
    const subject=form.querySelector('[name=subjectCode]'),submit=form.querySelector('.confirm-ok');
    const sync=()=>{form.querySelectorAll('.dp-role-card').forEach(card=>{const box=card.querySelector('input'),held=RA.live().some(a=>a.username===username&&a.roleId===box.value&&(a.subjectCode==='*'||a.subjectCode===subject.value));card.classList.toggle('held',held);box.disabled=held;if(held)box.checked=true;else if(box.dataset.wasHeld)box.checked=false;box.dataset.wasHeld=held?'1':'';card.querySelector('.dp-role-held').hidden=!held;});const n=form.querySelectorAll('input[name=roleId]:checked:not(:disabled)').length;submit.textContent=n>1?`Add ${n} roles`:n?'Add role':'Add roles';submit.disabled=!n;};
    subject.addEventListener('change',sync);form.addEventListener('change',e=>{if(e.target.name==='roleId')sync();});sync();
    form.querySelector('input[name=roleId]:not(:disabled)')?.focus();
  }

  /* Archive and restore go through the server, the same as the Administrator's. */
  function showArchive(id,kind){
    const name=personName(id,kind),student=kind==='student';
    dialog(`Archive ${name}?`,`<label class="dp-wide">Reason<textarea name="reason" required placeholder="${student?'e.g. Leave of absence for the semester':'e.g. On sabbatical this academic year'}"></textarea></label>`,student?'They leave every Student list and their enrollments are set aside; they cannot sign in. Restore them from the Archived tab to bring everything back.':'They leave every Professor list and their classes become unassigned; they cannot sign in. Restore them from the Archived tab to get them back.','Archive',async values=>{
      await api(`/api/accounts/${encodeURIComponent(id)}/archive`,{reason:values.reason});
      document.getElementById('deanPersonnelForm').innerHTML='';await refresh(`${name} was archived.`);
    });
    document.querySelector('#deanPersonnelForm .confirm-ok')?.classList.add('is-danger');
    document.querySelector('#deanPersonnelForm textarea')?.focus();
  }
  async function restorePerson(id){
    const name=personName(id,'archived');
    if(typeof confirmDialog==='function'&&!await confirmDialog({title:`Restore ${name}?`,message:'They return to every list and can sign in again. Enrollments or classes that still exist are given back.',confirmLabel:'Restore'}))return;
    try{await api(`/api/accounts/${encodeURIComponent(id)}/restore`,{});await refresh(`${name} was restored.`);}catch(error){notify(error.message,'error');}
  }

  /* ---------- dialogs (themed prompt look) ---------- */
  function dialog(title,fields,note,submit,onSubmit){
    const holder=document.getElementById('deanPersonnelForm');if(!holder)return;
    holder.innerHTML=`<div class="modal-bg confirm-bg dp-dialog" style="display:flex" role="dialog" aria-modal="true" aria-label="${esc(title)}"><form class="confirm-box dp-form"><h3>${esc(title)}</h3><div class="dp-form-grid">${fields}</div>${note?`<p class="dp-form-note">${esc(note)}</p>`:''}<div class="confirm-actions"><button type="button" class="confirm-cancel" data-cancel>Cancel</button><button type="submit" class="confirm-ok">${esc(submit)}</button></div></form></div>`;
    const form=holder.querySelector('form'),close=()=>{holder.innerHTML='';};
    form.querySelector('[data-cancel]').onclick=close;
    holder.querySelector('.dp-dialog').addEventListener('click',event=>{if(event.target.classList.contains('dp-dialog'))close();});
    form.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
    form.onsubmit=async event=>{event.preventDefault();try{await onSubmit(Object.fromEntries(new FormData(form)));}catch(error){notify(error.message,'error');}};
    form.querySelector('input')?.focus();
  }
  const today=()=>new Date().toISOString().slice(0,10);
  function showHire(){
    dialog('Add Professor',`<label>Institutional ID<input name="username" required></label><label>Program<input name="program" required value="BSCS"></label><label>First name<input name="first" required></label><label>Last name<input name="last" required></label><label>Initial password<input name="password" type="password" minlength="8" required></label><label>Effective date<input name="effectiveDate" type="date" required value="${today()}"></label>`,'','Create Professor',async values=>{await api('/api/personnel/professors',values);await refresh('Professor account created.');});
  }
  function showAppointment(id){
    const person=read('faculty').find(item=>item.id===id);
    dialog(`Appoint ${person?.first||id} as Faculty Coordinator`,`<label>Program responsibility<input name="program" required value="${esc(person?.program||'BSCS')}"></label><label>Effective date<input name="effectiveDate" type="date" required value="${today()}"></label>`,'The server enforces the appointment authority configured by the Administrator.','Confirm appointment',async values=>{await api(`/api/personnel/${encodeURIComponent(id)}/appoint-coordinator`,values);await refresh('Faculty Coordinator appointed.');});
  }
  async function refresh(message){if(typeof sqliteBootstrap==='function')sqliteBootstrap();notify(message,'success');render();}
  return{render,showHire,showAppointment,showAssign,tab:t=>{tab=t;render();}};
})();
if(typeof window!=='undefined')window.DeanPersonnel=DeanPersonnel;
