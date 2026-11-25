/* ==================================================================
   Assignable roles (Discord-style), e.g. "Exam maker" and "Intern".
   - accessRoles:      roles defined by the Administrator, each a set of
                       capabilities ({ id, name, color, grants }).
   - roleAssignments:  who holds which role, for one subject or all
                       ({ id, roleId, username, subjectCode | '*' }).
   Any account can hold any role. The Dean assigns roles (directly or by
   approving a Faculty Coordinator's request). Capabilities:
   - exam.manage     create / edit exams in that subject. Once roles are set
                     up (the roleAssignments collection exists), Professors
                     without it cannot create or edit exams there.
   - workspace.view  open that subject's Professor workspace read-only
                     ("Intern view", switched from the profile menu).
   ================================================================== */
const RoleAccess = (() => {
  const CAPS = Object.freeze({
    'exam.manage': { label: 'Create and edit examinations', note: 'Write exams and questions for the subject', group: 'Examinations' },
    'workspace.view': { label: 'View the Professor workspace', note: 'See lessons, exams, students and results without editing', group: 'Workspace' }
  });
  const DEFAULT_ROLES = [
    { id: 'role_exam_maker', name: 'Exam maker', color: '#7c6bd6', grants: { 'exam.manage': true } },
    { id: 'role_intern', name: 'Intern', color: '#2f8d83', grants: { 'workspace.view': true } }
  ];
  const HOME = { admin: 'admin.html', dean: 'dean.html', coordinator: 'coordinator.html', faculty: 'faculty.html', student: 'student.html' };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const raw = (k, f) => { try { const v = (originalRead || DB.read).call(DB, k, f); return v ?? f; } catch (_) { return f; } };
  let originalRead = null;

  /* ---------- data ---------- */
  const roles = () => { const r = raw('accessRoles', null); return Array.isArray(r) && r.length ? r : DEFAULT_ROLES; };
  const configured = () => Array.isArray(raw('roleAssignments', null));
  const assignments = () => raw('roleAssignments', []) || [];
  // Roles can end (Admin → Roles → Ends): an expired assignment grants nothing.
  const isLive = a => !(a?.expiresAt && Date.parse(a.expiresAt) <= Date.now());
  const live = () => assignments().filter(isLive);
  function periodEnd() { const p = (raw('academicPeriods', []) || []).find(x => x.status === 'active'); return p?.endDate ? `${p.endDate}T23:59:59` : null; }
  // until: '' = the role's own rule, 'none' = never, or a yyyy-mm-dd date.
  function expiryFor(role, until) {
    if (until === 'none') return null;
    if (until && /^d{4}-d{2}-d{2}$/.test(until)) return `${until}T23:59:59`;
    const mode = role?.expiry?.mode || 'none';
    if (mode === 'period') return periodEnd();
    if (mode === 'date' && role.expiry.date) return `${role.expiry.date}T23:59:59`;
    return null;
  }
  const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  function expiryLabel(a) { if (!a?.expiresAt) return 'No end date'; return isLive(a) ? `Until ${fmtDate(a.expiresAt)}` : `Ended ${fmtDate(a.expiresAt)}`; }
  function roleExpiryLabel(role) { const m = role?.expiry?.mode; return m === 'period' ? 'Ends with the academic period' : m === 'date' && role.expiry.date ? `Ends ${fmtDate(role.expiry.date + 'T12:00:00')}` : 'No end date'; }
  const roleById = id => roles().find(r => r.id === id) || null;
  const matches = (a, subjectCode) => a.subjectCode === '*' || !subjectCode || a.subjectCode === subjectCode;
  function has(username, cap, subjectCode) {
    return live().some(a => a.username === username && matches(a, subjectCode) && roleById(a.roleId)?.grants?.[cap]);
  }
  function subjectsFor(username, cap) {
    const codes = new Set(live().filter(a => a.username === username && roleById(a.roleId)?.grants?.[cap]).map(a => a.subjectCode));
    if (codes.has('*')) return (raw('subjects', []) || []).map(s => s.code);
    return [...codes];
  }
  function nameOf(username) {
    const pools = ['faculty', 'students', 'coordinators'].flatMap(k => raw(k, []) || []);
    const p = pools.find(x => (x.id || x.username) === username), u = (raw('users', []) || []).find(x => x.username === username);
    return `${p?.first || u?.first || ''} ${p?.last || u?.last || ''}`.trim() || username;
  }
  const subjectName = code => code === '*' ? 'All subjects' : `${code} — ${(raw('subjects', []) || []).find(s => s.code === code)?.name || ''}`.replace(/ — $/, '');

  /* ---------- changes ---------- */
  function assign({ username, roleId, subjectCode = '*', until = '' }, via = 'direct') {
    const list = assignments();
    if (!username || !roleById(roleId)) throw new Error('Choose a person and a role.');
    if (list.some(a => isLive(a) && a.username === username && a.roleId === roleId && a.subjectCode === subjectCode)) throw new Error(`${nameOf(username)} already has that role for ${subjectName(subjectCode)}.`);
    const actor = raw('currentUser', {}) || {};
    const item = { id: `RA-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, roleId, username, subjectCode, assignedBy: actor.username || 'system', assignedAt: new Date().toISOString(), via, expiresAt: expiryFor(roleById(roleId), until) };
    if (item.expiresAt && Date.parse(item.expiresAt) <= Date.now()) throw new Error('That end date has already passed.');
    if (!DB.write('roleAssignments', [...list, item])) throw new Error('The role could not be saved.');
    try { AuditLog.record('assign-role', 'role-assignment', item.id, { username, roleId, subjectCode, via }); } catch (_) {}
    return item;
  }
  function unassign(id) {
    const list = assignments(), item = list.find(a => a.id === id); if (!item) return false;
    if (!DB.write('roleAssignments', list.filter(a => a.id !== id))) return false;
    try { AuditLog.record('remove-role', 'role-assignment', id, { username: item.username, roleId: item.roleId, subjectCode: item.subjectCode }); } catch (_) {}
    return true;
  }
  // Faculty Coordinator asks the Dean to give a person a role.
  function request({ username, roleId, subjectCode = '*', reason }) {
    const role = roleById(roleId);
    return ApprovalService.submit({ type: 'role-assignment', targetType: 'role-assignment', targetId: `${username}|${roleId}|${subjectCode}`, proposedChange: { username, roleId, roleName: role?.name || roleId, subjectCode }, reason });
  }
  function registerApproval() {
    if (typeof ApprovalService === 'undefined' || !ApprovalService.types?.['role-assignment']) return;
    try { ApprovalService.registerApplyHandler('role-assignment', change => { assign(change, 'request'); }); } catch (_) {}
  }

  /* ---------- Intern view (read-only Professor workspace) ---------- */
  const READ_SCOPED = {
    exams: (rows, s) => rows.filter(e => s.has(e.subjectCode)),
    subjectAssignments: (rows, s) => rows.filter(a => s.has(a.subjectCode)),
    studentEnrollments: (rows, s) => rows.filter(e => s.has(e.subjectCode)),
    subjectWorkspaceContent: (rows, s) => rows.filter(c => s.has(c.subjectCode)),
    sectionSubjects: (rows, s) => rows.map(r => ({ ...r, assignments: (r.assignments || []).filter(a => s.has(a.subjectCode)) }))
  };
  const WRITE_OK = new Set(['currentUser', 'accessNotice', 'inboxReadReceipts', 'lessonTocCollapsed', 'revokedSessions']);
  let internView = null;
  function bootIntern() {
    if (typeof location === 'undefined' || typeof DB === 'undefined') return null;
    const params = new URLSearchParams(location.search); if (params.get('as') !== 'intern') return null;
    const session = typeof getSession === 'function' ? getSession() : null; if (!session) return null;
    const subjects = subjectsFor(session.username, 'workspace.view');
    if (!subjects.length) { if (typeof notify === 'function') setTimeout(() => notify('You do not have the Intern role for any subject.', 'error'), 300); return null; }
    const subject = subjects.includes(params.get('subject')) ? params.get('subject') : subjects[0];
    const teaching = (raw('subjectAssignments', []) || []).find(a => a.subjectCode === subject);
    const professorId = (Array.isArray(teaching?.facultyIds) ? teaching.facultyIds[0] : teaching?.facultyId) || '';
    if (!professorId) { if (typeof notify === 'function') setTimeout(() => notify(`No Professor teaches ${subject} yet, so there is nothing to view.`, 'error'), 300); return null; }
    const ok = typeof requireRole === 'function' ? requireRole(session.role) : session; if (!ok) return null;
    internView = { username: session.username, role: session.role, subjects, subject, professorId };
    const scope = new Set([subject]);
    originalRead = DB.read;
    const examIds = () => new Set((originalRead.call(DB, 'exams', []) || []).filter(e => scope.has(e.subjectCode)).map(e => e.id));
    DB.read = function (key, fallback) {
      const value = originalRead.call(DB, key, fallback);
      if (!Array.isArray(value)) return value;
      if (READ_SCOPED[key]) return READ_SCOPED[key](value, scope);
      if (key === 'questions' || key === 'studentSubmissions') { const ids = examIds(); return value.filter(r => ids.has(r.examId)); }
      return value;
    };
    const originalWrite = DB.write;
    DB.write = function (key, value) {
      if (WRITE_OK.has(key)) return originalWrite.call(DB, key, value);
      if (typeof notify === 'function') notify('Intern view is read-only. Nothing was changed.', 'info');
      return false;
    };
    window.INTERN_VIEW = internView;
    document.documentElement.classList.add('intern-view');
    return { ...session };
  }
  function internBanner() {
    if (!internView || document.getElementById('raInternBanner')) return;
    const options = internView.subjects.map(code => `<option value="${esc(code)}"${code === internView.subject ? ' selected' : ''}>${esc(subjectName(code))}</option>`).join('');
    const bar = document.createElement('div'); bar.id = 'raInternBanner'; bar.className = 'ra-intern-banner';
    bar.innerHTML = `<span class="ra-eye" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7Zm0 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z"/></svg></span><div><strong>Intern view · read-only</strong><small>Professor ${esc(nameOf(internView.professorId))}'s workspace. You can look at everything but not change it.</small></div><label><span>Subject</span><select aria-label="Intern subject">${options}</select></label><a href="${HOME[internView.role] || 'login.html'}">Back to my workspace</a>`;
    bar.querySelector('select').addEventListener('change', e => { location.href = `faculty.html?as=intern&subject=${encodeURIComponent(e.target.value)}`; });
    document.body.prepend(bar);
  }

  /* ---------- Exam maker gate on the Professor page ---------- */
  function lockedNotice(code) {
    const message = `Only exam makers can create or edit examinations in ${subjectName(code)}. Ask your Faculty Coordinator to request the Exam maker role for you; the Dean approves it.`;
    if (typeof confirmDialog === 'function') confirmDialog({ title: 'Exam maker role needed', message, confirmLabel: 'OK', cancelLabel: 'Close' }); else alert(message);
  }
  function guardFacultyExams() {
    if (internView || !configured()) return;
    const me = (raw('currentUser', {}) || {}).username; if (!me) return;
    const examSubject = id => (raw('exams', []) || []).find(e => e.id === id)?.subjectCode;
    // eslint-disable-next-line no-undef
    const editingExam = () => { try { return currentEditingExamForQuestions; } catch (_) { return null; } };
    const wrap = (name, subjectOf, after) => {
      const original = window[name]; if (typeof original !== 'function' || original.__ra) return;
      const wrapped = function (...args) {
        const code = subjectOf(...args);
        if (code === false) return false;
        if (code && !has(me, 'exam.manage', code)) { lockedNotice(code); return false; }
        const result = original.apply(this, args); if (after) after(...args); return result;
      };
      wrapped.__ra = true; window[name] = wrapped;
    };
    const makerSubjects = () => subjectsFor(me, 'exam.manage');
    wrap('openExamModal', code => { if (code) return code; if (!makerSubjects().length) { lockedNotice(''); return false; } return null; }, () => {
      const select = document.getElementById('examSubject'); if (!select) return;
      [...select.options].forEach(o => { if (o.value && !has(me, 'exam.manage', o.value)) { o.disabled = true; o.textContent = o.textContent.replace(/ · locked$/, '') + ' · locked'; } });
      if (select.selectedOptions[0]?.disabled) { const first = [...select.options].find(o => o.value && !o.disabled); if (first) select.value = first.value; }
    });
    wrap('saveExam', () => document.getElementById('examSubject')?.value || null);
    wrap('editExam', id => examSubject(id));
    wrap('deleteExam', id => examSubject(id));
    ['saveQuestion', 'deleteQuestion', 'duplicateQuestion', 'reorderExamQuestions'].forEach(n => wrap(n, () => examSubject(editingExam())));
    wrap('setQuestionShuffle', id => examSubject(id));
    // A short note on My Exams saying where this Professor can author exams.
    const note = () => {
      const host = document.querySelector('#exams-tab .fx-page'); if (!host || host.querySelector('.ra-maker-note')) return;
      const subjects = makerSubjects();
      host.insertAdjacentHTML('afterbegin', `<div class="ra-maker-note ${subjects.length ? 'ok' : 'locked'}"><strong>${subjects.length ? 'Exam maker' : 'Exam making is locked'}</strong><span>${subjects.length ? `You can create and edit exams in ${subjects.map(c => esc(subjectName(c))).join(', ')}.` : 'You are not an exam maker for any subject yet. Ask your Faculty Coordinator to request the role; the Dean approves it.'}</span></div>`);
    };
    new MutationObserver(note).observe(document.body, { childList: true, subtree: true }); note();
  }

  /* ---------- Coordinator: right-click a Professor → Request a role ---------- */
  function closeMenu() { document.getElementById('raMenu')?.remove(); }
  function requestDialog(username) {
    const subjects = raw('subjects', []) || [], teaching = (raw('subjectAssignments', []) || []).filter(a => (a.facultyIds || [a.facultyId]).includes(username)).map(a => a.subjectCode);
    const options = [...teaching.map(code => `<option value="${esc(code)}">${esc(subjectName(code))} · teaches</option>`), ...subjects.filter(s => !teaching.includes(s.code)).map(s => `<option value="${esc(s.code)}">${esc(subjectName(s.code))}</option>`)].join('');
    document.getElementById('raRequest')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-bg confirm-bg" id="raRequest" style="display:flex" role="dialog" aria-modal="true" aria-label="Request a role"><form class="confirm-box"><h3>Request a role</h3><p class="confirm-msg">For <strong>${esc(nameOf(username))}</strong>. The Dean reviews it in Approvals; the role works as soon as it is approved.</p><label for="raRole">Role</label><select id="raRole" name="roleId">${roles().map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('')}</select><label for="raSubject">Subject</label><select id="raSubject" name="subjectCode">${options}<option value="*">All subjects</option></select><label for="raReason">Reason</label><textarea id="raReason" name="reason" required placeholder="e.g. Maria will write the midterm for this subject."></textarea><div class="confirm-actions"><button type="button" class="confirm-cancel">Cancel</button><button type="submit" class="confirm-ok">Send to Dean</button></div></form></div>`);
    const modal = document.getElementById('raRequest'), close = () => modal.remove();
    modal.querySelector('.confirm-cancel').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    modal.querySelector('form').onsubmit = e => {
      e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
      if (live().some(a => a.username === username && a.roleId === v.roleId && (a.subjectCode === v.subjectCode || a.subjectCode === '*'))) { notify(`${nameOf(username)} already has that role there.`, 'info'); return; }
      try { request({ username, roleId: v.roleId, subjectCode: v.subjectCode, reason: v.reason }); close(); notify(`Request sent to the Dean: ${roleById(v.roleId)?.name} for ${nameOf(username)}.`, 'success'); }
      catch (error) { notify(error.code === 'DUPLICATE_PENDING' ? 'That request is already waiting for the Dean.' : error.message, 'error'); }
    };
    modal.querySelector('select')?.focus();
  }
  function coordinatorMenu() {
    document.addEventListener('contextmenu', e => {
      const row = e.target.closest('#coordinatorProfessorTable tbody tr[data-id]'); if (!row) return;
      e.preventDefault(); closeMenu();
      const id = row.dataset.id, held = live().filter(a => a.username === id);
      const menu = document.createElement('div'); menu.id = 'raMenu'; menu.className = 'ra-menu'; menu.setAttribute('role', 'menu');
      menu.innerHTML = `<button type="button" role="menuitem" data-ra="request"><svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>Request a role…</button><button type="button" role="menuitem" data-ra="open"><svg viewBox="0 0 24 24"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6Z"/></svg>Open profile</button>${held.length ? `<p class="ra-held">${held.map(a => `<span class="ra-pill" style="--c:${esc(roleById(a.roleId)?.color || '#888')}">${esc(roleById(a.roleId)?.name || a.roleId)} · ${esc(a.subjectCode === '*' ? 'All' : a.subjectCode)}</span>`).join('')}</p>` : ''}`;
      document.body.appendChild(menu);
      const r = menu.getBoundingClientRect(); menu.style.left = `${Math.min(e.clientX, innerWidth - r.width - 8)}px`; menu.style.top = `${Math.min(e.clientY, innerHeight - r.height - 8)}px`;
      menu.onclick = ev => { const k = ev.target.closest('[data-ra]')?.dataset.ra; closeMenu(); if (k === 'request') requestDialog(id); if (k === 'open') row.click(); };
    });
    document.addEventListener('click', e => { if (!e.target.closest('#raMenu')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- "Switch view" in the profile menu ---------- */
  function switcher() {
    const session = (typeof getSession === 'function' ? getSession() : null); if (!session) return;
    const subjects = subjectsFor(session.username, 'workspace.view'); if (!subjects.length && !internView) return;
    const menus = [...document.querySelectorAll('.role-sidebar-profile-menu, .student-sidebar-profile-menu, #profilePanel .profile-menu')].filter(m => !m.querySelector('.ra-switch')); if (!menus.length) return;
    const own = HOME[session.role];
    const links = [`<a class="profile-item ra-view${internView ? '' : ' current'}" href="${own}"><span class="pi-icon" aria-hidden="true">&#8962;</span>My workspace<small>${esc((session.role === 'faculty' ? 'Professor' : session.role).replace(/^\w/, c => c.toUpperCase()))}</small></a>`,
      ...subjects.map(code => `<a class="profile-item ra-view${internView?.subject === code ? ' current' : ''}" href="faculty.html?as=intern&subject=${encodeURIComponent(code)}"><span class="pi-icon" aria-hidden="true">&#128065;</span>Intern<small>${esc(subjectName(code))}</small></a>`)];
    menus.forEach(menu => menu.insertAdjacentHTML('afterbegin', `<div class="ra-switch" role="group" aria-label="Switch view"><p>View as</p>${links.join('')}</div>`));
  }

  let mounted = false;
  function mount() {
    if (mounted) return; mounted = true;
    registerApproval();
    if (internView) internBanner();
    if (/faculty\.html$/.test(location.pathname)) guardFacultyExams();
    // The Coordinator's right-click menu (roles, subjects, load) lives in request-actions.js.
    if (/coordinator\.html$/.test(location.pathname) && typeof RequestActions === 'undefined') coordinatorMenu();
    switcher(); new MutationObserver(() => switcher()).observe(document.body, { childList: true, subtree: true });
  }
  return { requestDialog, CAPS, DEFAULT_ROLES, roles, assignments, live, isLive, expiryFor, expiryLabel, roleExpiryLabel, periodEnd, configured, has, subjectsFor, assign, unassign, request, nameOf, subjectName, roleById, bootIntern, mount, registerApproval };
})();
if (typeof window !== 'undefined') { window.RoleAccess = RoleAccess; document.addEventListener('DOMContentLoaded', () => RoleAccess.mount()); if (document.readyState !== 'loading') setTimeout(() => RoleAccess.mount(), 0); }
