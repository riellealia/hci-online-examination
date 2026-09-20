/* Domain handlers behind the shared approval engine. These functions validate
   current data again at decision time so stale requests never alter records. */
const AcademicWorkflowService = (() => {
  const copy = value => JSON.parse(JSON.stringify(value));
  function fail(message, code = 'WORKFLOW_VALIDATION_FAILED') { const error = new Error(message); error.code = code; throw error; }
  function offeringById(records, offeringId) {
    for (const section of records) {
      const assignment = (section.assignments || []).find(item => item.id === offeringId);
      if (assignment) return { section, assignment };
    }
    return null;
  }
  function activeAccount(username, role) {
    return DB.read('users', []).some(user => user.username === username && user.role === role
      && user.disabled !== true && !['deactivated', 'archived', 'graduated', 'transferred'].includes(String(user.status || 'active').toLowerCase()));
  }
  function unitRecord(subjectCode) {
    const subject=DB.read('subjects', []).find(item=>item.code===subjectCode&&Number(item.units)>0);
    if(subject)return{units:Number(subject.units),source:'subject'};
    const curriculum=DB.read('curricula', []).find(item=>item.subjectCode===subjectCode&&Number(item.units)>0);
    return curriculum?{units:Number(curriculum.units),source:'curriculum'}:null;
  }
  function studentLoad(studentId) {
    const seen=new Set();
    return DB.read('studentEnrollments', []).filter(item=>item.studentId===studentId&&!seen.has(item.subjectCode)&&seen.add(item.subjectCode)).reduce((sum,item)=>sum+(unitRecord(item.subjectCode)?.units||0),0);
  }
  function proposedStudentLoad(studentId, subjectCode) {
    const record=unitRecord(subjectCode),currentUnits=studentLoad(studentId);
    return record?{currentUnits,subjectUnits:record.units,proposedUnits:currentUnits+record.units,source:record.source}:null;
  }
  function requestProfessorAssignment({ offeringId, facultyId, reason, academicPeriod = '' }, actor = null) {
    const sectionSubjects = DB.read('sectionSubjects', []), located = offeringById(sectionSubjects, offeringId);
    if (!located) fail('The selected subject offering does not exist.', 'NOT_FOUND');
    if (!DB.read('faculty', []).some(person => person.id === facultyId) || !activeAccount(facultyId, 'faculty')) fail('The selected Professor is not active.');
    return ApprovalService.submit({
      type: 'professor-assignment', targetType: 'subject-offering', targetId: offeringId,
      proposedChange: { offeringId, facultyId, expectedFacultyId: located.assignment.facultyId || '' },
      reason, academicPeriod
    }, actor);
  }
  function applyProfessorAssignment(change, request, actor) {
    const records = DB.read('sectionSubjects', []), located = offeringById(records, change.offeringId);
    if (!located) fail('The subject offering was removed after this request was submitted.', 'STALE_TARGET');
    if ((located.assignment.facultyId || '') !== (change.expectedFacultyId || '')) fail('The Professor assignment changed after submission. Review the request again.', 'STALE_TARGET');
    if (!DB.read('faculty', []).some(person => person.id === change.facultyId) || !activeAccount(change.facultyId, 'faculty')) fail('The proposed Professor is no longer active.', 'STALE_TARGET');
    const previousValue = { facultyId: located.assignment.facultyId || '' };
    located.assignment.facultyId = change.facultyId;
    if (!DB.write('sectionSubjects', records)) fail('The approved Professor assignment could not be saved.', 'SAVE_FAILED');
    if (typeof AuditLog !== 'undefined') AuditLog.record('apply-approved-assignment', 'subject-offering', change.offeringId,
      { requestId: request.id }, actor, { category: 'assignment/enrollment', previousValue, newValue: { facultyId: change.facultyId }, result: 'success', academicPeriod: request.academicPeriod });
  }
  function requestStudentOverload({ studentId, offeringId, proposedUnits, normalLimit, maximumLimit, reason, academicPeriod = '' }, actor = null) {
    const located = offeringById(DB.read('sectionSubjects', []), offeringId);
    if (!located) fail('The selected subject offering does not exist.', 'NOT_FOUND');
    if (!DB.read('students', []).some(student => student.id === studentId) || !activeAccount(studentId, 'student')) fail('The selected Student is not active.');
    if (DB.read('studentEnrollments', []).some(item => item.studentId === studentId && (item.offeringId === offeringId || item.subjectCode === located.assignment.subjectCode))) fail('The Student is already enrolled in this subject.');
    const calculated=proposedStudentLoad(studentId,located.assignment.subjectCode),effectiveProposedUnits=calculated?.proposedUnits??Number(proposedUnits);
    if (!(effectiveProposedUnits > Number(normalLimit))) fail('The proposed load does not exceed the normal limit. No overload approval is required.');
    if (maximumLimit !== undefined && maximumLimit !== '' && Number.isFinite(Number(maximumLimit)) && effectiveProposedUnits > Number(maximumLimit)) fail(`The proposed load exceeds the configured maximum of ${Number(maximumLimit)} units.`);
    return ApprovalService.submit({
      type: 'student-overload', targetType: 'student-enrollment', targetId: `${studentId}:${offeringId}`,
      proposedChange: { studentId, offeringId, subjectCode: located.assignment.subjectCode, sectionId: located.section.sectionId, currentUnits:calculated?.currentUnits??null,subjectUnits:calculated?.subjectUnits??null,proposedUnits:effectiveProposedUnits,normalLimit: Number(normalLimit), maximumLimit: maximumLimit === undefined || maximumLimit === '' ? null : Number(maximumLimit) },
      reason, academicPeriod
    }, actor);
  }
  function applyStudentOverload(change, request, actor) {
    const located = offeringById(DB.read('sectionSubjects', []), change.offeringId);
    if (!located || located.assignment.subjectCode !== change.subjectCode || located.section.sectionId !== change.sectionId) fail('The subject offering changed after submission. Review the request again.', 'STALE_TARGET');
    if (!activeAccount(change.studentId, 'student')) fail('The Student is no longer active.', 'STALE_TARGET');
    const enrollments = DB.read('studentEnrollments', []);
    if (enrollments.some(item => item.studentId === change.studentId && (item.offeringId === change.offeringId || item.subjectCode === change.subjectCode))) fail('The Student has already been enrolled.', 'STALE_TARGET');
    const sections = DB.read('sections', []), section = sections.find(item => item.id === change.sectionId);
    const occupied = new Set(enrollments.filter(item => item.sectionId === change.sectionId).map(item => item.studentId)).size;
    if (section && Number(section.capacity) > 0 && occupied >= Number(section.capacity)) fail('The selected Section is already full.', 'STALE_TARGET');
    const enrollment = { id: `ENR-${change.studentId}-${Date.now()}`, studentId: change.studentId, offeringId: change.offeringId, subjectCode: change.subjectCode, sectionId: change.sectionId, overloadApprovalId: request.id };
    enrollments.push(enrollment);
    if (!DB.write('studentEnrollments', enrollments)) fail('The approved enrollment could not be saved.', 'SAVE_FAILED');
    if (typeof AuditLog !== 'undefined') AuditLog.record('apply-approved-overload', 'student-enrollment', enrollment.id,
      { requestId: request.id, studentId: change.studentId }, actor, { category: 'assignment/enrollment', previousValue: null, newValue: copy(enrollment), result: 'success', academicPeriod: request.academicPeriod });
  }
  function install() {
    ApprovalService.registerApplyHandler('professor-assignment', applyProfessorAssignment);
    ApprovalService.registerApplyHandler('student-overload', applyStudentOverload);
    return true;
  }
  return { install, unitRecord, studentLoad, proposedStudentLoad, requestProfessorAssignment, requestStudentOverload, applyProfessorAssignment, applyStudentOverload };
})();

AcademicWorkflowService.install();
if (typeof window !== 'undefined') window.AcademicWorkflowService = AcademicWorkflowService;

