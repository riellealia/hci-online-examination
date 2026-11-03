'use strict';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function forbidden(message) { const error = new Error(message); error.status = 403; error.code = 'PROTECTED_WRITE_FORBIDDEN'; throw error; }

function validateAudit(existing, next, session) {
  if (!Array.isArray(existing) || !Array.isArray(next) || next.length < existing.length) forbidden('Audit history is append-only.');
  if (!same(next.slice(0, existing.length), existing)) forbidden('Existing audit records cannot be changed or removed.');
  next.slice(existing.length).forEach(entry => {
    if (!entry || entry.actorId !== session.username || entry.actorRole !== session.role) forbidden('Audit actors must match the authenticated session.');
  });
}

const APPROVAL_MUTABLE_FIELDS = new Set(['status', 'reviewerId', 'reviewerRole', 'reviewerRemarks', 'decisionAt', 'history']);
function sameApprovalPayload(prior, item) {
  const before = Object.fromEntries(Object.entries(prior).filter(([key]) => !APPROVAL_MUTABLE_FIELDS.has(key)));
  const after = Object.fromEntries(Object.entries(item).filter(([key]) => !APPROVAL_MUTABLE_FIELDS.has(key)));
  return same(before, after);
}
function validHistoryTransition(prior, item, session, status) {
  const before = Array.isArray(prior.history) ? prior.history : [];
  const after = Array.isArray(item.history) ? item.history : [];
  const event = after.at(-1);
  return after.length === before.length + 1 && same(after.slice(0, before.length), before)
    && event?.status === status && event?.actorId === session.username && event?.actorRole === session.role;
}
function validNewRequest(item, session) {
  const history = Array.isArray(item.history) ? item.history : [];
  const submitRole = item.type === 'faculty-student-enrollment' ? 'faculty' : item.type === 'student-overload' && session.role === 'admin' ? 'admin' : 'coordinator';
  return item?.id && ['professor-assignment', 'student-overload', 'faculty-student-enrollment'].includes(item.type)
    && item.requesterId === session.username && item.requesterRole === submitRole && session.role === submitRole
    && item.status === 'pending' && item.targetType && item.targetId && item.reason
    && item.proposedChange && typeof item.proposedChange === 'object' && !Array.isArray(item.proposedChange)
    && item.submittedAt && item.reviewerRole === 'dean' && history.length === 1
    && history[0]?.status === 'pending' && history[0]?.actorId === session.username && history[0]?.actorRole === submitRole;
}

function validateApprovals(existing, next, session) {
  if (!Array.isArray(existing) || !Array.isArray(next)) forbidden('Approval records must be an array.');
  const before = new Map(existing.map(item => [item.id, item]));
  const after = new Map(next.map(item => [item.id, item]));
  if (after.size !== next.length || [...before.keys()].some(id => !after.has(id))) forbidden('Approval records cannot be removed or duplicated.');
  const added = next.filter(item => !before.has(item.id));
  const changed = next.filter(item => before.has(item.id) && !same(before.get(item.id), item));
  if (['coordinator', 'faculty'].includes(session.role)) {
    if (changed.length) {
      if (added.length || changed.length !== 1) forbidden('Only one owned approval may be withdrawn at a time.');
      const prior = before.get(changed[0].id), item = changed[0];
      if (prior.requesterId !== session.username || prior.status !== 'pending' || item.status !== 'withdrawn'
        || !sameApprovalPayload(prior, item) || !validHistoryTransition(prior, item, session, 'withdrawn')) forbidden('Requesters may only withdraw their own pending requests without changing the proposal.');
    }
    added.forEach(item => { if (!validNewRequest(item, session)) forbidden('Submissions must be complete owned pending requests for this role.'); });
    return;
  }
  if (session.role === 'dean') {
    if (added.length || changed.length !== 1) forbidden('A Dean may decide one existing request at a time.');
    const prior = before.get(changed[0].id), item = changed[0];
    if (!['professor-assignment','student-overload','faculty-student-enrollment'].includes(prior.type) || prior.status !== 'pending' || !['approved','rejected'].includes(item.status)
      || item.reviewerId !== session.username || item.reviewerRole !== 'dean' || !item.decisionAt
      || item.status === 'rejected' && !String(item.reviewerRemarks || '').trim()
      || !sameApprovalPayload(prior, item) || !validHistoryTransition(prior, item, session, item.status)) forbidden('Dean decisions are limited to pending academic applications and cannot alter the proposal.');
    return;
  }
  if (session.role === 'admin') {
    if (added.length) {
      if (changed.length || added.length !== 1 || added[0].type !== 'student-overload' || !validNewRequest(added[0], session)) forbidden('Administrators may only submit complete Student-overload requests for Dean review.');
      return;
    }
    if (added.length || changed.length !== 1) forbidden('An Administrator may cancel one existing request at a time.');
    const prior = before.get(changed[0].id), item = changed[0];
    if (prior.status !== 'pending' || item.status !== 'cancelled' || !sameApprovalPayload(prior, item)
      || !validHistoryTransition(prior, item, session, 'cancelled')) forbidden('Administrators may cancel pending applications but cannot decide or alter them.');
    return;
  }
  forbidden('This role cannot change approval records.');
}

