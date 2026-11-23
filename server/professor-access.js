'use strict';

const { randomUUID } = require('crypto');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message, status, code) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  throw error;
}

function requestsFor(store, professorId) {
  return store.read('professorAccessRequests', [])
    .filter(request => request.professorId === professorId);
}

function latestRequest(store, professorId) {
  return requestsFor(store, professorId).at(-1) || null;
}

function statusFor(store, professorId) {
  return latestRequest(store, professorId)?.status || 'pending';
}

function submit(store, session, input, options = {}) {
  if (!session || session.role !== 'faculty') fail('Only Professors may request Professor access.', 403, 'FORBIDDEN');
  const name = String(input?.name || '').trim();
  const email = String(input?.email || '').trim().toLowerCase();
  if (!name || name.length > 120) fail('Enter a Professor name of 1 to 120 characters.', 400, 'INVALID_NAME');
  if (!EMAIL_RE.test(email) || email.length > 254) fail('Enter a valid email address.', 400, 'INVALID_EMAIL');

  const previous = latestRequest(store, session.username);
  if (previous && previous.status !== 'rejected') {
    fail('A pending or approved access request already exists for this account.', 409, 'DUPLICATE_REQUEST');
  }

  const requestedAt = (options.now || (() => new Date()))().toISOString();
  const request = {
    id: (options.id || randomUUID)(),
    professorId: session.username,
    professorName: name,
    email,
    requestedAt,
    status: 'pending',
    decisionBy: null,
    decisionAt: null,
    decisionReason: ''
  };
  store.write('professorAccessRequests', [...store.read('professorAccessRequests', []), request]);
  return request;
}

function listPending(store) {
  return store.read('professorAccessRequests', []).filter(request => request.status === 'pending');
}

function decide(store, session, requestId, decision, reason = '', options = {}) {
  if (!session || session.role !== 'admin') fail('Only Administrators may decide Professor access requests.', 403, 'FORBIDDEN');
  if (!['approved', 'rejected'].includes(decision)) fail('Decision must be approved or rejected.', 400, 'INVALID_DECISION');
  const requests = store.read('professorAccessRequests', []);
  const index = requests.findIndex(request => request.id === requestId);
  if (index < 0) fail('Professor access request was not found.', 404, 'NOT_FOUND');
  if (requests[index].status !== 'pending') {
    fail('Only pending Professor access requests can be decided.', 409, 'REQUEST_ALREADY_DECIDED');
  }

  const decisionReason = String(reason || '').trim();
  if (decisionReason.length > 1000) fail('The rejection reason must be 1000 characters or fewer.', 400, 'INVALID_REASON');
  const decidedAt = (options.now || (() => new Date()))().toISOString();
  const updated = {
    ...requests[index],
    status: decision,
    decisionBy: session.username,
    decisionAt: decidedAt,
    decisionReason: decision === 'rejected' ? decisionReason : ''
  };
  requests[index] = updated;
  store.write('professorAccessRequests', requests);
  return updated;
}

module.exports = { submit, listPending, decide, statusFor };
