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

function validateApprovals(existing, next, session) {
  if (!Array.isArray(existing) || !Array.isArray(next)) forbidden('Approval records must be an array.');
  if (session.role === 'admin') forbidden('Administrators configure load policy but do not decide academic applications.');
  const before = new Map(existing.map(item => [item.id, item]));
  const after = new Map(next.map(item => [item.id, item]));
  if (after.size !== next.length || [...before.keys()].some(id => !after.has(id))) forbidden('Approval records cannot be removed or duplicated.');
  const added = next.filter(item => !before.has(item.id));
  const changed = next.filter(item => before.has(item.id) && !same(before.get(item.id), item));
  if (session.role === 'coordinator') {
    if (changed.length) {
      if (added.length || changed.length !== 1) forbidden('Only one owned approval may be withdrawn at a time.');
      const prior = before.get(changed[0].id), item = changed[0];
      if (prior.requesterId !== session.username || prior.status !== 'pending' || item.status !== 'withdrawn') forbidden('Coordinators may only withdraw their own pending requests.');
    }
    added.forEach(item => { if (item.requesterId !== session.username || item.requesterRole !== 'coordinator' || item.status !== 'pending' || !['professor-assignment','student-overload'].includes(item.type)) forbidden('Coordinator submissions must be owned pending requests.'); });
    return;
  }
  if (session.role === 'dean') {
    if (added.length || changed.length !== 1) forbidden('A Dean may decide one existing request at a time.');
    const prior = before.get(changed[0].id), item = changed[0];
    if (!['professor-assignment','student-overload'].includes(prior.type) || prior.status !== 'pending' || !['approved','rejected'].includes(item.status) || item.reviewerId !== session.username) forbidden('Dean decisions are limited to pending academic applications.');
    return;
  }
  forbidden('This role cannot change approval records.');
}

function validateProtectedWrite(store, session, key, next) {
  const existing = store.read(key, []);
  if (key === 'applicationAuditLog') validateAudit(existing, next, session);
  if (key === 'approvalRequests') validateApprovals(existing, next, session);
}
module.exports = { validateProtectedWrite, validateAudit, validateApprovals };
