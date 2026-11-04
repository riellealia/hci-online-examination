'use strict';

const WRITE_ACCESS = Object.freeze({
  admin: '*',
  dean: new Set(['approvalRequests', 'notifications', 'sectionSubjects', 'studentEnrollments', 'applicationAuditLog', 'inboxReadReceipts']),
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

function visibleRecords(session, records) {
  const visible = Object.fromEntries(Object.entries(records).filter(([key]) => permitted(session, key, 'GET')));
  // requireRole() verifies that the signed-in account still exists. Students
  // must receive that one record without gaining access to the user directory.
  if (session?.role === 'student' && Array.isArray(records.users)) {
    visible.users = records.users.filter(item => item.username === session.username);
  }
  return visible;
}

module.exports = { permitted, requireCollectionAccess, visibleRecords, WRITE_ACCESS, READ_DENY };
