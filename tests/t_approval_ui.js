const { load } = require('./harness');
const ok = (condition, message) => console.log(`  ${condition ? '✅' : '❌'} ${message}`);

const base = {
  demoCurriculumVersion: 24,
  users: [
    { username: 'admin', password: 'a', role: 'admin', status: 'active' },
    { username: 'dean.demo', password: 'd', role: 'dean', status: 'active' },
    { username: 'coord.001', password: 'c', role: 'coordinator', status: 'active' },
    { username: 'F1', password: 'p', role: 'faculty', status: 'active' },
    { username: 'F2', password: 'p', role: 'faculty', status: 'active' },
    { username: 'S1', password: 'p', role: 'student', status: 'active' }
  ],
  coordinators: [{ id: 'coord.001', username: 'coord.001', first: 'Andrea', last: 'Cruz' }],
  faculty: [{ id: 'F1', first: 'Maria', last: 'Reyes' }, { id: 'F2', first: 'Jose', last: 'Santos' }],
  students: [{ id: 'S1', first: 'Juan', last: 'Cruz', sections: ['SEC-1'] }],
  subjects: [{ code: 'SUB-1', name: 'Human Computer Interaction' }],
  sections: [{ id: 'SEC-1', capacity: 50 }],
  sectionSubjects: [{ sectionId: 'SEC-1', assignments: [{ id: 'OFR-1', subjectCode: 'SUB-1', facultyId: 'F1' }] }],
  studentEnrollments: [], subjectAssignments: [], allotments: [], exams: [], questions: [], studentSubmissions: [],
  approvalRequests: [], applicationAuditLog: [], notifications: []
};
const snapshot = runner => Object.fromEntries(Object.keys(base).map(key => [key, runner.read(key)]));

console.log('=== APPROVAL UI. Coordinator submission and reviewer decisions ===');
let coordinator = load('coordinator.html', { ...base, currentUser: { username: 'coord.001', role: 'coordinator' } });
ok(!coordinator.blocked && coordinator.rec.errors.length === 0, 'Coordinator workflow page loads without runtime errors');
coordinator.d.getElementById('assignmentOffering').value = 'OFR-1';
coordinator.d.getElementById('assignmentProfessor').value = 'F2';
coordinator.d.getElementById('assignmentReason').value = 'Balance the current teaching load.';
coordinator.d.getElementById('assignmentRequestForm').dispatchEvent(new coordinator.w.Event('submit', { bubbles: true, cancelable: true }));
let requests = coordinator.read('approvalRequests');
ok(requests.length === 1 && requests[0].status === 'pending', 'Coordinator submits a pending Professor-assignment request');
ok(coordinator.read('sectionSubjects')[0].assignments[0].facultyId === 'F1', 'submission does not change the Professor before approval');

coordinator.d.getElementById('overloadStudent').value = 'S1';
coordinator.d.getElementById('overloadOffering').value = 'OFR-1';
coordinator.d.getElementById('overloadNormalLimit').value = '21';
coordinator.d.getElementById('overloadProposedUnits').value = '24';
coordinator.d.getElementById('overloadReason').value = 'Required for the final term.';
coordinator.d.getElementById('overloadRequestForm').dispatchEvent(new coordinator.w.Event('submit', { bubbles: true, cancelable: true }));
requests = coordinator.read('approvalRequests');
ok(requests.length === 2 && requests.some(item => item.type === 'student-overload'), 'Coordinator submits a pending Student-overload request');
ok(coordinator.d.querySelectorAll('#coordinatorLogTable tbody tr').length >= 2, 'Coordinator activity log refreshes after submissions');
coordinator.d.getElementById('coordinatorRequestStatus').value = 'approved';
coordinator.d.getElementById('coordinatorRequestStatus').dispatchEvent(new coordinator.w.Event('change'));
ok(/No matching assignment requests/.test(coordinator.d.getElementById('assignmentRequestList').textContent), 'Coordinator request status filter updates the list');

const shared = snapshot(coordinator);
let dean = load('dean.html', { ...shared, currentUser: { username: 'dean.demo', role: 'dean' } });
ok(!dean.blocked && dean.rec.errors.length === 0, 'Dean approval page loads without runtime errors');
const assignmentId = dean.read('approvalRequests').find(item => item.type === 'professor-assignment').id;
dean.d.getElementById(`remarks-${assignmentId}`).value = 'Schedule and load verified.';
dean.w.reviewAssignment(assignmentId, 'approved');
ok(dean.read('sectionSubjects')[0].assignments[0].facultyId === 'F2', 'Dean approval applies the proposed Professor assignment');
ok(dean.read('approvalRequests').find(item => item.id === assignmentId).status === 'approved', 'Dean decision is retained in request history');
ok(dean.d.querySelector('#deanApprovalList .role-history'), 'Dean can inspect retained request history');
ok(dean.d.querySelectorAll('#deanLogTable tbody tr').length >= 1, 'Dean activity log refreshes after a decision');

const afterDean = snapshot(dean);
let admin = load('admin.html', { ...afterDean, currentUser: { username: 'admin', role: 'admin' } });
ok(!admin.blocked && admin.rec.errors.length === 0, 'Admin overload page loads without runtime errors');
const overloadId = admin.read('approvalRequests').find(item => item.type === 'student-overload').id;
admin.d.getElementById(`admin-remarks-${overloadId}`).value = 'Academic need confirmed.';
admin.w.reviewOverload(overloadId, 'approved');
ok(admin.read('studentEnrollments').some(item => item.studentId === 'S1' && item.overloadApprovalId === overloadId), 'Admin approval creates the linked overload enrollment');
ok(admin.read('approvalRequests').find(item => item.id === overloadId).status === 'approved', 'Admin decision is retained in request history');
ok(admin.read('applicationAuditLog').some(item => item.details?.requestId === overloadId), 'UI decision creates an approval-linked audit event');
admin.d.getElementById('adminOverloadStatus').value = 'pending';
admin.d.getElementById('adminOverloadStatus').dispatchEvent(new admin.w.Event('change'));
ok(/No matching Student overload requests/.test(admin.d.getElementById('adminOverloadApprovalList').textContent), 'Admin overload status filter updates the queue');

coordinator.dom.window.close(); dean.dom.window.close(); admin.dom.window.close();
