/* ==================================================================
   Page permissions: every action on every workspace page, switchable by
   the Administrator per role, Discord style.

   Each role holds a state per permission:
     allow  ✓  the role turns the permission on
     (none) /  the role leaves it as it is
     deny   ✗  the role turns the permission off
   Everything starts on. Every role a person holds votes: their system
   role (Dean, Professor, …), restriction roles and assignable roles such
   as Exam maker. If any role allows, it is on; otherwise if any role
   denies, it is off; with no votes it stays on. Allow wins, as in Discord.

   Enforcement on the page: denied sections leave the sidebar, denied
   controls are hidden, and a click guard stops them however they are
   wired. The server refuses writes to a collection once every
   permission that writes it is denied for that person.

   Data: the pagePermissions record { rules: { roleKey: { permId: 'allow'|'deny' } },
   restrictions: [{ id, baseRole, members }] }. roleKey is "system:<role>",
   a restriction role id or an assignable role id. Only the Administrator
   writes it; every role reads it.
   ================================================================== */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PagePermissions = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  const any = (...names) => names.map(n => `[onclick*="${n}("]`);
  const nav = id => `#sidebar [data-panel="${id}"]`;
  // [page, label, roles, groups: [group, [[id, label, note, selectors, writes, panel]]]]
  const PAGES = [
    ['dean', 'Dean workspace', ['dean'], [
      ['Pages', [
        ['dean.page.dashboard', 'Dashboard', 'College overview and charts', [], [], 'dashboardSection'],
        ['dean.page.members', 'Members', 'College members and role assignments', [], [], 'membersSection'],
        ['dean.page.approvals', 'Approvals', 'Requests waiting for the Dean', [], [], 'approvalsSection'],
        ['dean.page.statistics', 'Statistics', 'College statistics', [], [], 'statisticsSection'],
        ['dean.page.logs', 'Logs', 'College activity log', [], [], 'logsSection'],
        ['dean.page.mail', 'Mail', 'Notifications inbox', [], [], 'role-mail-panel']
      ]],
      ['Members', [
        ['dean.members.hire', 'Add Professors', 'Hire a new Professor', ['#deanPersonnelTools .table-add-action'], ['faculty']],
        ['dean.members.appoint', 'Appoint Coordinators', 'Make a Professor a Faculty Coordinator', ['[data-appoint]'], ['coordinators']],
        ['dean.members.import', 'Import members', 'Bring members in from a file', ['#deanPersonnelTools .table-import-action']],
        ['dean.roles.assign', 'Give roles', 'Assign Exam maker, Intern and other roles', ['#deanRoleTools .table-add-action'], ['roleAssignments']],
        ['dean.roles.remove', 'Remove roles', 'Take a role away from someone', ['[data-ra-remove]'], ['roleAssignments']]
      ]],
      ['Approvals', [
        ['dean.approvals.decide', 'Approve and reject', 'Decide on requests', any('reviewAssignment'), ['approvalRequests']]
      ]],
      ['Tables', [
        ['dean.tables.export', 'Export tables', 'Download tables as CSV or Word', ['.table-export-wrap', '.table-export-action']]
      ]]
    ]],
    ['coordinator', 'Coordinator workspace', ['coordinator'], [
      ['Pages', [
        ['coord.page.dashboard', 'Dashboard', 'Program overview', [], [], 'dashboardSection'],
        ['coord.page.sections', 'Section Management', 'Sections and their subjects', [], [], 'sectionManagementSection'],
        ['coord.page.professors', 'Professor Management', 'Teaching loads', [], [], 'professorManagementSection'],
        ['coord.page.students', 'Student Management', 'Student offerings and enrollment', [], [], 'offeringsSection'],
        ['coord.page.applications', 'Applications', 'Requests sent to the Dean', [], [], 'applicationsSection'],
        ['coord.page.schedule', 'Subject Schedule', 'Weekly class schedule', [], [], 'schedulesSection'],
        ['coord.page.logs', 'Logs', 'Their own activity log', [], [], 'logsSection'],
        ['coord.page.mail', 'Mail', 'Notifications inbox', [], [], 'role-mail-panel']
      ]],
      ['Sections', [
        ['coord.sections.add', 'Add sections', 'Create a new section', ['.section-add'], ['sections']],
        ['coord.sections.subjects', 'Change section subjects', 'Save the subjects a section takes', any('SectionManagement.saveSubjects')]
      ]],
      ['Professors', [
        ['coord.professors.assign', 'Assign teaching loads', 'Give subjects to Professors', ['#professorTableTools .table-add-action', '.professor-assignment-editor']],
        ['coord.professors.roles', 'Request roles', 'Ask the Dean to give a Professor a role', ['#raMenu [data-ra="request"]']]
      ]],
      ['Students', [
        ['coord.students.save', 'Change student offerings', 'Save enrollment changes for students', ['.batch-save-btn', '[aria-label="Student oversight actions"]']]
      ]],
      ['Applications', [
        ['coord.applications.withdraw', 'Withdraw requests', 'Take back a pending request', any('withdrawCoordinatorRequest')]
      ]],
      ['Schedule', [
        ['coord.schedule.edit', 'Edit schedules', 'Change class days, times and rooms', ['.subject-schedule-save']]
      ]],
      ['Tables', [
        ['coord.tables.export', 'Export tables', 'Download tables as CSV or Word', ['.table-export-wrap', '.table-export-action']],
        ['coord.tables.import', 'Import from files', 'Bring rows in from a file', ['.table-import-action']]
      ]]
    ]],
    ['faculty', 'Professor workspace', ['faculty'], [
      ['Pages', [
        ['prof.page.dashboard', 'Dashboard', 'Teaching overview', [], [], 'dashboard-tab'],
        ['prof.page.subjects', 'My Subjects', 'Subjects and weekly lessons', [], [], 'subjects-tab'],
        ['prof.page.exams', 'My Exams', 'Examinations and questions', [], [], 'exams-tab'],
        ['prof.page.students', 'My Students', 'Class rosters', [], [], 'students-tab'],
        ['prof.page.reports', 'Reports', 'Results and question reports', [], [], 'reports-tab'],
        ['prof.page.mail', 'Mail', 'Notifications inbox', [], [], 'role-mail-panel']
      ]],
      ['Lessons', [
        ['prof.lessons.edit', 'Edit weekly lessons', 'Add and change lesson content', ['[data-faculty-workspace-action]', '[class*="lesson-add"]', '[class*="add-block"]', '[class*="edit-block"]'], ['subjectWorkspaceContent']]
      ]],
      ['Exams', [
        ['prof.exams.create', 'Create exams', 'Start a new examination', [...any('openExamModal'), '.add-exam-btn'], ['exams']],
        ['prof.exams.edit', 'Edit exams', 'Change exam settings', [...any('editExam', 'saveExam'), '.question-workspace:not(.is-new-exam) .exam-settings-btn', '.question-shuffle-toggle'], ['exams']],
        ['prof.exams.delete', 'Delete exams', 'Remove an examination', any('deleteExam'), ['exams']],
        ['prof.exams.publish', 'Publish exams', 'Release an exam to students', any('reviewAndPublishExam'), ['exams']],
        ['prof.questions.edit', 'Write questions', 'Add, change, move and copy questions', [...any('openQuestionModal', 'editQuestion', 'saveQuestion', 'duplicateQuestion', 'moveQuestion', 'addQuestionOfType'), '.question-add-menu', '.question-drag-handle'], ['questions', 'questionDrafts']],
        ['prof.questions.delete', 'Delete questions', 'Remove questions', any('deleteQuestion'), ['questions']],
        ['prof.exams.export', 'Export exams', 'Download an exam as a file or spreadsheet', ['.exam-export-wrap']],
        ['prof.questions.import', 'Import questions', 'Upload questions from a CSV file', any('confirmQuestionCSVUpload'), ['questions']]
      ]],
      ['Grading', [
        ['prof.grading.grade', 'Grade answers', 'Score essay and open answers', any('openGrading', 'saveGrading'), ['studentSubmissions']]
      ]],
      ['Students', [
        ['prof.students.enroll', 'Enroll students', 'Add students to a subject', any('openStudentAssignModal', 'saveFacultyStudentOffering', 'openFacultySectionPicker')],
        ['prof.students.remove', 'Remove students', 'Take students out of a subject', any('removeStudentEnrollment', 'removeStudentFromSubject')]
      ]],
      ['Reports', [
        ['prof.reports.resolve', 'Handle question reports', 'Resolve reports and block students from reporting', any('updateOpenReportStatus', 'blockReportStudent'), ['questionReports', 'reportBlockedStudents']],
        ['prof.reports.mail', 'Mail students', 'Send a message to a student', any('mailReportStudent'), ['studentEmails']]
      ]],
      ['Tables', [
        ['prof.tables.export', 'Export tables', 'Download tables as CSV or Word', ['.table-export-wrap', '.table-export-action']]
      ]]
    ]],
    ['student', 'Student workspace', ['student'], [
      ['Pages', [
        ['student.page.dashboard', 'Dashboard', 'Their overview', [], [], 'overview-panel'],
        ['student.page.subjects', 'My Subjects', 'Subjects and lessons', [], [], 'subjects-panel'],
        ['student.page.exams', 'Examinations', 'Exams they can take', [], [], 'exams-panel'],
        ['student.page.results', 'Results', 'Their scores', [], [], 'results-panel'],
        ['student.page.schedule', 'Schedule', 'Class schedule', [], [], 'schedule-panel'],
        ['student.page.mail', 'Mail', 'Messages and notifications', [], [], 'mail-panel']
      ]],
      ['Exams', [
        ['student.exams.take', 'Take exams', 'Start an examination', any('beginAttempt', 'startExam'), ['examAttempts']],
        ['student.exams.review', 'Review answers', 'Look back at a finished attempt', any('reviewAnswers', 'openCompletedExamReview', 'openResultReviewPage', 'reviewSavedAttempt', 'toggleInlineResultReview')],
        ['student.exams.report', 'Report questions', 'Flag a question to the Professor', any('openQuestionReport', 'submitQuestionReport'), ['questionReports']]
      ]],
      ['Mail', [
        ['student.mail.send', 'Email Professors', 'Write and reply to messages', any('openEmailComposer', 'sendProfessorEmail', 'openStudentMailCompose', 'sendStudentMailReply', 'sendStudentMailPage'), ['studentEmails']]
      ]]
    ]]
  ];

  const LIST = [];
  PAGES.forEach(([page, pageLabel, roles, groups]) => groups.forEach(([group, perms]) => perms.forEach(([id, label, note, sel = [], writes = [], panel]) => {
    const selectors = panel ? [nav(panel)] : sel;
    LIST.push({ id, page, pageLabel, roles, group, label, note, selectors, writes, panel: panel || null });
  })));
  const BY_ID = new Map(LIST.map(p => [p.id, p]));
  const PAGE_FILE = { dean: 'dean.html', coordinator: 'coordinator.html', faculty: 'faculty.html', student: 'student.html' };

  const norm = r => String(r || '').trim().toLowerCase().replace(/[\s_-]+/g, '').replace('administrator', 'admin').replace('collegedean', 'dean').replace('facultycoordinator', 'coordinator').replace('professor', 'faculty');

  /* Which role keys this person holds. */
  function heldKeys(doc, ctx) {
    const role = norm(ctx.role), keys = { base: `system:${role}`, others: [] };
    (doc?.restrictions || []).forEach(r => { if (norm(r.baseRole) === role && (r.members || []).includes(ctx.username)) keys.others.push(r.id); });
    const now = Date.now(); // ended role assignments (Admin → Roles → Ends) no longer count
    const held = new Set((ctx.assignments || []).filter(a => a.username === ctx.username && !(a.expiresAt && Date.parse(a.expiresAt) <= now)).map(a => a.roleId));
    held.forEach(id => keys.others.push(id));
    return keys;
  }
  /* The vote of every role the person holds. Allow (from any role, their
     system role included) wins; otherwise any Deny turns it off; with no
     votes the permission keeps its default. Used for page permissions and
     for the core permissions of PermissionService. */
  function decide(doc, ctx, permId, fallback = true) {
    const rules = doc?.rules || {}, keys = heldKeys(doc, ctx);
    const states = [rules[keys.base]?.[permId], ...keys.others.map(k => rules[k]?.[permId])].filter(Boolean);
    if (states.includes('allow')) return true;
    if (states.includes('deny')) return false;
    return fallback;
  }
  /* true when the page permission is on for this person. */
  function resolve(doc, ctx, permId) {
    const perm = BY_ID.get(permId); if (!perm) return true;
    const role = norm(ctx.role); if (role === 'admin') return true;
    if (!perm.roles.includes(role)) return true; // not their page
    return decide(doc, ctx, permId, true);
  }
  function deniedFor(doc, ctx, page) {
    return LIST.filter(p => (!page || p.page === page) && !resolve(doc, ctx, p.id));
  }
  /* Server: a collection is closed once every permission that writes it is denied. */
  function writeDenied(doc, ctx, collection) {
    const role = norm(ctx.role); if (role === 'admin') return false;
    const writers = LIST.filter(p => p.roles.includes(role) && p.writes.includes(collection));
    return writers.length > 0 && writers.every(p => !resolve(doc, ctx, p.id));
  }

  /* ---------- browser side ---------- */
  const state = { denied: [], ctx: null };
  function browserDoc() { try { return DB.read('pagePermissions', {}) || {}; } catch (_) { return {}; } }
  function browserCtx() {
    let session = null; try { session = DB.read('currentUser', null); } catch (_) {}
    let assignments = []; try { assignments = DB.read('roleAssignments', []) || []; } catch (_) {}
    return session ? { role: session.role, username: session.username, assignments } : null;
  }
  function pageOf() { const file = (location.pathname.split('/').pop() || '').toLowerCase(); return Object.keys(PAGE_FILE).find(k => PAGE_FILE[k] === file) || null; }
  function can(permId) { const ctx = browserCtx(); return !ctx || resolve(browserDoc(), ctx, permId); }
  function notice(perm) {
    const text = `${perm.label} is turned off for your role. Ask the Administrator if you need it.`;
    if (typeof notify === 'function') notify(text, 'error'); else if (typeof console !== 'undefined') console.warn(text);
  }
  function apply() {
    if (typeof window === 'undefined' || window.INTERN_VIEW) return; // Intern view is read-only already
    const page = pageOf(), ctx = browserCtx(); if (!page || !ctx) return;
    state.ctx = ctx; state.denied = deniedFor(browserDoc(), ctx, page);
    let style = document.getElementById('pagePermStyle');
    if (!style) { style = document.createElement('style'); style.id = 'pagePermStyle'; document.head.appendChild(style); }
    const hide = state.denied.flatMap(p => [...p.selectors, ...(p.panel ? [`#${p.panel}`] : [])]);
    style.textContent = hide.length ? `${hide.map(s => `html:not(#pp) ${s}`).join(',')}{display:none!important}` : '';
    // Leave a page that was just switched off.
    const open = state.denied.find(p => p.panel && document.querySelector(`#sidebar [data-panel="${p.panel}"].active, #sidebar [data-panel="${p.panel}"][aria-current="page"]`));
    if (open) { const next = [...document.querySelectorAll('#sidebar [data-panel]')].find(a => !state.denied.some(p => p.panel === a.dataset.panel)); next?.click(); }
  }
  function guard(e) {
    if (!state.denied.length || !e.target?.closest) return;
    for (const perm of state.denied) {
      const hit = perm.selectors.find(sel => { try { return e.target.closest(sel); } catch (_) { return false; } });
      if (hit) { e.preventDefault(); e.stopImmediatePropagation(); notice(perm); return; }
    }
  }
  let mounted = false;
  function mount() {
    if (mounted || typeof document === 'undefined') return; mounted = true;
    document.addEventListener('click', guard, true);
    document.addEventListener('contextmenu', e => { if (state.denied.some(p => p.id === 'coord.professors.roles') && e.target.closest?.('#coordinatorProfessorTable')) setTimeout(() => document.getElementById('raMenu')?.querySelector('[data-ra="request"]')?.remove(), 0); }, true);
    apply();
    // Rules can change while the page is open (another tab, a sync from the server).
    try { const write = DB.write; if (!DB.__ppWrapped) { DB.write = function (key, ...rest) { const out = write.call(this, key, ...rest); if (key === 'pagePermissions' || key === 'roleAssignments') setTimeout(apply, 0); return out; }; DB.__ppWrapped = true; } } catch (_) {}
    window.addEventListener('storage', e => { if (!e.key || /pagePermissions|roleAssignments/.test(e.key)) apply(); });
    setInterval(apply, 15000);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 0));
    else setTimeout(mount, 0);
  }

  return { PAGES, LIST, BY_ID, PAGE_FILE, resolve, decide, deniedFor, writeDenied, heldKeys, can, apply, mount, normalizeRole: norm };
});
