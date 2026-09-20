'use strict';
const assert = require('assert');
const { permitted, requireCollectionAccess, visibleRecords } = require('../server/access-policy');

const session = role => ({ username: `${role}.demo`, role });
assert.strictEqual(permitted(session('admin'), 'anything', 'PUT'), true);
assert.strictEqual(permitted(session('student'), 'studentSubmissions', 'PUT'), true);
assert.strictEqual(permitted(session('student'), 'users', 'GET'), false);
assert.strictEqual(permitted(session('student'), 'exams', 'PUT'), false);
assert.strictEqual(permitted(session('faculty'), 'questions', 'PUT'), true);
assert.strictEqual(permitted(session('faculty'), 'users', 'PUT'), false);
assert.strictEqual(permitted(session('dean'), 'approvalRequests', 'PUT'), true);
assert.strictEqual(permitted(session('coordinator'), 'studentEnrollments', 'PUT'), true);
assert.throws(() => requireCollectionAccess(session('student'), 'users', 'GET'), error => error.status === 403 && error.code === 'COLLECTION_FORBIDDEN');
assert.deepStrictEqual(visibleRecords(session('student'), { users: [], exams: [], applicationAuditLog: [] }), { exams: [] });
console.log('✅ server collection access policy defaults sensitive and unauthorized actions to denial');
