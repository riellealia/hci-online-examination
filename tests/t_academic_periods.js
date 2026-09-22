'use strict';
const assert = require('assert');
const { createAcademicPeriodService, normalizeOperationalWrite, validateSettingsWrite } = require('../server/academic-periods');

function memoryStore(seed = {}) {
  let records = structuredClone(seed);
  return {
    read(key, fallback) { return Object.hasOwn(records, key) ? structuredClone(records[key]) : fallback; },
    migrate(next) { records = { ...records, ...structuredClone(next) }; },
    all() { return structuredClone(records); }
  };
}

const store = memoryStore({
  systemSettings: { schoolYear:'2026-2027', semester:'First Semester' },
  sectionSubjects: [{ id:'OFR-1', subjectCode:'CICS1101' }],
  studentEnrollments: [{ id:'ENR-1', studentId:'S1', sectionSubjectId:'OFR-1' }],
  subjectAssignments: [{ id:'ASN-1', facultyId:'F1', sectionSubjectId:'OFR-1' }],
  exams: [{ id:'EX-1', subjectCode:'CICS1101' }],
  questions: [{ id:'Q-1', examId:'EX-1' }],
  studentSubmissions: [{ id:'SUB-1', examId:'EX-1', studentId:'S1', status:'submitted', answers:[{needsManualGrading:true,awarded:null}] }],
  approvalRequests: [{ id:'APR-1', status:'pending', type:'student-overload' }],
  applicationAuditLog: []
});
const service = createAcademicPeriodService(store);
const admin = { username:'admin', role:'admin' }, dean = { username:'dean.demo', role:'dean' };

const initial = service.list()[0];
assert.equal(initial.status, 'active');
assert.equal(store.read('systemSettings', {}).currentAcademicPeriodId, initial.id);
assert.throws(() => service.create({ schoolYear:'2027-2028', term:'First Semester', startDate:'bad', endDate:'2027-12-20' }, admin), /valid date/i);
assert.throws(() => service.create({ schoolYear:'2027-2028', term:'Summer', startDate:'2028-02-30', endDate:'2028-05-20' }, admin), /valid date/i);
assert.throws(() => service.create({ schoolYear:'2027-2028', term:'First Semester', startDate:'2027-08-01', endDate:'2027-12-20' }, dean), /Administrator/i);
assert.throws(() => validateSettingsWrite(store, { ...store.read('systemSettings', {}), semester:'Second Semester' }), /academic-period workflow/i);
const newEnrollment = normalizeOperationalWrite(store, 'studentEnrollments', [...store.read('studentEnrollments', []), { id:'ENR-2', studentId:'S2' }]);
assert.equal(newEnrollment.at(-1).academicPeriodId, initial.id);
assert.equal(newEnrollment.at(-1).periodStatus, 'active');
assert.throws(() => normalizeOperationalWrite(store, 'studentEnrollments', [{ ...store.read('studentEnrollments', [])[0], periodStatus:'closed' }]), /only change through rollover/i);
const next = service.create({ schoolYear:'2027-2028', term:'First Semester', startDate:'2027-08-01', endDate:'2027-12-20', enrollmentStart:'2027-07-01', enrollmentEnd:'2027-08-15' }, admin);
assert.equal(next.status, 'draft');
assert.throws(() => service.activate(next.id, admin), /Close the current/i);

const report = service.impact(initial.id);
assert.equal(report.counts.studentEnrollments, 1);
assert.equal(report.warnings.pendingApprovals, 1);
assert.equal(report.warnings.pendingGrading, 1);
assert.throws(() => service.close(initial.id, '', admin), /reason is required/i);
const beforeCounts = Object.fromEntries(['studentEnrollments','subjectAssignments','exams','questions','studentSubmissions','approvalRequests'].map(key => [key, store.read(key, []).length]));
service.close(initial.id, 'End of term verified by registrar.', admin);
assert.throws(() => normalizeOperationalWrite(store, 'studentEnrollments', []), /Historical.*cannot be removed/i);
assert.throws(() => normalizeOperationalWrite(store, 'studentEnrollments', [{ ...store.read('studentEnrollments', [])[0], studentId:'ALTERED' }]), /Historical.*cannot be changed/i);
assert.throws(() => normalizeOperationalWrite(store, 'studentEnrollments', [...store.read('studentEnrollments', []), { id:'ENR-LATE' }]), /No active academic period/i);
for (const [key, count] of Object.entries(beforeCounts)) {
  const rows = store.read(key, []);
  assert.equal(rows.length, count, `${key} must be preserved`);
  assert.ok(rows.every(item => item.academicPeriodId === initial.id && item.periodStatus === 'closed'), `${key} must be archived to the closed period`);
}
assert.equal(service.activeRecords('studentEnrollments').length, 0);
assert.ok(store.read('applicationAuditLog', []).some(item => item.action === 'close' && item.academicPeriod === initial.id));

service.activate(next.id, admin, 'New term opened.');
const fresh = normalizeOperationalWrite(store, 'studentEnrollments', [...store.read('studentEnrollments', []), { id:'ENR-NEW', studentId:'S2' }]);
assert.equal(fresh.at(-1).academicPeriodId, next.id);
assert.throws(() => normalizeOperationalWrite(store, 'studentEnrollments', [...store.read('studentEnrollments', []), { id:'ENR-OLD', academicPeriodId:initial.id }]), /active academic period/i);
assert.equal(service.activeRecords('studentEnrollments').length, 0, 'a new term must not copy enrollments');
assert.equal(service.activeRecords('subjectAssignments').length, 0, 'a new term must not copy professor assignments');
service.archive(initial.id, 'Retention archive created.', admin);
assert.equal(service.list().find(item => item.id === initial.id).status, 'archived');
assert.equal(service.recordsForPeriod('studentSubmissions', initial.id).length, 1);
assert.equal(service.list().filter(item => item.status === 'active').length, 1);

console.log('✅ academic-period lifecycle preserves history and does not copy active relationships');
