const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const records = {
  users: [
    { username: 'admin', role: 'admin', status: 'active' },
    { username: 'dean.demo', role: 'dean', status: 'active' },
    { username: 'coord.001', role: 'coordinator', status: 'active' },
    { username: 'F1', role: 'faculty', status: 'active' },
    { username: 'F2', role: 'faculty', status: 'active' },
    { username: 'S1', role: 'student', status: 'active' },
    { username: 'S2', role: 'student', status: 'active' }
  ],
  faculty: [{ id: 'F1' }, { id: 'F2' }], students: [{ id: 'S1' }, { id: 'S2' }],
  sections: [{ id: 'SEC-1', capacity: 2 }],
  sectionSubjects: [{ sectionId: 'SEC-1', assignments: [
    { id: 'OFR-1', subjectCode: 'SUB-1', facultyId: 'F1' },
    { id: 'OFR-2', subjectCode: 'SUB-2', facultyId: 'F1' }
  ] }],
  studentEnrollments: [], approvalRequests: [], applicationAuditLog: [], notifications: []
};
const copy = value => JSON.parse(JSON.stringify(value));
const context = vm.createContext({
  console,
  DB: {
    read(key, fallback) { return key in records ? copy(records[key]) : fallback; },
    write(key, value) { records[key] = copy(value); return true; }
  },
  window: {}, SectionService: {}
});
for (const file of ['permission-service.js', 'audit-service.js', 'approval-service.js', 'academic-workflow-service.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context, { filename: file });
}
const approvals = context.window.ApprovalService;
const workflows = context.window.AcademicWorkflowService;
const coordinator = { username: 'coord.001', role: 'coordinator' };
const dean = { username: 'dean.demo', role: 'dean' };
const admin = { username: 'admin', role: 'admin' };

const assignment = workflows.requestProfessorAssignment({ offeringId: 'OFR-1', facultyId: 'F2', reason: 'Balanced teaching load.', academicPeriod: '2026-1' }, coordinator);
assert.strictEqual(records.sectionSubjects[0].assignments[0].facultyId, 'F1', 'submission must not apply the proposal early');
approvals.approve(assignment.id, 'Schedule and load verified.', dean);
assert.strictEqual(records.sectionSubjects[0].assignments[0].facultyId, 'F2', 'Dean approval must apply the exact Professor assignment');

const stale = workflows.requestProfessorAssignment({ offeringId: 'OFR-2', facultyId: 'F2', reason: 'Coverage update.' }, coordinator);
records.sectionSubjects[0].assignments[1].facultyId = 'F2';
assert.throws(() => approvals.approve(stale.id, 'Reviewed.', dean), error => error.code === 'STALE_TARGET');
assert.strictEqual(records.approvalRequests.find(item => item.id === stale.id).status, 'pending', 'failed application must remain pending for review');

const overload = workflows.requestStudentOverload({ studentId: 'S1', offeringId: 'OFR-1', proposedUnits: 24, normalLimit: 21, reason: 'Final-term requirement.', academicPeriod: '2026-1' }, coordinator);
assert.strictEqual(records.studentEnrollments.length, 0, 'overload submission must not enroll early');
approvals.approve(overload.id, 'Requirements confirmed.', admin);
assert.strictEqual(records.studentEnrollments.length, 1);
assert.strictEqual(records.studentEnrollments[0].overloadApprovalId, overload.id);
assert.throws(() => workflows.requestStudentOverload({ studentId: 'S1', offeringId: 'OFR-1', proposedUnits: 25, normalLimit: 21, reason: 'Duplicate.' }, coordinator), /already enrolled/i);
assert.throws(() => workflows.requestStudentOverload({ studentId: 'S2', offeringId: 'OFR-2', proposedUnits: 21, normalLimit: 21, reason: 'Not overloaded.' }, coordinator), /does not exceed/i);

const appliedEvents = records.applicationAuditLog.filter(item => item.action.startsWith('apply-approved'));
assert.strictEqual(appliedEvents.length, 2);
assert.ok(appliedEvents.every(item => item.category === 'assignment/enrollment'));
assert.ok(appliedEvents.every(item => item.academicPeriod === '2026-1'));
console.log('✅ approved academic changes, stale-request protection, overload validation, and audit linkage pass');
