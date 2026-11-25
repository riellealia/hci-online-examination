/* Role-aware student profile viewer used outside the Admin workspace. */
const RoleProfileViewer=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let context=null,activeTab='overview';
  /* Pages can add role-specific tabs, e.g. Professor enrollment tools: {role,id,label,render(studentId,context)}. */
  const extraTabs=[];
  const tabsFor=role=>[['overview','Overview'],['grades','Grades'],['activity','Activity'],...extraTabs.filter(item=>item.role===role).map(item=>[item.id,item.label])];
  function ensureHost(){
    let host=document.getElementById('roleProfileOverlay');
    if(host)return host;
    host=document.createElement('div');host.id='roleProfileOverlay';host.className='role-profile-overlay';host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Student profile');host.addEventListener('click',event=>{if(event.target===host)close()});document.body.appendChild(host);return host;
  }
  function data(){return{students:DB.read('students',[]),faculty:DB.read('faculty',[]),subjects:DB.read('subjects',[]),enrollments:DB.read('studentEnrollments',[]),allotments:DB.read('allotments',[]),sectionSubjects:DB.read('sectionSubjects',[]),exams:DB.read('exams',[]),submissions:DB.read('studentSubmissions',[]),audit:DB.read('applicationAuditLog',[])};}
  function relevant(d,student){
    const enrollment=d.enrollments.filter(item=>item.studentId===student.id&&(!context.subjectCode||item.subjectCode===context.subjectCode)&&(!context.sectionId||item.sectionId===context.sectionId));
    if(enrollment.length)return enrollment;
    return d.allotments.filter(item=>item.studentId===student.id&&(!context.subjectCode||item.subjectCode===context.subjectCode)&&(!context.viewerId||context.viewerRole!=='faculty'||item.facultyId===context.viewerId)).map(item=>({studentId:item.studentId,subjectCode:item.subjectCode,sectionId:context.sectionId||(student.sections||[])[0]||'Legacy section'}));
  }
  /* ---------- Shared pieces ---------- */
  const marks=sub=>Number(sub.score??(sub.answers||[]).reduce((sum,a)=>sum+(Number(a.awarded)||0),0))||0;
  const pctOf=sub=>Number(sub.total)>0?marks(sub)/Number(sub.total)*100:0;
  const fmtDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})};
  function sectionInfo(d,sectionId){const section=(DB.read('sections',[])||[]).find(item=>String(item.id)===String(sectionId));const year=section?.yearLevel||Number(String(sectionId).match(/^\d/)?.[0])||null;return{program:section?.program||String(sectionId).replace(/^\d|-\d+$/g,'')||'—',year};}
  const ordinal=n=>n?`${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'} year`:'—';
  function infoGrid(rows){return `<dl class="rp-info">${rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${value}</dd></div>`).join('')}</dl>`;}

  /* Score trend: one point per examination, in date order, passing line dashed. */
  function trendChart(points,passing){
    if(!points.length)return '<p class="rp-empty">No graded examinations yet.</p>';
    const W=560,H=200,L=34,R=14,T=12,B=28,pw=W-L-R,ph=H-T-B,x=i=>points.length===1?L+pw/2:L+pw*i/(points.length-1),y=v=>T+ph-ph*Math.max(0,Math.min(100,v))/100;
    const grid=[0,25,50,75,100].map(v=>`<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+3}" text-anchor="end">${v}</text>`).join('');
    const line=points.map((p,i)=>`${x(i)},${y(p.pct)}`).join(' ');
    const dots=points.map((p,i)=>`<circle cx="${x(i)}" cy="${y(p.pct)}" r="4.5" class="${p.pct>=p.passing?'ok':'low'}"><title>${esc(p.title)}: ${p.pct.toFixed(1)}%</title></circle>`).join('');
    const labels=points.map((p,i)=>`<text x="${x(i)}" y="${H-8}" text-anchor="middle">E${i+1}</text>`).join('');
    return `<svg class="rp-trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score per examination"><g class="rp-grid">${grid}</g><line class="rp-pass" x1="${L}" x2="${W-R}" y1="${y(passing)}" y2="${y(passing)}"/>${points.length>1?`<polyline class="rp-line" points="${line}"/>`:''}${dots}${labels}</svg>`;
  }
  function donut(parts,total){
    const r=42,c=2*Math.PI*r;let offset=0;
    const arcs=parts.filter(p=>p.value>0).map(p=>{const len=total?p.value/total*c:0;const arc=`<circle r="${r}" cx="55" cy="55" fill="none" stroke="${p.color}" stroke-width="14" stroke-dasharray="${Math.max(0,len-2)} ${c}" stroke-dashoffset="${-offset}" transform="rotate(-90 55 55)"/>`;offset+=len;return arc}).join('');
    return `<div class="rp-donut"><svg viewBox="0 0 110 110" aria-hidden="true"><circle r="${r}" cx="55" cy="55" fill="none" class="rp-donut-track" stroke-width="14"/>${arcs}<text x="55" y="58" text-anchor="middle">${total}</text></svg><ul>${parts.map(p=>`<li><i style="background:${p.color}"></i>${esc(p.label)}<b>${p.value}</b></li>`).join('')}</ul></div>`;
  }

  /* ---------- Professor Overview: grades, test scores, charts ---------- */
  function facultyOverview(d,student,enrollment,submissions){
    const today=new Date().toISOString().slice(0,10),mine=d.exams.filter(exam=>(context.allExams||exam.facultyId===context.viewerId)&&(!context.subjectCode||exam.subjectCode===context.subjectCode));
    const sections=[...new Set(enrollment.map(item=>item.sectionId))],codes=[...new Set(enrollment.map(item=>item.subjectCode))];
    const forStudent=mine.filter(exam=>codes.includes(exam.subjectCode)&&(!(exam.sections||[]).length||(exam.sections||[]).some(id=>sections.includes(id))));
    const latest=new Map();submissions.forEach(sub=>{const prev=latest.get(sub.examId);if(!prev||new Date(sub.submittedAt)>new Date(prev.submittedAt))latest.set(sub.examId,sub)});
    const taken=[...latest.values()],passOf=exam=>Number(exam?.passingPercent)||70;
    const passed=taken.filter(sub=>pctOf(sub)>=passOf(d.exams.find(e=>e.id===sub.examId))).length,failed=taken.length-passed;
    const missed=forStudent.filter(exam=>exam.date&&exam.date<today&&!latest.has(exam.id)).length;
    const avg=taken.length?taken.reduce((sum,sub)=>sum+pctOf(sub),0)/taken.length:null;
    const totalMarks=taken.reduce((s,sub)=>s+marks(sub),0),totalPossible=taken.reduce((s,sub)=>s+Number(sub.total||0),0);
    const overall=totalPossible&&typeof gradeFor==='function'?gradeFor(totalMarks,totalPossible):null;
    const stats=[[avg===null?'—':`${avg.toFixed(1)}%`,'Average score'],[overall?overall.rating:'—','Grade so far'],[`${taken.length}/${forStudent.length}`,'Exams taken'],[String(missed),'Missed']];
    const subjectRows=codes.map(code=>{
      const subject=d.subjects.find(item=>item.code===code),subs=taken.filter(sub=>d.exams.find(e=>e.id===sub.examId)?.subjectCode===code);
      const score=subs.reduce((s,sub)=>s+marks(sub),0),total=subs.reduce((s,sub)=>s+Number(sub.total||0),0),grade=total&&typeof gradeFor==='function'?gradeFor(score,total):null;
      const subjectExams=forStudent.filter(exam=>exam.subjectCode===code),section=enrollment.find(item=>item.subjectCode===code)?.sectionId||'—';
      return `<tr><td><strong>${esc(code)}</strong><small>${esc(subject?.name||'')}</small></td><td>${esc(section)}</td><td>${subs.length}/${subjectExams.length}</td><td>${total?`${(score/total*100).toFixed(1)}%`:'—'}</td><td>${grade?`<span class="rp-grade ${grade.passed?'ok':'low'}">${grade.rating}</span><small>${esc(grade.remark)}</small>`:'<span class="rp-muted">No results</span>'}</td></tr>`;
    }).join('');
    const points=taken.map(sub=>({sub,exam:d.exams.find(e=>e.id===sub.examId)})).sort((a,b)=>String(a.exam?.date||a.sub.submittedAt).localeCompare(String(b.exam?.date||b.sub.submittedAt))).map(({sub,exam})=>({title:exam?.title||sub.examId,pct:pctOf(sub),passing:passOf(exam)}));
    const passing=forStudent.length?Math.round(forStudent.reduce((s,e)=>s+passOf(e),0)/forStudent.length):70;
    const recent=taken.slice().sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,6).map(sub=>{const exam=d.exams.find(e=>e.id===sub.examId),p=pctOf(sub),ok=p>=passOf(exam);return `<li><span><strong>${esc(exam?.title||sub.examId)}</strong><small>${esc(exam?.subjectCode||'')} · ${fmtDate(sub.submittedAt)}</small></span><span class="rp-score"><i><b class="${ok?'ok':'low'}" style="width:${Math.min(100,p)}%"></b></i><em>${marks(sub)}/${sub.total}</em><span class="rp-grade ${ok?'ok':'low'}">${Math.round(p)}%</span></span></li>`}).join('');
    return `<div class="rp-stats">${stats.map(([v,l])=>`<div><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div>
      <div class="rp-grid-2"><section class="rp-card"><header><h3>Test scores</h3><span>Passing ${passing}%</span></header>${trendChart(points,passing)}</section><section class="rp-card"><header><h3>Results</h3></header>${donut([{label:'Passed',value:passed,color:'var(--pr-accent)'},{label:'Failed',value:failed,color:'#b5534b'},{label:'Missed',value:missed,color:'#8a7a6d'}],passed+failed+missed)}</section></div>
      <section class="rp-card"><header><h3>${context.allExams?'Grades by subject':'Grades in your subjects'}</h3></header><div class="rp-table"><table><thead><tr><th>Subject</th><th>Section</th><th>Exams</th><th>Average</th><th>Grade</th></tr></thead><tbody>${subjectRows||'<tr><td colspan="5">No matching enrollment.</td></tr>'}</tbody></table></div></section>
      <section class="rp-card"><header><h3>Recent test scores</h3></header>${recent?`<ul class="rp-recent">${recent}</ul>`:'<p class="rp-empty">No submissions for your examinations yet.</p>'}</section>
      ${context.allExams?'<p class="rp-scope">Covers every subject the student is enrolled in this period.</p>':'<p class="rp-scope"><strong>Privacy scope:</strong> Only records connected to subjects and examinations handled by you are shown.</p>'}`;
  }

  function renderFaculty(d,student,enrollment){
    const extra=extraTabs.find(item=>item.role===context.viewerRole&&item.id===activeTab);if(extra)return extra.render(student.id,context);
    const examIds=new Set(d.exams.filter(exam=>exam.facultyId===context.viewerId&&(!context.subjectCode||exam.subjectCode===context.subjectCode)).map(exam=>exam.id));
    const submissions=d.submissions.filter(item=>item.studentId===student.id&&examIds.has(item.examId));
    if(activeTab==='grades')return `<div class="role-profile-table"><table><thead><tr><th>Examination</th><th>Submitted</th><th>Score</th><th>Status</th></tr></thead><tbody>${submissions.map(item=>{const exam=d.exams.find(x=>x.id===item.examId),score=Number(item.score??(item.answers||[]).reduce((sum,a)=>sum+(Number(a.awarded)||0),0)),total=Number(item.total)||0,pct=total?Math.round(score/total*100):0;return `<tr><td>${esc(exam?.title||item.examId)}</td><td>${esc(item.submittedAt?new Date(item.submittedAt).toLocaleString():'—')}</td><td>${score}/${total} · ${pct}%</td><td>${pct>=(exam?.passingPercent||75)?'Passed':'Failed'}</td></tr>`}).join('')||'<tr><td colspan="4">No submissions for your examinations.</td></tr>'}</tbody></table></div>`;
    if(activeTab==='activity'){const logs=d.audit.filter(item=>item.actorId===student.id&&(examIds.has(item.entityId)||examIds.has(item.details?.examId)));return `<div class="role-profile-table"><table><thead><tr><th>Activity</th><th>Record</th><th>Date</th></tr></thead><tbody>${logs.map(item=>`<tr><td>${esc(item.action)}</td><td>${esc(item.entityType)} ${esc(item.entityId||'')}</td><td>${esc(new Date(item.at).toLocaleString())}</td></tr>`).join('')||'<tr><td colspan="3">No relevant activity recorded.</td></tr>'}</tbody></table></div>`;}
    return facultyOverview(d,student,enrollment,submissions);
  }
  /* Classmate view: basic information only. */
  function renderStudent(d,student,enrollment){
    const subjects=[...new Set(enrollment.map(item=>item.subjectCode))],sections=[...new Set([...enrollment.map(item=>item.sectionId),...(student.sections||[])])];
    const info=sectionInfo(d,sections[0]);
    const basics=infoGrid([['Full name',esc(`${student.first} ${student.last}`)],['Student ID',esc(student.id)],['Program',esc(info.program)],['Year level',esc(ordinal(info.year))],['Section',esc(sections.join(', ')||'—')]]);
    const shared=subjects.map(code=>{const subject=d.subjects.find(item=>item.code===code);return `<li><span class="rp-chip">${esc(code)}</span><span>${esc(subject?.name||code)}</span></li>`}).join('');
    return `<div class="role-profile-public"><section class="rp-card"><header><h3>Basic information</h3></header>${basics}</section><section class="rp-card"><header><h3>Shared class information</h3></header><p class="rp-lead">${context?.preview?`Classmates see only the classes they share with ${esc(student.first)}. These are all of ${esc(student.first)}’s current classes.`:`You and ${esc(student.first)} share the following current class context.`}</p><ul class="rp-shared">${shared||'<li>No shared subjects.</li>'}</ul></section><div class="role-profile-privacy">Grades, submissions, activity, login details, credentials, and other private information are hidden from fellow students.</div></div>`;
  }
  function render(){const host=ensureHost(),d=data(),student=d.students.find(item=>item.id===context.studentId);if(!student){close();return}const enrollment=relevant(d,student),facultyView=context.viewerRole==='faculty';const initials=`${student.first?.[0]||''}${student.last?.[0]||''}`.toUpperCase();host.innerHTML=`<article class="role-profile-page"><header class="role-profile-head"><div class="role-profile-avatar">${esc(initials)}</div><div><small>${facultyView?'Student academic profile':'Classmate profile'}</small><h2>${esc(student.first)} ${esc(student.last)}</h2>${facultyView?`<p>${esc(student.id)} · ${esc([...new Set(enrollment.map(item=>item.sectionId))].join(', ')||'No matching section')}</p>`:`<p>${context?.preview?'Preview · what other students can see':'Limited public information'}</p>`}</div><button type="button" class="role-profile-close" onclick="RoleProfileViewer.close()" aria-label="Close profile">×</button></header>${facultyView?`<nav class="role-profile-tabs" aria-label="Student profile sections">${tabsFor(context.viewerRole).map(([id,label])=>`<button type="button" class="${activeTab===id?'active':''}" aria-pressed="${activeTab===id}" onclick="RoleProfileViewer.tab('${id}')">${label}</button>`).join('')}</nav>`:''}<main class="role-profile-content">${facultyView?renderFaculty(d,student,enrollment):renderStudent(d,student,enrollment)}</main></article>`;host.classList.add('open');document.body.classList.add('profile-view-open');host.querySelector('.role-profile-close')?.focus();}
  function openStudent(studentId,options={}){const session=DB.read('currentUser',null)||{};context={studentId,preview:!!options.preview,viewerRole:options.viewerRole||session.role,viewerId:options.viewerId||session.username,subjectCode:options.subjectCode||'',sectionId:options.sectionId||''};const d=data(),student=d.students.find(item=>item.id===studentId);if(!student)return;const matches=relevant(d,student);if(context.viewerRole==='faculty'&&!matches.length)return;if(context.viewerRole==='student'&&!options.preview){const viewer=d.students.find(item=>item.id===context.viewerId),viewerMatches=viewer?relevant(d,viewer):[];const shared=matches.some(a=>viewerMatches.some(b=>a.subjectCode===b.subjectCode&&a.sectionId===b.sectionId));if(!shared)return;}activeTab='overview';render();}
  function tab(name){if(!context||!tabsFor(context.viewerRole).some(([id])=>id===name))return;activeTab=name;render();}
  function registerTabs(role,tabs){(tabs||[]).forEach(item=>{if(item?.id&&!extraTabs.some(existing=>existing.role===role&&existing.id===item.id))extraTabs.push({...item,role});});}
  function refresh(){if(context&&document.getElementById('roleProfileOverlay')?.classList.contains('open'))render();}
  function current(){return context?{...context}:null;}
  function close(){document.getElementById('roleProfileOverlay')?.classList.remove('open');document.body.classList.remove('profile-view-open');}
  /* Performance block (stats, charts, grades, recent scores) for oversight
     roles (Admin, Coordinator): all of the student's subjects. */
  function performance(studentId){
    const d=data(),student=d.students.find(item=>item.id===studentId);if(!student)return '';
    const saved=context;context={studentId,viewerRole:'oversight',viewerId:'',subjectCode:'',sectionId:'',allExams:true};
    try{const enrollment=d.enrollments.filter(item=>item.studentId===studentId);const codes=new Set(enrollment.map(item=>item.subjectCode));const examIds=new Set(d.exams.filter(exam=>codes.has(exam.subjectCode)).map(exam=>exam.id));
      return `<div class="rp-performance"><h3 class="rp-section-title">Performance</h3>${facultyOverview(d,student,enrollment,d.submissions.filter(item=>item.studentId===studentId&&examIds.has(item.examId)))}</div>`;}
    finally{context=saved;}
  }
  return{openStudent,tab,close,registerTabs,refresh,current,performance};
})();
window.RoleProfileViewer=RoleProfileViewer;
