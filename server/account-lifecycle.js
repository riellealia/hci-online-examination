'use strict';

const STATUS_BY_ACTION = { deactivate: 'Deactivated', reactivate: 'Active', archive: 'Archived', restore: 'Active', graduate: 'Graduated', transfer: 'Transferred' };
const REQUIRED_FROM = {
  deactivate: new Set(['Active']),
  reactivate: new Set(['Deactivated']),
  archive: new Set(['Active', 'Deactivated']),
  restore: new Set(['Archived', 'Graduated', 'Transferred']),
  graduate: new Set(['Active', 'Deactivated']),
  transfer: new Set(['Active', 'Deactivated'])
};
const REASON_REQUIRED = new Set(['archive', 'graduate', 'transfer']);
const STUDENT_ONLY = new Set(['graduate', 'transfer']);

const now = () => new Date().toISOString();
function bad(message, status = 400) { const error = new Error(message); error.status = status; throw error; }
/* Administrators can change any account. The Dean can archive and restore
   Student and Professor accounts (Members → right-click → Archive). */
const DEAN_ACTIONS = new Set(['archive', 'restore']), DEAN_TARGETS = new Set(['student', 'faculty', 'professor']);
function authorize(session, action, targetRole) {
  if (session?.role === 'admin') return;
  if (session?.role === 'dean' && DEAN_ACTIONS.has(action) && DEAN_TARGETS.has(targetRole)) return;
  bad(session?.role === 'dean' ? 'The Dean can only archive or restore Student and Professor accounts.' : 'Only an Administrator can change account status.', 403);
}
function statusOf(user) { return user.lifecycleStatus || (user.disabled ? 'Deactivated' : 'Active'); }
function entityTypeFor(role) { return role === 'student' ? 'student-account' : ['faculty', 'professor'].includes(role) ? 'faculty-account' : 'account'; }
function withoutPassword(user) { const { password, ...rest } = user; return rest; }