function enrollmentIdentity(item) { return item?.id || `${item?.studentId}|${item?.subjectCode}|${item?.sectionId}`; }
function enrollmentSnapshot(item) { return item ? { id:item.id||'', studentId:item.studentId, offeringId:item.offeringId||'', subjectCode:item.subjectCode, sectionId:item.sectionId } : null; }
function sameEnrollmentSnapshot(item, snapshot) { return same(enrollmentSnapshot(item), snapshot); }
function validateDeanEnrollment(existing, next, session, store) {
  if (!Array.isArray(existing) || !Array.isArray(next)) forbidden('Enrollment records must be an array.');
  const before=new Map(existing.map(item=>[enrollmentIdentity(item),item])),after=new Map(next.map(item=>[enrollmentIdentity(item),item]));
  const removed=existing.filter(item=>!after.has(enrollmentIdentity(item))),added=next.filter(item=>!before.has(enrollmentIdentity(item))),changed=next.filter(item=>before.has(enrollmentIdentity(item))&&!same(before.get(enrollmentIdentity(item)),item));
  const pending=(store.read('approvalRequests',[])||[]).filter(item=>item.status==='pending'&&item.reviewerRole==='dean');
  const authorized=pending.some(request=>{
    const change=request.proposedChange||{};
    if(request.type==='student-overload')return removed.length===0&&changed.length===0&&added.length===1&&added[0].studentId===change.studentId&&added[0].offeringId===change.offeringId&&added[0].overloadApprovalId===request.id;
    if(request.type!=='faculty-student-enrollment')return false;
    if(change.action==='add')return removed.length===0&&changed.length===0&&added.length===1&&added[0].studentId===change.studentId&&added[0].offeringId===change.offeringId&&added[0].facultyEnrollmentApprovalId===request.id;
    if(change.action==='remove')return added.length===0&&changed.length===0&&removed.length===1&&sameEnrollmentSnapshot(removed[0],change.expectedEnrollment);
    return added.length===0&&removed.length===0&&changed.length===1&&sameEnrollmentSnapshot(before.get(enrollmentIdentity(changed[0])),change.expectedEnrollment)&&changed[0].offeringId===change.offeringId&&changed[0].facultyEnrollmentApprovalId===request.id;
  });
  if(!authorized)forbidden('Dean enrollment changes must exactly match one pending approved workflow proposal.');
}

function validateProtectedWrite(store, session, key, next) {
  const existing = store.read(key, []);
  if (key === 'applicationAuditLog') validateAudit(existing, next, session);
  if (key === 'approvalRequests') validateApprovals(existing, next, session);
  if (key === 'studentEnrollments' && session.role === 'faculty') forbidden('Faculty enrollment changes must be submitted for Dean approval.');
  if (key === 'studentEnrollments' && session.role === 'dean') validateDeanEnrollment(existing, next, session, store);
  if (key === 'academicPeriods') forbidden('Academic periods must be changed through the protected academic-period workflow.');
}
module.exports = { validateProtectedWrite, validateAudit, validateApprovals };
