/* ==================================================================
   Faculty Coordinator requests to the Dean, from a right-click on the
   Professor or Student table:
   - Add roles…     roles the Administrator created; one request per role.
   - Add subjects…  classes that fit the person's normal load and do not
                    clash with their schedule.
   - Add load…      the same, for classes that go past the normal load up to
                    the maximum (an overload).
   Nothing changes until the Dean approves; every request appears on the
   Coordinator's Applications page and in the Dean's Approvals.
   RequestDetails (below) describes any request the same way on both pages.
   ================================================================== */
const RequestDetails = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = k => DB.read(k, []) || [];
  const LABEL = { 'role-assignment': 'Role', 'professor-assignment': 'Professor subject', 'professor-overload': 'Professor overload', 'student-enrollment': 'Student subject', 'student-overload': 'Student overload', 'faculty-student-enrollment': 'Enrollment change' };
  const ICON = {
    role: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm1 6v3h3v2h-3v3h-2v-3H8v-2h3V8h2Z"/></svg>',
    subjects: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h11a2 2 0 0 1 2 2v9h-2V4H6v16h7v2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm2 4h7v2H8V6Zm0 4h7v2H8v-2Zm11 6h3v2h-3v3h-2v-3h-3v-2h3v-3h2v3Z"/></svg>',
    load: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5Zm-7.6 8.2L2 12.4l10 5 10-5-2.4-1.2L12 15l-7.6-3.8Zm0 4L2 16.4l10 5 10-5-2.4-1.2L12 19l-7.6-3.8Z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h2v2H4V5Zm4 0h12v2H8V5Zm-4 6h2v2H4v-2Zm4 0h12v2H8v-2Zm-4 6h2v2H4v-2Zm4 0h12v2H8v-2Z"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3a9 9 0 0 0-9 9H1l4 4 4-4H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3Zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8H12Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v5.4l3.6 2.1-1 1.7-4.6-2.7V7h2Z"/></svg>',
    'exam.manage': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.25V21h3.75L17.8 9.94l-3.75-3.75L3 17.25ZM20.7 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z"/></svg>',
    'workspace.view': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg>'
  };
  function personName(id) {
    const p = [...read('students'), ...read('faculty')].find(x => x.id === id), u = read('users').find(x => x.username === id);
    return `${p?.first || u?.first || ''} ${p?.last || u?.last || ''}`.trim() || id;
  }
  const subjectName = code => read('subjects').find(s => s.code === code)?.name || '';
  const kindOf = type => /^role/.test(type) ? 'role' : /overload/.test(type) ? 'load' : 'subjects';
  /* Title, who it is for, and detail chips for one request. */
  function describe(request) {
    const c = request.proposedChange || {}, W = typeof AcademicWorkflowService !== 'undefined' ? AcademicWorkflowService : null, chips = [];
    let who = c.username || c.studentId || c.facultyId || '', title = LABEL[request.type] || request.type, review = null;
    if (request.type === 'role-assignment') {
      title = `Role · ${c.roleName || c.roleId}`;
      chips.push(['Subject', c.subjectCode === '*' || !c.subjectCode ? 'All subjects' : `${c.subjectCode} ${subjectName(c.subjectCode)}`.trim()]);
    } else if (['professor-assignment', 'professor-overload'].includes(request.type) && W?.reviewProfessorLoad) {
      review = W.reviewProfessorLoad({ ...request, proposedChange: { ...c, overload: request.type === 'professor-overload' } });
      title = `${LABEL[request.type]} · ${review.subjectCode || c.offeringId}`;
      chips.push(['Class', `${review.subjectCode} ${subjectName(review.subjectCode)} · ${review.sectionId || ''}`.trim()], ['Load', `${review.currentUnits} → ${review.proposedUnits} units`], ['Limits', `${review.policy.normal} normal · ${review.policy.maximum} max`]);
    } else if (['student-enrollment', 'student-overload'].includes(request.type) && W) {
      review = request.type === 'student-enrollment' ? W.reviewStudentEnrollment(c) : W.reviewStudentOverload(request);
      const code = c.subjectCode || review.subjectCode;
      title = `${LABEL[request.type]} · ${code}`;
      chips.push(['Class', `${code} ${subjectName(code)} · ${c.sectionId || review.sectionId || ''}`.trim()], ['Load', `${review.currentUnits ?? '?'} → ${review.proposedUnits ?? '?'} units`], ['Limits', `${review.policy.normalLimit} normal · ${review.policy.maximumLimit} max`]);
    }
    // A decided request shows the load as it was when it was sent, not today's.
    if (request.status && request.status !== 'pending' && Number.isFinite(c.currentUnits) && Number.isFinite(c.proposedUnits)) chips.forEach(chip => { if (chip[0] === 'Load') chip[1] = `${c.currentUnits} → ${c.proposedUnits} units`; });
    const slots = c.offeringId && W ? W.scheduleSlots(read('sectionSubjects').flatMap(r => r.assignments || []).find(a => a.id === c.offeringId)) : [];
    if (slots.length) chips.push(['Schedule', slots.map(s => `${s.days.map(d => d.slice(0, 3)).join('/')} ${s.start}–${s.end}${s.room ? ` · ${s.room}` : ''}`).join('; ')]);
    return { title, kind: kindOf(request.type), label: LABEL[request.type] || request.type, who, whoName: who ? personName(who) : '', chips, review };
  }
  /* Detail block used inside the request cards on both pages. */
  function detailsHtml(request, { forDean = false } = {}) {
    const d = describe(request), blocked = forDean && request.status === 'pending' && d.review && d.review.canApprove === false;
    const chips = [[`For`, d.who ? `${d.whoName} · ${d.who}` : '—'], ...d.chips, ['Sent by', request.requesterId], ['Sent', new Date(request.submittedAt).toLocaleString()]];
    if (request.reviewerRemarks) chips.push(['Dean remarks', request.reviewerRemarks]);
    return `<div class="role-request-meta rq-meta">${chips.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('')}</div>${blocked ? `<p class="role-review-blocked"><strong>Approval blocked:</strong> ${esc(d.review.problems.join(' '))}</p>` : ''}`;
  }
  function titleHtml(request) { const d = describe(request); return `<span class="rq-title"><span class="rq-icon rq-${d.kind}">${ICON[d.kind]}</span>${esc(d.title)}</span>`; }
  return { describe, detailsHtml, titleHtml, LABEL, ICON, personName, esc };
})();

