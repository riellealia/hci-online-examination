const assert = require('assert');
const { createAuth, SESSION_TTL_MS } = require('../server/auth');

let time = 1_000_000;
const records = { users: [
  { username: 'admin', password: 'admin123', role: 'administrator', status: 'active' },
  { username: 'coord.001', password: 'coord001', role: 'Faculty Coordinator', status: 'active' },
  { username: 'archived', password: 'secret123', role: 'student', status: 'archived' }
] };
const store = { read(key, fallback) { return records[key] || fallback; } };
const auth = createAuth(store, { now: () => time });

assert.throws(() => auth.login('admin', 'wrong', '127.0.0.1'), error => error.status === 401 && error.code === 'INVALID_CREDENTIALS');
const admin = auth.login('admin', 'admin123', '127.0.0.1');
assert.strictEqual(admin.session.role, 'admin');
assert.ok(admin.token.length >= 40 && !admin.token.includes('admin'));
assert.strictEqual(auth.resolve(admin.token).username, 'admin');
assert.throws(() => auth.login('archived', 'secret123', '127.0.0.1'), error => error.status === 401);

const coordinator = auth.login('coord.001', 'coord001', '127.0.0.1');
assert.strictEqual(coordinator.session.role, 'coordinator');
records.users.find(user => user.username === 'coord.001').disabled = true;
assert.strictEqual(auth.resolve(coordinator.token), null, 'disabling an account invalidates its existing server session');

const request = token => ({ headers: { authorization: token ? `Bearer ${token}` : '' } });
assert.strictEqual(auth.requireSession(request(admin.token), ['admin']).username, 'admin');
assert.throws(() => auth.requireSession(request(admin.token), ['dean']), error => error.status === 403);
auth.logout(admin.token);
assert.throws(() => auth.requireSession(request(admin.token)), error => error.status === 401);

const expiring = auth.login('admin', 'admin123', '127.0.0.1');
time += SESSION_TTL_MS + 1;
assert.strictEqual(auth.resolve(expiring.token), null, 'expired server sessions are rejected');

for (let attempt = 0; attempt < 5; attempt++) assert.throws(() => auth.login('missing', 'bad', '10.0.0.1'), /active account/);
assert.throws(() => auth.login('missing', 'bad', '10.0.0.1'), error => error.status === 429 && error.code === 'RATE_LIMITED');
console.log('✅ SQLite credential validation, opaque sessions, expiry, revocation, account state, roles, and rate limiting pass');