function createAccountLifecycleService(store) {
  function audit(existing, session, action, user, previousValue, newValue, reason) {
    return [...existing, {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: now(), actorId: session.username, actorRole: session.role,
      action, entityType: entityTypeFor(String(user.role || '').toLowerCase()), entityId: user.username,
      category: 'account/lifecycle', result: 'success', reason: String(reason || '').trim(),
      previousValue, newValue, details: {}
    }];
  }
  function changeStatus(username, action, reason, session) {
    if (!session || !['admin', 'dean'].includes(session.role)) bad('Only an Administrator can change account status.', 403);
    if (!Object.hasOwn(STATUS_BY_ACTION, action)) bad('Unknown account status action.');
    reason = String(reason || '').trim();
    if (REASON_REQUIRED.has(action) && !reason) bad(`A reason is required to ${action} an account.`);
    const users = store.read('users', []);
    if (!Array.isArray(users)) bad('Account records are unavailable.', 500);
    const index = users.findIndex(item => item.username === username);
    if (index < 0) bad('Account not found.', 404);
    const previous = users[index];
    const previousStatus = statusOf(previous);
    const userRole = String(previous.role || '').toLowerCase();
    authorize(session, action, userRole);
    if (STUDENT_ONLY.has(action) && userRole !== 'student') bad(`Only Student accounts can be marked ${STATUS_BY_ACTION[action].toLowerCase()}.`);
    if (!REQUIRED_FROM[action].has(previousStatus)) bad(`Cannot ${action} an account that is currently ${previousStatus}.`, 409);
    const newStatus = STATUS_BY_ACTION[action];
    const timestamp = now();
    const history = [...(previous.lifecycleHistory || []), { at: timestamp, actorId: session.username, actorRole: session.role, from: previousStatus, to: newStatus, reason }];
    const updated = { ...previous, lifecycleStatus: newStatus, disabled: newStatus !== 'Active', lifecycleHistory: history };
    const nextUsers = [...users];
    nextUsers[index] = updated;
    const moved = action === 'archive' ? archiveRecords(updated, session, reason) : action === 'restore' && previousStatus === 'Archived' ? restoreRecords(updated.username) : {};
    store.migrate({
      ...moved,
      users: nextUsers,
      applicationAuditLog: audit(store.read('applicationAuditLog', []), session, action, previous, previousStatus, newStatus, reason)
    });
    return { account: withoutPassword(updated) };
  }
  /* Archive: the person leaves every list. Their Student or Professor record
     moves to archivedPeople together with what it was attached to (a
     Student's enrollments, a Professor's classes, which become unassigned),
     so restore can put it all back. */
  function archiveRecords(user, session, reason) {
    const id = user.username, out = {};
    const students = store.read('students', []) || [], faculty = store.read('faculty', []) || [];
    const student = students.find(item => item.id === id), professor = faculty.find(item => item.id === id);
    const entry = { id, username: id, kind: student ? 'student' : professor ? 'faculty' : String(user.role || 'account'), record: student || professor || null, enrollments: [], offerings: [], archivedAt: now(), archivedBy: session.username, archivedByRole: session.role, reason };
    if (student) {
      out.students = students.filter(item => item.id !== id);
      const enrollments = store.read('studentEnrollments', []) || [];
      entry.enrollments = enrollments.filter(item => item.studentId === id);
      if (entry.enrollments.length) out.studentEnrollments = enrollments.filter(item => item.studentId !== id);
    }
    if (professor) {
      out.faculty = faculty.filter(item => item.id !== id);
      const records = store.read('sectionSubjects', []) || [];
      let touched = false;
      out.sectionSubjects = records.map(record => ({ ...record, assignments: (record.assignments || []).map(item => {
        if (item.facultyId !== id) return item;
        touched = true; entry.offerings.push({ sectionId: record.sectionId, offeringId: item.id, subjectCode: item.subjectCode });
        return { ...item, facultyId: '' };
      }) }));
      if (!touched) delete out.sectionSubjects;
      const subjectAssignments = store.read('subjectAssignments', []) || [];
      if (subjectAssignments.some(item => (item.facultyIds || []).includes(id) || item.facultyId === id)) out.subjectAssignments = subjectAssignments.map(item => ({ ...item, facultyIds: (item.facultyIds || []).filter(x => x !== id), ...(item.facultyId === id ? { facultyId: '' } : {}) }));
    }
    out.archivedPeople = [...(store.read('archivedPeople', []) || []).filter(item => item.id !== id), entry];
    return out;
  }
  function restoreRecords(id) {
    const archive = store.read('archivedPeople', []) || [], entry = archive.find(item => item.id === id), out = { archivedPeople: archive.filter(item => item.id !== id) };
    if (!entry || !entry.record) return out;
    if (entry.kind === 'student') {
      const students = store.read('students', []) || [];
      if (!students.some(item => item.id === id)) out.students = [...students, entry.record];
      const offerings = new Set((store.read('sectionSubjects', []) || []).flatMap(record => (record.assignments || []).map(item => item.id)));
      const enrollments = store.read('studentEnrollments', []) || [], have = new Set(enrollments.map(item => item.id));
      const back = (entry.enrollments || []).filter(item => offerings.has(item.offeringId) && !have.has(item.id));
      if (back.length) out.studentEnrollments = [...enrollments, ...back];
    } else {
      const faculty = store.read('faculty', []) || [];
      if (!faculty.some(item => item.id === id)) out.faculty = [...faculty, entry.record];
      // Classes come back only if nobody else took them in the meantime.
      const wanted = new Set((entry.offerings || []).map(item => item.offeringId)), retaken = new Set();
      const records = (store.read('sectionSubjects', []) || []).map(record => ({ ...record, assignments: (record.assignments || []).map(item => {
        if (!wanted.has(item.id) || item.facultyId) return item;
        retaken.add(item.subjectCode); return { ...item, facultyId: id };
      }) }));
      if (retaken.size) {
        out.sectionSubjects = records;
        out.subjectAssignments = (store.read('subjectAssignments', []) || []).map(item => retaken.has(item.subjectCode) && !(item.facultyIds || []).includes(id) ? { ...item, facultyIds: [...(item.facultyIds || []), id] } : item);
      }
    }
    return out;
  }
  return { changeStatus };
}

/* A browser holding an old copy of students/faculty must not bring an archived
   person back into the lists by saving it. */
function dropArchived(store, key, value) {
  if (!['students', 'faculty'].includes(key) || !Array.isArray(value)) return value;
  const archived = new Set((store.read('archivedPeople', []) || []).map(item => item.id));
  return archived.size ? value.filter(item => !archived.has(item?.id)) : value;
}

module.exports = { createAccountLifecycleService, dropArchived, STATUS_BY_ACTION, REQUIRED_FROM, REASON_REQUIRED, STUDENT_ONLY };