const RequestActions = (() => {
  const { esc, ICON } = RequestDetails;
  const read = k => DB.read(k, []) || [];
  const W = () => AcademicWorkflowService;
  const session = () => (typeof getSession === 'function' ? getSession() : null) || DB.read('currentUser', null);
  const DAY = d => String(d).slice(0, 3);

  /* ---------- menu ---------- */
  const closeMenu = () => document.getElementById('raMenu')?.remove();
  function openMenu(kind, id, x, y, row) {
    closeMenu();
    const name = RequestDetails.personName(id);
    const item = (key, icon, label, note, extra = '') => `<button type="button" role="menuitem" data-ra="${key}"${extra}>${ICON[icon]}<span>${label}<small>${note}</small></span></button>`;
    const views = kind === 'student'
      ? item('view-subjects', 'list', 'View enrollment', 'Subjects and schedule') + item('view-overview', 'profile', 'View profile', 'Read-only') + item('view-history', 'history', 'View exam history', 'Results so far')
      : item('open', 'profile', 'Open profile', 'Load and classes');
    const menu = document.createElement('div'); menu.id = 'raMenu'; menu.className = 'ra-menu rq-menu'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', `Requests for ${name}`);
    menu.innerHTML = `<p class="rq-menu-head"><strong>${esc(name)}</strong><small>${esc(id)} · ${kind === 'student' ? 'Student' : 'Professor'}</small></p>
      <p class="rq-menu-group">Send to the Dean</p>
      ${item('request', 'role', 'Add roles…', 'Roles made by the Administrator')}
      ${item('subjects', 'subjects', 'Add subjects…', 'Within their normal load')}
      ${item('load', 'load', 'Add load…', 'Overload, up to the maximum')}
      <hr>${views}`;
    document.body.appendChild(menu);
    const r = menu.getBoundingClientRect(); menu.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`; menu.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
    menu.querySelector('button')?.focus();
    menu.addEventListener('keydown', e => { const all = [...menu.querySelectorAll('button')], i = all.indexOf(document.activeElement); if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length]?.focus(); } if (e.key === 'Escape') { closeMenu(); row?.focus(); } });
    menu.onclick = e => {
      const k = e.target.closest('[data-ra]')?.dataset.ra; if (!k) return; closeMenu();
      if (k === 'request') rolesDialog(kind, id);
      else if (k === 'subjects' || k === 'load') classesDialog(kind, id, k);
      else if (k === 'open') row?.click();
      else if (k.startsWith('view-') && typeof CoordinatorStudentManagement !== 'undefined') CoordinatorStudentManagement.open(id, k.slice(5));
    };
  }

  /* ---------- shared prompt ---------- */
  function prompt({ title, sub, body, submit, onSubmit, wide = false }) {
    document.getElementById('rqDialog')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg confirm-bg rq-dialog" id="rqDialog" style="display:flex" role="dialog" aria-modal="true" aria-label="${esc(title)}"><form class="confirm-box rq-form${wide ? ' wide' : ''}"><h3>${esc(title)}</h3>${sub ? `<p class="rq-sub">${sub}</p>` : ''}<div class="rq-body">${body}</div><label class="rq-reason">Reason for the Dean<textarea name="reason" required placeholder="e.g. Covering the class while the regular Professor is on leave."></textarea></label><div class="confirm-actions"><button type="button" class="confirm-cancel">Cancel</button><button type="submit" class="confirm-ok">${esc(submit)}</button></div></form></div>`);
    const modal = document.getElementById('rqDialog'), form = modal.querySelector('form'), close = () => modal.remove();
    form.querySelector('.confirm-cancel').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    form.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    form.onsubmit = e => { e.preventDefault(); onSubmit(form, close); };
    return form;
  }
  // Send one request per selected item; report what went through and what did not.
  function sendAll(items, send, describeItem, close) {
    const ok = [], failed = [];
    for (const it of items) { try { send(it); ok.push(describeItem(it)); } catch (error) { failed.push(`${describeItem(it)}: ${error.code === 'DUPLICATE_PENDING' ? 'already waiting for the Dean' : error.message}`); } }
    if (ok.length) { close(); notify(`${ok.length} request${ok.length === 1 ? '' : 's'} sent to the Dean: ${ok.join(', ')}.`, 'success'); }
    if (failed.length) notify(`Not sent — ${failed.join(' · ')}`, 'error');
    refreshPages();
  }
  function refreshPages() { try { if (typeof renderCoordinatorWorkflows === 'function') renderCoordinatorWorkflows(); } catch (_) {} try { renderAllRequests(); } catch (_) {} }

  /* ---------- Add roles ---------- */
  const adminRoles = () => read('accessRoles').filter(r => r && r.id && r.name);
  function rolesDialog(kind, username) {
    const RA = typeof RoleAccess !== 'undefined' ? RoleAccess : null, roles = adminRoles(), name = RequestDetails.personName(username);
    if (!RA || !roles.length) { notify('The Administrator has not created any roles yet.', 'info'); return; }
    const teaching = kind === 'faculty' ? new Set(read('sectionSubjects').flatMap(r => r.assignments || []).filter(a => a.facultyId === username).map(a => a.subjectCode)) : new Set(read('studentEnrollments').filter(e => e.studentId === username).map(e => e.subjectCode));
    const subjects = read('subjects'), mine = subjects.filter(s => teaching.has(s.code)), rest = subjects.filter(s => !teaching.has(s.code));
    const caps = r => Object.keys(r.grants || {}).filter(k => r.grants[k]).map(k => `<span class="rq-cap">${ICON[k] || ''}${esc(RA.CAPS[k]?.label || k)}</span>`).join('') || '<span class="rq-cap">No permissions yet</span>';
    const body = `<fieldset class="rq-roles"><legend>Roles <small>Created by the Administrator · choose one or more</small></legend>${roles.map(r => `<label class="rq-role" style="--c:${esc(r.color || '#888')}"><input type="checkbox" name="roleId" value="${esc(r.id)}"><span class="rq-check" aria-hidden="true"></span><span class="rq-role-text"><strong>${esc(r.name)}</strong>${caps(r)}</span><em class="rq-badge" hidden></em></label>`).join('')}</fieldset>
      <label class="rq-field">Subject<select name="subjectCode"><option value="*">All subjects</option>${mine.length ? `<optgroup label="${kind === 'faculty' ? 'Teaches' : 'Enrolled in'}">${mine.map(s => `<option value="${esc(s.code)}">${esc(s.code)} — ${esc(s.name)}</option>`).join('')}</optgroup>` : ''}<optgroup label="All subjects">${rest.map(s => `<option value="${esc(s.code)}">${esc(s.code)} — ${esc(s.name)}</option>`).join('')}</optgroup></select></label>`;
    const form = prompt({ title: `Add roles · ${name}`, sub: 'The Dean reviews each role in Approvals. It works only after the Dean approves it.', body, submit: 'Send to Dean', onSubmit: (f, close) => {
      const chosen = [...f.querySelectorAll('input[name=roleId]:checked:not(:disabled)')].map(i => i.value), subjectCode = f.subjectCode.value, reason = f.reason.value;
      if (!chosen.length) return notify('Choose at least one role.', 'error');
      sendAll(chosen, roleId => RA.request({ username, roleId, subjectCode, reason }), roleId => RA.roleById(roleId)?.name || roleId, close);
    } });
    const pending = () => read('approvalRequests').filter(r => r.type === 'role-assignment' && r.status === 'pending' && r.proposedChange?.username === username);
    const sync = () => {
      const code = form.subjectCode.value;
      form.querySelectorAll('.rq-role').forEach(card => {
        const box = card.querySelector('input'), badge = card.querySelector('.rq-badge');
        const held = RA.live().some(a => a.username === username && a.roleId === box.value && (a.subjectCode === '*' || a.subjectCode === code));
        const waiting = pending().some(r => r.proposedChange.roleId === box.value && (r.proposedChange.subjectCode === code || r.proposedChange.subjectCode === '*'));
        const locked = held || waiting; if (locked) box.checked = false; box.disabled = locked; card.classList.toggle('locked', locked);
        badge.hidden = !locked; badge.textContent = held ? 'Has it' : 'Waiting for Dean';
      });
      const n = form.querySelectorAll('input[name=roleId]:checked').length, btn = form.querySelector('.confirm-ok');
      btn.disabled = !n; btn.textContent = n > 1 ? `Send ${n} requests to Dean` : 'Send to Dean';
    };
    form.subjectCode.addEventListener('change', sync); form.addEventListener('change', e => { if (e.target.name === 'roleId') sync(); }); sync();
    form.querySelector('input[name=roleId]:not(:disabled)')?.focus();
  }

  /* ---------- Add subjects / Add load ---------- */
  function offerings() {
    const sections = new Map(read('sections').map(s => [s.id, s])), records = read('sectionSubjects');
    let active = null;
    try { if (typeof SectionService !== 'undefined' && SectionService.assignmentOfferings) active = new Set(SectionService.assignmentOfferings(records, read('sections'), read('curricula')).map(o => o.id)); } catch (_) {}
    return records.flatMap(r => (r.assignments || []).map(a => ({ ...a, sectionId: r.sectionId, section: sections.get(r.sectionId) || {} }))).filter(o => !active || active.has(o.id));
  }
  const overlap = (a, b) => a.days.some(d => b.days.includes(d)) && a.start < b.end && b.start < a.end;
  const slotText = slots => slots.length ? slots.map(s => `${s.days.map(DAY).join('/')} ${s.start}–${s.end}${s.room ? ` · ${s.room}` : ''}`).join('; ') : 'No schedule yet';
  function context(kind, id) {
    const wf = W(), all = offerings();
    if (kind === 'faculty') {
      const mine = all.filter(o => o.facultyId === id), p = wf.professorPolicy();
      return { current: wf.professorLoad(id), normal: p.normal, maximum: p.maximum, busyOf: mine, home: null, pool: all.filter(o => !o.facultyId) };
    }
    const student = read('students').find(s => s.id === id) || {}, enrolled = read('studentEnrollments').filter(e => e.studentId === id), codes = new Set(enrolled.map(e => e.subjectCode));
    const byId = new Map(all.map(o => [o.id, o])), mine = enrolled.map(e => byId.get(e.offeringId)).filter(Boolean), policy = wf.loadPolicyForStudent(id);
    const counts = new Map(); read('studentEnrollments').forEach(e => counts.set(e.sectionId, (counts.get(e.sectionId) || new Set()).add(e.studentId)));
    return { current: wf.studentLoad(id), normal: policy.normalLimit, maximum: policy.maximumLimit, busyOf: mine, home: (student.sections || [])[0], homeProgram: policy.program, homeYear: policy.year, pool: all.filter(o => !codes.has(o.subjectCode)), full: o => Number(o.section.capacity) > 0 && (counts.get(o.sectionId)?.size || 0) >= Number(o.section.capacity) };
  }
  function classesDialog(kind, id, mode) {
    const wf = W(), ctx = context(kind, id), name = RequestDetails.personName(id), overload = mode === 'load';
    const busy = ctx.busyOf.map(o => ({ o, slots: wf.scheduleSlots(o) }));
    const subjects = new Map(read('subjects').map(s => [s.code, s.name]));
    const skipped = { clash: 0, limit: 0, full: 0, normal: 0, waiting: 0 };
    // Classes already waiting for the Dean (for this Student, or for any Professor) are left out.
    const pending = read('approvalRequests').filter(r => r.status === 'pending');
    const waiting = new Set(kind === 'faculty'
      ? pending.filter(r => ['professor-assignment', 'professor-overload'].includes(r.type)).map(r => r.proposedChange?.offeringId)
      : pending.filter(r => ['student-enrollment', 'student-overload'].includes(r.type) && r.proposedChange?.studentId === id).map(r => r.proposedChange?.offeringId));
    // Only classes that fit: no clash with their schedule, inside the limit for this mode, section not full.
    const candidates = ctx.pool.map(o => ({ o, units: wf.subjectUnits(o.subjectCode), slots: wf.scheduleSlots(o) })).filter(c => {
      if (waiting.has(c.o.id)) { skipped.waiting++; return false; }
      const clash = busy.find(b => b.slots.some(s => c.slots.some(t => overlap(s, t))));
      if (clash) { skipped.clash++; return false; }
      if (ctx.full && ctx.full(c.o)) { skipped.full++; return false; }
      const after = ctx.current + c.units;
      if (!overload && after > ctx.normal) { skipped.limit++; return false; }
      if (overload && after <= ctx.normal) { skipped.normal++; return false; }
      if (overload && after > ctx.maximum) { skipped.limit++; return false; }
      return true;
    });
    const rank = c => kind === 'student' ? (c.o.sectionId === ctx.home ? 0 : c.o.section.program === ctx.homeProgram && Number(c.o.section.yearLevel) === ctx.homeYear ? 1 : c.o.section.program === ctx.homeProgram ? 2 : 3) : 0;
    candidates.sort((a, b) => rank(a) - rank(b) || a.o.subjectCode.localeCompare(b.o.subjectCode) || a.o.sectionId.localeCompare(b.o.sectionId));
    const groupName = ['Their section', 'Same program and year', 'Same program', 'Other programs'];
    let lastGroup = -1;
    const list = candidates.map((c, i) => { const g = rank(c), head = kind === 'student' && g !== lastGroup ? `<p class="rq-group">${groupName[g]}</p>` : ''; lastGroup = g;
      return `${head}<label class="rq-class" data-i="${i}" data-search="${esc(`${c.o.subjectCode} ${subjects.get(c.o.subjectCode) || ''} ${c.o.sectionId}`.toLowerCase())}"><input type="checkbox" name="offering" value="${i}"><span class="rq-check" aria-hidden="true"></span><span class="rq-class-text"><strong>${esc(c.o.subjectCode)} <span>${esc(subjects.get(c.o.subjectCode) || '')}</span></strong><small>${esc(c.o.sectionId)} · <span class="rq-when">${ICON.clock}${esc(slotText(c.slots))}</span></small><em class="rq-why" hidden></em></span><b class="rq-units">${c.units}u</b></label>`; }).join('');
    const notes = [skipped.clash && `${skipped.clash} clash with their schedule`, skipped.limit && `${skipped.limit} go past the ${overload ? 'maximum' : 'normal load'}`, skipped.full && `${skipped.full} in full sections`, skipped.normal && `${skipped.normal} fit the normal load (use Add subjects)`, skipped.waiting && `${skipped.waiting} already waiting for the Dean`].filter(Boolean);
    const empty = kind === 'faculty' && !ctx.pool.length ? 'Every class already has a Professor.' : overload && ctx.current >= ctx.maximum ? `Already at the maximum of ${ctx.maximum} units.` : !overload && ctx.current >= ctx.normal ? `Already at the normal load of ${ctx.normal} units. Use Add load for an overload.` : 'No class fits right now.';
    const meter = `<div class="rq-meter"><div class="rq-meter-row"><span>Load</span><strong><span data-rq-total>${ctx.current}</span> / ${overload ? ctx.maximum : ctx.normal} units</strong></div><div class="rq-bar" style="--n:${ctx.normal / ctx.maximum * 100}%"><i class="now" style="width:${Math.min(100, ctx.current / ctx.maximum * 100)}%"></i><i class="add" data-rq-add style="left:${Math.min(100, ctx.current / ctx.maximum * 100)}%;width:0"></i><b title="Normal load"></b></div><div class="rq-meter-row small"><span>Now ${ctx.current}</span><span>Normal ${ctx.normal}</span><span>Maximum ${ctx.maximum}</span></div></div>`;
    const body = `${meter}<input type="search" class="rq-search" placeholder="Search subject, name or section" aria-label="Search classes"><div class="rq-classes" role="group" aria-label="Classes">${list || `<p class="rq-empty">${esc(empty)}</p>`}</div>${notes.length ? `<p class="rq-skipped">Not shown: ${esc(notes.join(' · '))}.</p>` : ''}`;
    const title = `${overload ? 'Add load' : 'Add subjects'} · ${name}`;
    const sub = overload ? `Classes that take ${kind === 'student' ? 'the Student' : 'the Professor'} past the normal ${ctx.normal} units, up to ${ctx.maximum}. No schedule clashes.` : `Classes that fit inside the normal load of ${ctx.normal} units with no schedule clashes.`;
    const form = prompt({ title, sub, body, wide: true, submit: 'Send to Dean', onSubmit: (f, close) => {
      const chosen = [...f.querySelectorAll('input[name=offering]:checked')].map(i => candidates[Number(i.value)]), reason = f.reason.value;
      if (!chosen.length) return notify('Choose at least one class.', 'error');
      const send = kind === 'faculty'
        ? c => overload ? wf.requestProfessorOverload({ offeringId: c.o.id, facultyId: id, reason }) : wf.requestProfessorAssignment({ offeringId: c.o.id, facultyId: id, reason })
        : c => overload ? wf.requestStudentOverload({ studentId: id, offeringId: c.o.id, reason }) : wf.requestStudentEnrollment({ studentId: id, offeringId: c.o.id, reason });
      sendAll(chosen, send, c => `${c.o.subjectCode} (${c.o.sectionId})`, close);
    } });
    // Live: running total; a class that would clash with a chosen one, or go past the limit, is locked with the reason.
    const limit = overload ? ctx.maximum : ctx.normal, btn = form.querySelector('.confirm-ok');
    const sync = () => {
      const picked = [...form.querySelectorAll('input[name=offering]:checked')].map(i => candidates[Number(i.value)]), total = ctx.current + picked.reduce((s, c) => s + c.units, 0);
      form.querySelectorAll('.rq-class').forEach(card => {
        const c = candidates[Number(card.dataset.i)], box = card.querySelector('input'), why = card.querySelector('.rq-why'); if (box.checked) { card.classList.remove('locked'); why.hidden = true; box.disabled = false; return; }
        const clash = picked.find(p => p.o.subjectCode === c.o.subjectCode && kind === 'student' ? true : p.slots.some(s => c.slots.some(t => overlap(s, t))));
        const over = total + c.units > limit;
        const reason = clash ? (clash.o.subjectCode === c.o.subjectCode && kind === 'student' ? `Already picked ${clash.o.subjectCode}` : `Clashes with ${clash.o.subjectCode}`) : over ? `Would pass ${limit} units` : '';
        box.disabled = Boolean(reason); card.classList.toggle('locked', Boolean(reason)); why.hidden = !reason; why.textContent = reason;
      });
      form.querySelector('[data-rq-total]').textContent = total;
      const add = form.querySelector('[data-rq-add]'); add.style.width = `${Math.max(0, Math.min(100, total / ctx.maximum * 100) - Math.min(100, ctx.current / ctx.maximum * 100))}%`; add.classList.toggle('over', total > ctx.normal);
      btn.disabled = !picked.length; btn.textContent = picked.length > 1 ? `Send ${picked.length} requests to Dean` : 'Send to Dean';
    };
    form.addEventListener('change', e => { if (e.target.name === 'offering') sync(); });
    form.querySelector('.rq-search').addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); form.querySelectorAll('.rq-class').forEach(card => { card.hidden = Boolean(q) && !card.dataset.search.includes(q); }); form.querySelectorAll('.rq-group').forEach(g => { let n = g.nextElementSibling, any = false; while (n && !n.classList.contains('rq-group')) { if (!n.hidden) any = true; n = n.nextElementSibling; } g.hidden = !any; }); });
    sync(); form.querySelector('.rq-search').focus();
  }

  /* ---------- Applications → All requests (every type the Coordinator sent) ---------- */
  function renderAllRequests() {
    const host = document.getElementById('allRequestList'); if (!host) return;
    const s = session(), status = document.getElementById('coordinatorRequestStatus')?.value || '', text = (document.getElementById('coordinatorRequestSearch')?.value || '').trim().toLowerCase();
    const list = ApprovalService.queryFor(s, { status }).filter(r => !text || JSON.stringify(r).toLowerCase().includes(text) || RequestDetails.describe(r).whoName.toLowerCase().includes(text));
    host.innerHTML = list.map(r => `<article class="role-request-card rq-card" data-status="${esc(r.status)}" data-request-type="${esc(r.type)}"><div class="role-request-head"><strong>${RequestDetails.titleHtml(r)}</strong><span class="role-request-status">${esc(r.status)}</span></div><p>${esc(r.reason)}</p>${RequestDetails.detailsHtml(r)}<details class="role-history"><summary>Request history (${(r.history || []).length})</summary><ol>${(r.history || []).map(h => `<li>${esc(h.status)} · ${esc(new Date(h.at).toLocaleString())} · ${esc(h.actorId)}${h.remarks ? ` — ${esc(h.remarks)}` : ''}</li>`).join('')}</ol></details>${r.status === 'pending' ? `<div class="role-request-actions"><button type="button" class="withdraw" onclick="withdrawCoordinatorRequest('${esc(r.id)}')">Withdraw</button></div>` : ''}</article>`).join('') || '<div class="role-empty">No matching requests. Right-click a Professor or Student to send one.</div>';
  }
  function mountAllRequestsTab() {
    const page = document.getElementById('applicationsSection'), tabs = page?.querySelector('.application-tabs'); if (!tabs || tabs.querySelector('[data-application-tab="all"]')) return;
    tabs.insertAdjacentHTML('afterbegin', `<button type="button" data-application-tab="all" onclick="showCoordinatorApplicationTab('all')">All requests</button>`);
    const pane = document.createElement('section'); pane.dataset.applicationPane = 'all'; pane.hidden = true;
    pane.innerHTML = '<p class="rq-pane-note">Everything you sent to the Dean: roles, subjects and loads for Professors and Students. Right-click a Professor or Student to send a new one.</p><div id="allRequestList" class="role-request-list"></div>';
    tabs.after(pane);
    document.getElementById('coordinatorRequestSearch')?.addEventListener('input', renderAllRequests);
    document.getElementById('coordinatorRequestStatus')?.addEventListener('change', renderAllRequests);
    if (typeof renderCoordinatorWorkflows === 'function' && !renderCoordinatorWorkflows.__rq) { const original = renderCoordinatorWorkflows; window.renderCoordinatorWorkflows = function (...a) { const out = original.apply(this, a); renderAllRequests(); return out; }; window.renderCoordinatorWorkflows.__rq = true; }
    renderAllRequests();
  }

  let mounted = false;
  function mount() {
    if (mounted || !/coordinator\.html$/.test(location.pathname)) return; mounted = true;
    // Capture phase: runs before the Student table's own row menu.
    document.addEventListener('contextmenu', e => {
      const prof = e.target.closest?.('#coordinatorProfessorTable tbody tr[data-id]'), stud = e.target.closest?.('#coordinatorStudentTable tbody tr[data-student-id]');
      const row = prof || stud; if (!row) return;
      e.preventDefault(); e.stopPropagation();
      const r = row.getBoundingClientRect();
      openMenu(prof ? 'faculty' : 'student', prof ? row.dataset.id : row.dataset.studentId, e.clientX || r.left + 24, e.clientY || r.bottom, row);
    }, true);
    document.addEventListener('click', e => { if (!e.target.closest('#raMenu')) closeMenu(); });
    document.addEventListener('scroll', closeMenu, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    mountAllRequestsTab();
  }
  return { mount, openMenu, rolesDialog, classesDialog, renderAllRequests };
})();
if (typeof window !== 'undefined') {
  window.RequestDetails = RequestDetails; window.RequestActions = RequestActions;
  document.addEventListener('DOMContentLoaded', () => RequestActions.mount()); if (document.readyState !== 'loading') setTimeout(() => RequestActions.mount(), 0);
}
