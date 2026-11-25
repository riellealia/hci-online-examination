'use strict';

const WRITE_ACCESS = Object.freeze({
  admin: '*',
  dean: new Set(['approvalRequests', 'notifications', 'sections', 'sectionSubjects', 'studentEnrollments', 'applicationAuditLog', 'inboxReadReceipts', 'roleAssignments']),
  coordinator: new Set(['approvalRequests', 'notifications', 'sections', 'sectionSubjects', 'applicationAuditLog', 'inboxReadReceipts']),
  faculty: new Set(['exams', 'questions', 'studentSubmissions', 'approvalRequests', 'notifications', 'subjects', 'subjectWorkspaceContent', 'questionReports', 'reportBlockedStudents', 'studentNotifications', 'studentEmails', 'applicationAuditLog', 'inboxReadReceipts', 'questionDrafts']),
  student: new Set(['studentSubmissions', 'subjectContentViews', 'studentEmails', 'questionReports', 'studentNotifications', 'inboxReadReceipts', 'examAttempts'])
});

const READ_DENY = Object.freeze({
  dean: new Set(['systemSettings']),
  coordinator: new Set(['systemSettings']),
  faculty: new Set(['systemSettings', 'applicationAuditLog']),
  student: new Set(['users', 'systemSettings', 'applicationAuditLog', 'approvalRequests', 'notifications', 'lastIntegrityCheck'])
});

function permitted(session, key, method) {
  const role = session?.role;
  if (!role || !key) return false;
  if (role === 'admin') return true;
  if (method === 'GET') return !READ_DENY[role]?.has(key);
  return WRITE_ACCESS[role]?.has(key) === true;
}

function requireCollectionAccess(session, key, method) {
  if (permitted(session, key, method)) return true;
  const error = new Error('This account is not authorized to access that collection.');
  error.status = 403;
  error.code = 'COLLECTION_FORBIDDEN';
  throw error;
}

// Per-record filter (server/exam-guard): answer keys and other students' records.
let recordFilter = null;
function setRecordFilter(fn) { recordFilter = typeof fn === 'function' ? fn : null; }
function filterRecord(session, key, value) { return recordFilter ? recordFilter(session, key, value) : value; }

function visibleRecords(session, records) {
  const visible = Object.fromEntries(Object.entries(records).filter(([key]) => permitted(session, key, 'GET')).map(([key, value]) => [key, filterRecord(session, key, value)]));
  // requireRole() verifies that the signed-in account still exists. Students
  // must receive that one record without gaining access to the user directory.
  // Load limits are needed to check load and overload requests, so every role
  // gets the policy part of the settings (and nothing else from them).
  if (!visible.systemSettings && records.systemSettings && typeof records.systemSettings === 'object') {
    const { semester, schoolYear, currentAcademicPeriodId, loadPolicies, professorLoadPolicy } = records.systemSettings;
    visible.systemSettings = Object.fromEntries(Object.entries({ semester, schoolYear, currentAcademicPeriodId, loadPolicies, professorLoadPolicy }).filter(([, v]) => v !== undefined));
  }
  if (session?.role === 'student' && Array.isArray(records.users)) {
    visible.users = records.users.filter(item => item.username === session.username);
  }
  return visible;
}

module.exports = { permitted, requireCollectionAccess, visibleRecords, setRecordFilter, filterRecord, WRITE_ACCESS, READ_DENY };
