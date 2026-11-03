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
    { username: 'S2', role: 'student', status: 'active' },
    { username: 'S3', role: 'student', status: 'active' }
  ],
  faculty: [{ id: 'F1' }, { id: 'F2' }], students: [{ id: 'S1' }, { id: 'S2' }, { id: 'S3' }],
  subjects: [{code:'SUB-1',units:3},{code:'SUB-2',units:3}],
  sections: [{ id: 'SEC-1', capacity: 3 }, { id: 'SEC-2', capacity: 3 }],
  sectionSubjects: [{ sectionId: 'SEC-1', assignments: [
    { id: 'OFR-1', subjectCode: 'SUB-1', facultyId: 'F1' },
    { id: 'OFR-2', subjectCode: 'SUB-2', facultyId: 'F1' }
  ] }, {sectionId:'SEC-2',assignments:[{id:'OFR-3',subjectCode:'SUB-1',facultyId:'F2'}]}],
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
const faculty = { username: 'F2', role: 'faculty' };

const assignment = workflows.requestProfessorAssignment({ offeringId: 'OFR-1', facultyId: 'F2', reason: 'Balanced teaching load.', academicPeriod: '2026-1' }, coordinator);
assert.strictEqual(records.sectionSubjects[0].assignments[0].facultyId, 'F1', 'submission must not apply the proposal early');
approvals.approve(assignment.id, 'Schedule and load verified.', dean);
assert.strictEqual(records.sectionSubjects[0].assignments[0].facultyId, 'F2', 'Dean approval must apply the exact Professor assignment');

const facultyAdd=workflows.requestFacultyStudentEnrollment({action:'add',studentId:'S3',offeringId:'OFR-1',subjectCode:'SUB-1',reason:'Add Student to my approved group.'},faculty);
assert.strictEqual(records.studentEnrollments.length,0,'Faculty submission must never enroll the Student early');
approvals.approve(facultyAdd.id,'Enrollment checked.',dean);
assert.strictEqual(records.studentEnrollments.find(item=>item.studentId==='S3').offeringId,'OFR-1');
const facultyMove=workflows.requestFacultyStudentEnrollment({action:'move',studentId:'S3',offeringId:'OFR-3',subjectCode:'SUB-1',reason:'Move Student to my other approved group.'},faculty);
assert.strictEqual(records.studentEnrollments.find(item=>item.studentId==='S3').offeringId,'OFR-1','move remains pending without changing enrollment');
approvals.approve(facultyMove.id,'Move checked.',dean);
assert.strictEqual(records.studentEnrollments.find(item=>item.studentId==='S3').offeringId,'OFR-3');
const facultyRemove=workflows.requestFacultyStudentEnrollment({action:'remove',studentId:'S3',subjectCode:'SUB-1',reason:'Remove Student from my approved group.'},faculty);
approvals.approve(facultyRemove.id,'Removal checked.',dean);
assert.ok(!records.studentEnrollments.some(item=>item.studentId==='S3'),'approved removal changes only the saved proposal');
assert.strictEqual(approvals.queryFor(faculty).filter(item=>item.type==='faculty-student-enrollment').length,3,'Professor sees owned request history');
delete records.subjects;

const stale = workflows.requestProfessorAssignment({ offeringId: 'OFR-2', facultyId: 'F2', reason: 'Coverage update.' }, coordinator);
records.sectionSubjects[0].assignments[1].facultyId = 'F2';
assert.throws(() => approvals.approve(stale.id, 'Reviewed.', dean), error => error.code === 'STALE_TARGET');
assert.strictEqual(records.approvalRequests.find(item => item.id === stale.id).status, 'pending', 'failed application must remain pending for review');
assert.ok(records.applicationAuditLog.some(item => item.entityId === stale.id && item.action === 'apply-failed' && item.result === 'failed'), 'stale application failure must be audited');

const overload = workflows.requestStudentOverload({ studentId: 'S1', offeringId: 'OFR-1', proposedUnits: 24, normalLimit: 21, reason: 'Final-term requirement.', academicPeriod: '2026-1' }, coordinator);
assert.strictEqual(records.studentEnrollments.length, 0, 'overload submission must not enroll early');
approvals.approve(overload.id, 'Requirements confirmed.', dean);
assert.strictEqual(records.studentEnrollments.length, 1);
assert.strictEqual(records.studentEnrollments[0].overloadApprovalId, overload.id);
records.subjects=[{code:'SUB-2',units:3},...Array.from({length:7},(_,index)=>({code:`BASE-${index}`,units:3}))];
records.studentEnrollments.push(...Array.from({length:7},(_,index)=>({id:`BASE-${index}`,studentId:'S2',subjectCode:`BASE-${index}`})));
const calculatedOverload=workflows.requestStudentOverload({studentId:'S2',offeringId:'OFR-2',proposedUnits:99,normalLimit:21,maximumLimit:30,reason:'Calculated from enrolled units.'},coordinator);
assert.strictEqual(calculatedOverload.proposedChange.currentUnits,21);assert.strictEqual(calculatedOverload.proposedChange.subjectUnits,3);assert.strictEqual(calculatedOverload.proposedChange.proposedUnits,24,'unit count is the authoritative Student load');
records.sections[0].capacity=10;
records.sectionSubjects[0].assignments[0].schedule={days:['Monday'],start:'09:00',end:'10:00'};
records.sectionSubjects[0].assignments[1].schedule={days:['Monday'],start:'09:30',end:'10:30'};
assert.throws(()=>workflows.requestProfessorAssignment({offeringId:'OFR-2',facultyId:'F2',reason:'Conflicting claim.'},coordinator),error=>error.code==='SCHEDULE_CONFLICT','Professor assignment requests must reject overlapping schedules outside the UI');
records.studentEnrollments.push({id:'S2-CONFLICT',studentId:'S2',offeringId:'OFR-1',subjectCode:'SUB-1',sectionId:'SEC-1'});
const overloadReview=workflows.reviewStudentOverload(calculatedOverload);
assert.strictEqual(overloadReview.policy.maximumLimit,30,'Dean review uses the current configured absolute maximum');
assert.strictEqual(overloadReview.conflicts[0].offeringId,'OFR-1','Dean review identifies the conflicting offering');
assert.throws(()=>approvals.approve(calculatedOverload.id,'Reviewed.',dean),error=>error.code==='SCHEDULE_CONFLICT');
assert.strictEqual(records.approvalRequests.find(item=>item.id===calculatedOverload.id).status,'pending','a conflict discovered at decision time keeps the request pending');
assert.throws(() => workflows.requestStudentOverload({ studentId: 'S1', offeringId: 'OFR-1', proposedUnits: 25, normalLimit: 21, reason: 'Duplicate.' }, coordinator), /already enrolled/i);

const appliedEvents = records.applicationAuditLog.filter(item => item.action.startsWith('apply-approved'));
assert.strictEqual(appliedEvents.length, 5);
assert.ok(appliedEvents.every(item => item.category === 'assignment/enrollment'));
assert.strictEqual(appliedEvents.filter(item=>item.action.startsWith('apply-approved-faculty-enrollment-')).length,3);
assert.ok(appliedEvents.filter(item=>!item.action.startsWith('apply-approved-faculty-enrollment-')).every(item => item.academicPeriod === '2026-1'));
console.log('✅ approved academic changes, stale-request protection, overload validation, and audit linkage pass');
