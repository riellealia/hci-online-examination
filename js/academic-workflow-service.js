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
  function activeOfferingExists(records, offeringId) {
    if(typeof SectionService==='undefined'||typeof SectionService.assignmentOfferings!=='function')return Boolean(offeringById(records,offeringId));
    return SectionService.assignmentOfferings(records,DB.read('sections',[]),DB.read('curricula',[])).some(item=>item.id===offeringId);
  }
  function activeAccount(username, role) {
    return DB.read('users', []).some(user => user.username === username && user.role === role
      && user.disabled !== true && !['deactivated', 'archived', 'graduated', 'transferred'].includes(String(user.status || 'active').toLowerCase()));
  }
  function unitRecord(subjectCode) {
    const curriculum=DB.read('curricula', []).find(item=>item.subjectCode===subjectCode&&Number(item.units)>0);
    if(curriculum)return{units:Number(curriculum.units),source:'curriculum'};
    const subject=DB.read('subjects', []).find(item=>item.code===subjectCode&&Number(item.units)>0);
    return subject?{units:Number(subject.units),source:'legacy-subject'}:null;
  }
  function studentLoad(studentId) {
    const seen=new Set();
    return DB.read('studentEnrollments', []).filter(item=>item.studentId===studentId&&!seen.has(item.subjectCode)&&seen.add(item.subjectCode)).reduce((sum,item)=>sum+(unitRecord(item.subjectCode)?.units||0),0);
  }
  function proposedStudentLoad(studentId, subjectCode) {
    const record=unitRecord(subjectCode),currentUnits=studentLoad(studentId);
    return record?{currentUnits,subjectUnits:record.units,proposedUnits:currentUnits+record.units,source:record.source}:null;
  }
  function loadPolicyForStudent(studentId) {
    const student=DB.read('students',[]).find(item=>item.id===studentId)||{},sections=DB.read('sections',[]);
    const section=sections.find(item=>(student.sections||[]).includes(item.id))||{};
    const settings=DB.read('systemSettings',{})||{},semester=String(settings.semester||'First Semester').toLowerCase();
    const term=semester.includes('second')?'second':semester.includes('summer')?'summer':'first';
    const program=section.program||student.program||'BSCS',year=Number(section.yearLevel||student.yearLevel||1);
    const defaults={first:{load:20,overload:30},second:{load:23,overload:27},summer:{load:15,overload:20}};
    const configured=settings.loadPolicies?.[program]?.[year]?.[term]||defaults[term];
    return{program,year,term,normalLimit:Number(configured.load),maximumLimit:Number(configured.overload)};
  }
  function scheduleSlots(assignment) {
    const raw=Array.isArray(assignment?.schedules)?assignment.schedules:assignment?.schedule?[assignment.schedule]:[];
    return raw.map(slot=>({days:[...(Array.isArray(slot.days)?slot.days:[slot.day])].filter(Boolean).map(String),start:String(slot.start||slot.startTime||''),end:String(slot.end||slot.endTime||''),room:String(slot.room||'')})).filter(slot=>slot.days.length&&slot.start&&slot.end);
  }
  function overlap(left,right){return left.days.some(day=>right.days.includes(day))&&left.start<right.end&&right.start<left.end;}
  function studentScheduleConflicts(studentId, offeringId, ignoredOfferingIds = []) {
    const records=DB.read('sectionSubjects',[]),target=offeringById(records,offeringId),targetSlots=scheduleSlots(target?.assignment);
    if(!target||!targetSlots.length)return[];
    const ignored=new Set(ignoredOfferingIds),enrollments=DB.read('studentEnrollments',[]).filter(item=>item.studentId===studentId&&!ignored.has(item.offeringId)),conflicts=[];
    for(const enrollment of enrollments){const existing=offeringById(records,enrollment.offeringId);if(!existing||existing.assignment.id===offeringId)continue;for(const proposed of targetSlots)for(const current of scheduleSlots(existing.assignment))if(overlap(proposed,current))conflicts.push({offeringId:existing.assignment.id,subjectCode:existing.assignment.subjectCode,days:proposed.days.filter(day=>current.days.includes(day)),time:`${current.start}-${current.end}`});}
    return conflicts;
  }
  function professorScheduleConflicts(facultyId, offeringId) {
    const records=DB.read('sectionSubjects',[]),target=offeringById(records,offeringId),targetSlots=scheduleSlots(target?.assignment);
    if(!target||!targetSlots.length)return[];
    const conflicts=[];
    for(const section of records)for(const assignment of section.assignments||[]){
      if(assignment.id===offeringId||assignment.facultyId!==facultyId)continue;
      for(const proposed of targetSlots)for(const current of scheduleSlots(assignment))if(overlap(proposed,current))conflicts.push({offeringId:assignment.id,subjectCode:assignment.subjectCode,sectionId:section.sectionId,days:proposed.days.filter(day=>current.days.includes(day)),time:`${current.start}-${current.end}`});
    }
    return conflicts;
  }
  function reviewStudentOverload(input) {
    const request=input?.proposedChange?input:{proposedChange:input||{}},change=request.proposedChange||{},located=offeringById(DB.read('sectionSubjects',[]),change.offeringId);
    const policy=loadPolicyForStudent(change.studentId),calculated=located?proposedStudentLoad(change.studentId,located.assignment.subjectCode):null;
    const proposedUnits=calculated?.proposedUnits??Number(change.proposedUnits),conflicts=studentScheduleConflicts(change.studentId,change.offeringId),problems=[];
    if(!located||located.assignment.subjectCode!==change.subjectCode||located.section.sectionId!==change.sectionId)problems.push('The subject offering changed after submission.');
    if(!activeAccount(change.studentId,'student'))problems.push('The Student is no longer active.');
    if(!(proposedUnits>policy.normalLimit))problems.push('The current load no longer requires overload approval.');
    if(proposedUnits>policy.maximumLimit)problems.push(`The proposed load exceeds the configured maximum of ${policy.maximumLimit} units.`);
    if(conflicts.length)problems.push(`Schedule conflict with ${conflicts.map(item=>`${item.subjectCode||item.offeringId} (${item.days.join('/')} ${item.time})`).join(', ')}.`);
    return{currentUnits:calculated?.currentUnits??change.currentUnits,subjectUnits:calculated?.subjectUnits??change.subjectUnits,proposedUnits,policy,conflicts,problems,canApprove:problems.length===0};
  }
  function requestProfessorAssignment({ offeringId, facultyId, reason, academicPeriod = '' }, actor = null) {
    const sectionSubjects = DB.read('sectionSubjects', []), located = offeringById(sectionSubjects, offeringId);
    if (!located) fail('The selected subject offering does not exist.', 'NOT_FOUND');
    if (!activeOfferingExists(sectionSubjects, offeringId)) fail('The selected subject is not offered in the active academic period and semester.', 'INACTIVE_SEMESTER');
    if (!DB.read('faculty', []).some(person => person.id === facultyId) || !activeAccount(facultyId, 'faculty')) fail('The selected Professor is not active.');
    const conflicts=professorScheduleConflicts(facultyId,offeringId);if(conflicts.length)fail(`The proposed offering conflicts with ${conflicts.map(item=>`${item.subjectCode} in ${item.sectionId} at ${item.days.join('/')} ${item.time}`).join(', ')}.`,'SCHEDULE_CONFLICT');
    return ApprovalService.submit({
      type: 'professor-assignment', targetType: 'subject-offering', targetId: offeringId,
      proposedChange: { offeringId, facultyId, expectedFacultyId: located.assignment.facultyId || '' },
      reason, academicPeriod
    }, actor);
  }
  function applyProfessorAssignment(change, request, actor) {
    const records = DB.read('sectionSubjects', []), located = offeringById(records, change.offeringId);
    if (!located) fail('The subject offering was removed after this request was submitted.', 'STALE_TARGET');
    if (!activeOfferingExists(records, change.offeringId)) fail('The subject offering is no longer active in this academic period and semester.', 'STALE_TARGET');
    if ((located.assignment.facultyId || '') !== (change.expectedFacultyId || '')) fail('The Professor assignment changed after submission. Review the request again.', 'STALE_TARGET');
    if (!DB.read('faculty', []).some(person => person.id === change.facultyId) || !activeAccount(change.facultyId, 'faculty')) fail('The proposed Professor is no longer active.', 'STALE_TARGET');
    const conflicts=professorScheduleConflicts(change.facultyId,change.offeringId);if(conflicts.length)fail(`The proposed Professor now has a schedule conflict with ${conflicts.map(item=>`${item.subjectCode} in ${item.sectionId} at ${item.days.join('/')} ${item.time}`).join(', ')}.`,'SCHEDULE_CONFLICT');
    const previousValue = { facultyId: located.assignment.facultyId || '' };
    located.assignment.facultyId = change.facultyId;
    if (!DB.write('sectionSubjects', records)) fail('The approved Professor assignment could not be saved.', 'SAVE_FAILED');
    if (typeof AuditLog !== 'undefined') AuditLog.record('apply-approved-assignment', 'subject-offering', change.offeringId,
      { requestId: request.id }, actor, { category: 'assignment/enrollment', previousValue, newValue: { facultyId: change.facultyId }, result: 'success', academicPeriod: request.academicPeriod });
  }
  function requestStudentOverload({ studentId, offeringId, proposedUnits, normalLimit, maximumLimit, reason, academicPeriod = '' }, actor = null) {
    const located = offeringById(DB.read('sectionSubjects', []), offeringId);
    if (!located) fail('The selected subject offering does not exist.', 'NOT_FOUND');
    if (!activeOfferingExists(DB.read('sectionSubjects', []), offeringId)) fail('The selected subject is not offered in the active academic period and semester.', 'INACTIVE_SEMESTER');
    if (!DB.read('students', []).some(student => student.id === studentId) || !activeAccount(studentId, 'student')) fail('The selected Student is not active.');
    if (DB.read('studentEnrollments', []).some(item => item.studentId === studentId && (item.offeringId === offeringId || item.subjectCode === located.assignment.subjectCode))) fail('The Student is already enrolled in this subject.');
    const calculated=proposedStudentLoad(studentId,located.assignment.subjectCode),policy=loadPolicyForStudent(studentId),effectiveProposedUnits=calculated?.proposedUnits??Number(proposedUnits);
    const effectiveNormal=Number.isFinite(policy.normalLimit)?policy.normalLimit:Number(normalLimit),effectiveMaximum=Number.isFinite(policy.maximumLimit)?policy.maximumLimit:Number(maximumLimit);
    if (!(effectiveProposedUnits > effectiveNormal)) fail('The proposed load does not exceed the normal limit. No overload approval is required.');
    if (Number.isFinite(effectiveMaximum) && effectiveProposedUnits > effectiveMaximum) fail(`The proposed load exceeds the configured maximum of ${effectiveMaximum} units.`);
    const conflicts=studentScheduleConflicts(studentId,offeringId);if(conflicts.length)fail(`The proposed offering conflicts with ${conflicts.map(item=>`${item.subjectCode||item.offeringId} at ${item.days.join('/')} ${item.time}`).join(', ')}.`,'SCHEDULE_CONFLICT');
    return ApprovalService.submit({
      type: 'student-overload', targetType: 'student-enrollment', targetId: `${studentId}:${offeringId}`,
      proposedChange: { studentId, offeringId, subjectCode: located.assignment.subjectCode, sectionId: located.section.sectionId, currentUnits:calculated?.currentUnits??null,subjectUnits:calculated?.subjectUnits??null,proposedUnits:effectiveProposedUnits,normalLimit:effectiveNormal,maximumLimit:Number.isFinite(effectiveMaximum)?effectiveMaximum:null,program:policy.program,yearLevel:policy.year,term:policy.term },
      reason, academicPeriod
    }, actor);
  }
  function facultyOwnedOffering(records, offeringId, facultyId) {
    const located=offeringById(records,offeringId);
    return located&&located.assignment.facultyId===facultyId&&activeOfferingExists(records,offeringId)?located:null;
  }
  function enrollmentSnapshot(item) {
    return item?{id:item.id||'',studentId:item.studentId,offeringId:item.offeringId||'',subjectCode:item.subjectCode,sectionId:item.sectionId}:null;
  }
  function sameEnrollment(item, snapshot) {
    return Boolean(item&&snapshot&&item.studentId===snapshot.studentId&&(item.id||'')===(snapshot.id||'')&&(item.offeringId||'')===(snapshot.offeringId||'')&&item.subjectCode===snapshot.subjectCode&&item.sectionId===snapshot.sectionId);
  }
  function validateFacultyStudentEnrollment(change, requesterId) {
    const action=String(change.action||''),records=DB.read('sectionSubjects',[]),enrollments=DB.read('studentEnrollments',[]);
    if(!['add','move','remove'].includes(action))fail('Choose add, move, or remove for the enrollment request.');
    if(!activeAccount(change.studentId,'student'))fail('The selected Student is not active.','STALE_TARGET');
    if(!activeAccount(requesterId,'faculty'))fail('The requesting Professor is no longer active.','STALE_TARGET');
    const existing=enrollments.find(item=>item.studentId===change.studentId&&item.subjectCode===change.subjectCode);
    if(action==='add'&&existing)fail('The Student is already enrolled in this subject.','STALE_TARGET');
    if(action!=='add'&&!sameEnrollment(existing,change.expectedEnrollment))fail('The Student enrollment changed after this request was submitted.','STALE_TARGET');
    const source=action==='add'?null:facultyOwnedOffering(records,existing.offeringId,requesterId);
    if(action!=='add'&&!source)fail('The current enrollment is no longer in the Professor\'s approved offering.','STALE_TARGET');
    const target=action==='remove'?null:facultyOwnedOffering(records,change.offeringId,requesterId);
    if(action!=='remove'&&!target)fail('The proposed offering is no longer assigned to this Professor.','STALE_TARGET');
    if(target&&target.assignment.subjectCode!==change.subjectCode)fail('The proposed Subject offering changed.','STALE_TARGET');
    if(action==='move'&&existing.offeringId===change.offeringId)fail('Choose a different Section for the move request.');
    if(target){
      const section=DB.read('sections',[]).find(item=>item.id===target.section.sectionId),occupied=new Set(enrollments.filter(item=>item.sectionId===target.section.sectionId&&item.studentId!==change.studentId).map(item=>item.studentId)).size;
      if(section&&Number(section.capacity)>0&&occupied>=Number(section.capacity))fail('The selected Section is already full.','STALE_TARGET');
      const conflicts=studentScheduleConflicts(change.studentId,change.offeringId,action==='move'?[existing.offeringId]:[]);
      if(conflicts.length)fail(`The proposed offering conflicts with ${conflicts.map(item=>`${item.subjectCode||item.offeringId} at ${item.days.join('/')} ${item.time}`).join(', ')}.`,'SCHEDULE_CONFLICT');
      if(action==='add'){
        const load=proposedStudentLoad(change.studentId,change.subjectCode),policy=loadPolicyForStudent(change.studentId);
        if(!load)fail('The Subject unit value is unavailable.','STALE_TARGET');
        if(load.proposedUnits>policy.normalLimit)fail('This enrollment exceeds the normal load and must use the overload approval workflow.','OVERLOAD_REQUIRED');
      }
    }
    return{action,existing,target};
  }
  function requestFacultyStudentEnrollment({ action, studentId, offeringId = '', subjectCode = '', reason, academicPeriod = '' }, actor = null) {
    const acting=actor||DB.read('currentUser',null),facultyId=acting?.username;
    if(PermissionService.normalizeRole(acting?.role)!=='faculty')fail('Only a Professor may submit this enrollment request.','PERMISSION_DENIED');
    const enrollments=DB.read('studentEnrollments',[]),existing=enrollments.find(item=>item.studentId===studentId&&item.subjectCode===subjectCode);
    const change={action:String(action||''),studentId,offeringId,subjectCode,expectedEnrollment:enrollmentSnapshot(existing)};
    const reviewed=validateFacultyStudentEnrollment(change,facultyId);
    if(reviewed.target)change.sectionId=reviewed.target.section.sectionId;
    return ApprovalService.submit({type:'faculty-student-enrollment',targetType:'student-enrollment',targetId:`${studentId}:${subjectCode}`,proposedChange:change,reason,academicPeriod},acting);
  }
  function applyFacultyStudentEnrollment(change, request, actor) {
    const reviewed=validateFacultyStudentEnrollment(change,request.requesterId),enrollments=DB.read('studentEnrollments',[]),saved=reviewed.existing?enrollments.find(item=>sameEnrollment(item,change.expectedEnrollment)):null,before=enrollmentSnapshot(saved);let after=null;
    if(reviewed.action==='remove')enrollments.splice(enrollments.indexOf(saved),1);
    else if(reviewed.action==='move'){
      saved.offeringId=change.offeringId;saved.sectionId=reviewed.target.section.sectionId;saved.facultyEnrollmentApprovalId=request.id;after=enrollmentSnapshot(saved);
    }else{
      const enrollment={id:`ENR-${change.studentId}-${Date.now()}`,studentId:change.studentId,offeringId:change.offeringId,subjectCode:change.subjectCode,sectionId:reviewed.target.section.sectionId,facultyEnrollmentApprovalId:request.id};
      enrollments.push(enrollment);after=enrollmentSnapshot(enrollment);
    }
    if(!DB.write('studentEnrollments',enrollments))fail('The approved enrollment change could not be saved.','SAVE_FAILED');
    if(typeof AuditLog!=='undefined')AuditLog.record(`apply-approved-faculty-enrollment-${reviewed.action}`,'student-enrollment',after?.id||before?.id||request.targetId,{requestId:request.id,studentId:change.studentId,facultyId:request.requesterId},actor,{category:'assignment/enrollment',previousValue:before,newValue:after,result:'success',academicPeriod:request.academicPeriod});
  }
  function applyStudentOverload(change, request, actor) {
    const located = offeringById(DB.read('sectionSubjects', []), change.offeringId);
    if (!located || located.assignment.subjectCode !== change.subjectCode || located.section.sectionId !== change.sectionId) fail('The subject offering changed after submission. Review the request again.', 'STALE_TARGET');
    if (!activeOfferingExists(DB.read('sectionSubjects', []), change.offeringId)) fail('The subject offering is no longer active in this academic period and semester.', 'STALE_TARGET');
    if (!activeAccount(change.studentId, 'student')) fail('The Student is no longer active.', 'STALE_TARGET');
    const enrollments = DB.read('studentEnrollments', []);
    if (enrollments.some(item => item.studentId === change.studentId && (item.offeringId === change.offeringId || item.subjectCode === change.subjectCode))) fail('The Student has already been enrolled.', 'STALE_TARGET');
    const sections = DB.read('sections', []), section = sections.find(item => item.id === change.sectionId);
    const occupied = new Set(enrollments.filter(item => item.sectionId === change.sectionId).map(item => item.studentId)).size;
    if (section && Number(section.capacity) > 0 && occupied >= Number(section.capacity)) fail('The selected Section is already full.', 'STALE_TARGET');
    const review=reviewStudentOverload(change);if(!review.canApprove)fail(review.problems.join(' '),review.conflicts.length?'SCHEDULE_CONFLICT':'STALE_TARGET');
    const enrollment = { id: `ENR-${change.studentId}-${Date.now()}`, studentId: change.studentId, offeringId: change.offeringId, subjectCode: change.subjectCode, sectionId: change.sectionId, overloadApprovalId: request.id };
    enrollments.push(enrollment);
    if (!DB.write('studentEnrollments', enrollments)) fail('The approved enrollment could not be saved.', 'SAVE_FAILED');
    if (typeof AuditLog !== 'undefined') AuditLog.record('apply-approved-overload', 'student-enrollment', enrollment.id,
      { requestId: request.id, studentId: change.studentId }, actor, { category: 'assignment/enrollment', previousValue: null, newValue: copy(enrollment), result: 'success', academicPeriod: request.academicPeriod });
  }
  function install() {
    ApprovalService.registerApplyHandler('professor-assignment', applyProfessorAssignment);
    ApprovalService.registerApplyHandler('student-overload', applyStudentOverload);
    ApprovalService.registerApplyHandler('faculty-student-enrollment', applyFacultyStudentEnrollment);
    return true;
  }
  return { install, unitRecord, studentLoad, proposedStudentLoad, loadPolicyForStudent, studentScheduleConflicts, professorScheduleConflicts, reviewStudentOverload, requestProfessorAssignment, requestStudentOverload, requestFacultyStudentEnrollment, applyProfessorAssignment, applyStudentOverload, applyFacultyStudentEnrollment };
})();

AcademicWorkflowService.install();
if (typeof window !== 'undefined') window.AcademicWorkflowService = AcademicWorkflowService;

