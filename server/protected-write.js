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
  return item?.id && ['professor-assignment', 'student-overload'].includes(item.type)
    && item.requesterId === session.username && item.requesterRole === 'coordinator'
    && item.status === 'pending' && item.targetType && item.targetId && item.reason
    && item.proposedChange && typeof item.proposedChange === 'object' && !Array.isArray(item.proposedChange)
    && item.submittedAt && item.reviewerRole === 'dean' && history.length === 1
    && history[0]?.status === 'pending' && history[0]?.actorId === session.username && history[0]?.actorRole === 'coordinator';
}

function validateApprovals(existing, next, session) {
  if (!Array.isArray(existing) || !Array.isArray(next)) forbidden('Approval records must be an array.');
  const before = new Map(existing.map(item => [item.id, item]));
  const after = new Map(next.map(item => [item.id, item]));
  if (after.size !== next.length || [...before.keys()].some(id => !after.has(id))) forbidden('Approval records cannot be removed or duplicated.');
  const added = next.filter(item => !before.has(item.id));
  const changed = next.filter(item => before.has(item.id) && !same(before.get(item.id), item));
  if (session.role === 'coordinator') {
    if (changed.length) {
      if (added.length || changed.length !== 1) forbidden('Only one owned approval may be withdrawn at a time.');
      const prior = before.get(changed[0].id), item = changed[0];
      if (prior.requesterId !== session.username || prior.status !== 'pending' || item.status !== 'withdrawn'
        || !sameApprovalPayload(prior, item) || !validHistoryTransition(prior, item, session, 'withdrawn')) forbidden('Coordinators may only withdraw their own pending requests without changing the proposal.');
    }
    added.forEach(item => { if (!validNewRequest(item, session)) forbidden('Coordinator submissions must be complete owned pending requests.'); });
    return;
  }
  if (session.role === 'dean') {
    if (added.length || changed.length !== 1) forbidden('A Dean may decide one existing request at a time.');
    const prior = before.get(changed[0].id), item = changed[0];
    if (!['professor-assignment','student-overload'].includes(prior.type) || prior.status !== 'pending' || !['approved','rejected'].includes(item.status)
      || item.reviewerId !== session.username || item.reviewerRole !== 'dean' || !item.decisionAt
      || item.status === 'rejected' && !String(item.reviewerRemarks || '').trim()
      || !sameApprovalPayload(prior, item) || !validHistoryTransition(prior, item, session, item.status)) forbidden('Dean decisions are limited to pending academic applications and cannot alter the proposal.');
    return;
  }
  if (session.role === 'admin') {
    if (added.length || changed.length !== 1) forbidden('An Administrator may cancel one existing request at a time.');
    const prior = before.get(changed[0].id), item = changed[0];
    if (prior.status !== 'pending' || item.status !== 'cancelled' || !sameApprovalPayload(prior, item)
      || !validHistoryTransition(prior, item, session, 'cancelled')) forbidden('Administrators may cancel pending applications but cannot decide or alter them.');
    return;
  }
  forbidden('This role cannot change approval records.');
}

function validateProtectedWrite(store, session, key, next) {
  const existing = store.read(key, []);
  if (key === 'applicationAuditLog') validateAudit(existing, next, session);
  if (key === 'approvalRequests') validateApprovals(existing, next, session);
  if (key === 'academicPeriods') forbidden('Academic periods must be changed through the protected academic-period workflow.');
}
module.exports = { validateProtectedWrite, validateAudit, validateApprovals };
