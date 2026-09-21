const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const records = {
  users: [
    { username: 'admin', role: 'admin', status: 'active' },
    { username: 'dean.demo', role: 'dean', status: 'active' },
    { username: 'coord.001', role: 'coordinator', status: 'active' },
    { username: 'faculty.001', role: 'faculty', status: 'active' },
    { username: 'student.001', role: 'student', status: 'active' },
    { username: 'archived.001', role: 'coordinator', status: 'archived' }
  ],
  approvalRequests: [], applicationAuditLog: [], notifications: []
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
for (const file of ['permission-service.js', 'audit-service.js', 'approval-service.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), context, { filename: file });
}
const permissions = context.window.PermissionService;
const approvals = context.window.ApprovalService;

assert.strictEqual(permissions.can('offering.manage', { actor: { username: 'coord.001', role: 'coordinator' } }), true);
assert.strictEqual(permissions.can('approval.professor-assignment.review', { actor: { username: 'coord.001', role: 'coordinator' } }), false);
assert.strictEqual(permissions.can('offering.manage', { actor: { username: 'archived.001', role: 'coordinator' } }), false);
assert.strictEqual(permissions.can('offering.manage', { actor: { username: 'student.001', role: 'admin' } }), false, 'session role spoofing must fail');
assert.throws(() => permissions.require('schedule.manage', { actor: { username: 'student.001', role: 'student' } }), error => error.code === 'PERMISSION_DENIED');

const coordinator = { username: 'coord.001', role: 'coordinator' };
const dean = { username: 'dean.demo', role: 'dean' };
const admin = { username: 'admin', role: 'admin' };
const submitted = approvals.submit({
  type: 'professor-assignment', targetType: 'subject-offering', targetId: 'OFR-001',
  proposedChange: { facultyId: 'faculty.001' }, reason: 'Professor is available.', academicPeriod: '2026-1'
}, coordinator);
assert.strictEqual(submitted.status, 'pending');
assert.strictEqual(submitted.history.length, 1);
assert.throws(() => approvals.submit({
  type: 'professor-assignment', targetType: 'subject-offering', targetId: 'OFR-001',
  proposedChange: { facultyId: 'faculty.001' }, reason: 'Duplicate proposal.'
}, coordinator), error => error.code === 'DUPLICATE_PENDING');
assert.throws(() => approvals.approve(submitted.id, '', coordinator), error => error.code === 'PERMISSION_DENIED');

let applied = null;
approvals.registerApplyHandler('professor-assignment', change => { applied = change; });
const approved = approvals.approve(submitted.id, 'Load and schedule verified.', dean);
assert.strictEqual(approved.status, 'approved');
assert.strictEqual(JSON.stringify(applied), JSON.stringify({ facultyId: 'faculty.001' }));
assert.throws(() => approvals.reject(submitted.id, 'Changed mind', dean), error => error.code === 'INVALID_TRANSITION');

const rejectedRequest = approvals.submit({
  type: 'student-overload', targetType: 'student', targetId: 'student.001',
  proposedChange: { units: 27 }, reason: 'Graduation requirement.'
}, coordinator);
assert.throws(() => approvals.reject(rejectedRequest.id, '', dean), /remarks are required/i);
assert.strictEqual(approvals.reject(rejectedRequest.id, 'Maximum load exceeded.', dean).status, 'rejected');

const withdrawnRequest = approvals.submit({
  type: 'professor-assignment', targetType: 'subject-offering', targetId: 'OFR-002',
  proposedChange: { facultyId: 'faculty.001' }, reason: 'Initial proposal.'
}, coordinator);
assert.throws(() => approvals.withdraw(withdrawnRequest.id, '', dean), error => error.code === 'PERMISSION_DENIED');
assert.strictEqual(approvals.withdraw(withdrawnRequest.id, 'Assignment changed.', coordinator).status, 'withdrawn');

const cancelledRequest = approvals.submit({
  type: 'student-overload', targetType: 'student', targetId: 'student.001',
  proposedChange: { units: 25 }, reason: 'Temporary request.'
}, coordinator);
assert.throws(() => approvals.cancel(cancelledRequest.id, 'Not authorized.', dean), error => error.code === 'PERMISSION_DENIED');
assert.strictEqual(approvals.cancel(cancelledRequest.id, 'Request is no longer applicable.', admin).status, 'cancelled');

assert.strictEqual(approvals.query({ status: 'approved' }, admin).length, 1);
assert.strictEqual(approvals.query({ status: 'approved' }).length, 0, 'anonymous callers cannot read approval records');
assert.strictEqual(approvals.queryFor(coordinator).length, 4, 'Coordinator sees only their submitted requests');
assert.strictEqual(approvals.queryFor(dean).length, 4, 'Dean sees Professor-assignment and Student-overload applications');
assert.strictEqual(approvals.queryFor(dean, { type: 'student-overload' }).length, 2, 'Dean query preserves the requested application type filter');
assert.strictEqual(approvals.queryFor({ username: 'student.001', role: 'student' }).length, 0, 'Student cannot read approval records');
assert.ok(records.applicationAuditLog.length >= 6, 'approval activity must create audit records');
assert.ok(records.applicationAuditLog.every(item => item.category === 'approval'));
assert.ok(records.applicationAuditLog.some(item => item.result === 'denied'), 'denied review and cancellation attempts are audited');
assert.ok(records.applicationAuditLog.every(item => 'previousValue' in item && 'newValue' in item && 'academicPeriod' in item));
assert.ok(records.notifications.some(item => item.userId === 'coord.001' && /approved/.test(item.message)));
assert.ok(records.notifications.some(item => item.userId === 'dean.demo' && /awaiting review/.test(item.message)), 'review notices target active Dean accounts instead of a role-name placeholder');
assert.strictEqual(vm.runInContext("AuditLog.query({category:'approval'}).length", context), records.applicationAuditLog.length);
assert.strictEqual(vm.runInContext("AuditLog.queryFor({username:'student.001',role:'student'}).length", context), 0, 'Student cannot read administrative audit history');
assert.ok(vm.runInContext("AuditLog.queryFor({username:'dean.demo',role:'dean'}).length", context) > 0, 'Dean can read college approval history');

console.log('✅ shared permission, approval lifecycle, audit, and notification foundations pass');
