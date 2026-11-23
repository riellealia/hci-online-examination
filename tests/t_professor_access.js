'use strict';
const assert = require('assert');
const ProfessorAccess = require('../server/professor-access');

const records = { professorAccessRequests: [] };
const store = {
  read(key, fallback) { return records[key] ?? fallback; },
  write(key, value) { records[key] = value; return true; }
};
const professor = { username: 'prof.001', role: 'faculty' };
const admin = { username: 'admin.001', role: 'admin' };
const otherRole = { username: 'student.001', role: 'student' };
const now = () => new Date('2026-10-14T08:00:00.000Z');
let requestNumber = 0;
const options = { now, id: () => `PAR-${++requestNumber}` };

assert.strictEqual(ProfessorAccess.statusFor(store, professor.username), 'pending', 'accounts without an approved request default to no access');
const pending = ProfessorAccess.submit(store, professor, { name: 'Professor One', email: 'prof.one@example.edu' }, options);
assert.deepStrictEqual(ProfessorAccess.listPending(store), [pending]);
assert.throws(
  () => ProfessorAccess.submit(store, professor, { name: 'Professor One', email: 'prof.one@example.edu' }, options),
  error => error.status === 409 && error.code === 'DUPLICATE_REQUEST'
);
assert.throws(
  () => ProfessorAccess.decide(store, professor, pending.id, 'approved'),
  error => error.status === 403 && error.code === 'FORBIDDEN'
);

const approved = ProfessorAccess.decide(store, admin, pending.id, 'approved', '', options);
assert.strictEqual(approved.decisionBy, admin.username);
assert.strictEqual(approved.decisionAt, '2026-10-14T08:00:00.000Z');
assert.strictEqual(ProfessorAccess.statusFor(store, professor.username), 'approved');
assert.deepStrictEqual(ProfessorAccess.listPending(store), []);
assert.throws(
  () => ProfessorAccess.decide(store, admin, pending.id, 'approved', '', options),
  error => error.status === 409 && error.code === 'REQUEST_ALREADY_DECIDED'
);

const secondProfessor = { username: 'prof.002', role: 'faculty' };
const rejectedRequest = ProfessorAccess.submit(store, secondProfessor, { name: 'Professor Two', email: 'prof.two@example.edu' }, options);
const rejected = ProfessorAccess.decide(store, admin, rejectedRequest.id, 'rejected', '', options);
assert.strictEqual(rejected.decisionReason, '', 'rejection reason is optional');
assert.strictEqual(ProfessorAccess.statusFor(store, secondProfessor.username), 'rejected');
assert.throws(
  () => ProfessorAccess.decide(store, admin, rejectedRequest.id, 'approved', '', options),
  error => error.status === 409 && error.code === 'REQUEST_ALREADY_DECIDED'
);
assert.throws(
  () => ProfessorAccess.submit(store, otherRole, { name: 'Student', email: 'student@example.edu' }, options),
  error => error.status === 403 && error.code === 'FORBIDDEN'
);
assert.throws(
  () => ProfessorAccess.submit(store, professor, { name: '', email: 'invalid' }, options),
  error => error.status === 400
);

console.log('✅ Professor access request transitions, audit data, duplicate handling, and optional rejection reason pass');
