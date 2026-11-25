'use strict';
// Server rules for the Coordinator → Dean requests (Add subjects / Add load / Add roles).
const assert = require('assert');
const { validateProtectedWrite } = require('../server/protected-write');
const { visibleRecords } = require('../server/access-policy');

const store = data => ({ read: (key, fallback) => (Object.hasOwn(data, key) ? JSON.parse(JSON.stringify(data[key])) : fallback) });
const coordinator = { username: 'coordinator.demo', role: 'coordinator' }, dean = { username: 'dean.demo', role: 'dean' }, faculty = { username: 'F1', role: 'faculty' };
const request = (type, change, by = coordinator) => ({ id: `APR-${type}`, type, requesterId: by.username, requesterRole: by.role, targetType: 'x', targetId: `${change.studentId || change.facultyId}:${change.offeringId}`, proposedChange: change, reason: 'Needed', status: 'pending', submittedAt: '2026-11-25T00:00:00Z', reviewerId: '', reviewerRole: 'dean', reviewerRemarks: '', decisionAt: '', history: [{ status: 'pending', at: '2026-11-25T00:00:00Z', actorId: by.username, actorRole: by.role, remarks: 'Needed' }] });
const throws403 = fn => assert.throws(fn, error => error.status === 403);

// 1) A Coordinator may submit both new request types.
for (const [type, change] of [['student-enrollment', { studentId: 'S1', offeringId: 'O1' }], ['professor-overload', { facultyId: 'F1', offeringId: 'O2', expectedFacultyId: '' }]]) {
  validateProtectedWrite(store({ approvalRequests: [] }), coordinator, 'approvalRequests', [request(type, change)]);
  throws403(() => validateProtectedWrite(store({ approvalRequests: [] }), faculty, 'approvalRequests', [request(type, change, faculty)]));
}
console.log('✅ Coordinators can send Student-subject and Professor-overload requests; other roles cannot');

// 2) The Dean's approval may add exactly the enrollment the pending request names.
const pending = request('student-enrollment', { studentId: 'S1', offeringId: 'O1' });
const db = store({ approvalRequests: [pending], studentEnrollments: [] });
validateProtectedWrite(db, dean, 'studentEnrollments', [{ id: 'E1', studentId: 'S1', offeringId: 'O1', subjectCode: 'CS1', sectionId: 'A', coordinatorEnrollmentApprovalId: pending.id }]);
throws403(() => validateProtectedWrite(db, dean, 'studentEnrollments', [{ id: 'E1', studentId: 'S1', offeringId: 'O9', subjectCode: 'CS9', sectionId: 'A', coordinatorEnrollmentApprovalId: pending.id }]));
throws403(() => validateProtectedWrite(db, dean, 'studentEnrollments', [{ id: 'E1', studentId: 'S1', offeringId: 'O1', subjectCode: 'CS1', sectionId: 'A' }]));
throws403(() => validateProtectedWrite(store({ approvalRequests: [{ ...pending, status: 'approved' }], studentEnrollments: [] }), dean, 'studentEnrollments', [{ id: 'E1', studentId: 'S1', offeringId: 'O1', coordinatorEnrollmentApprovalId: pending.id }]));
console.log('✅ the Dean can only add the enrollment a pending Coordinator request names');

// 3) The Dean may decide the new types.
const decided = { ...pending, status: 'approved', reviewerId: 'dean.demo', reviewerRole: 'dean', decisionAt: '2026-11-25T01:00:00Z', history: [...pending.history, { status: 'approved', at: '2026-11-25T01:00:00Z', actorId: 'dean.demo', actorRole: 'dean', remarks: '' }] };
validateProtectedWrite(store({ approvalRequests: [pending] }), dean, 'approvalRequests', [decided]);
console.log('✅ the Dean can approve the new request types');

// 4) Roles without settings access still get the load policies (and nothing else from settings).
const records = { systemSettings: { semester: 'First Semester', professorLoadPolicy: { normal: 18, maximum: 24 }, maintenance: true, permissionRoles: { x: 1 } } };
for (const role of ['coordinator', 'dean', 'faculty']) {
  const seen = visibleRecords({ username: 'u', role }, records).systemSettings;
  assert.deepEqual(seen, { semester: 'First Semester', professorLoadPolicy: { normal: 18, maximum: 24 } }, role);
}
assert.ok(visibleRecords({ username: 'admin', role: 'admin' }, records).systemSettings.permissionRoles, 'admins still see everything');
console.log('✅ load policies reach every role; other settings stay hidden');
