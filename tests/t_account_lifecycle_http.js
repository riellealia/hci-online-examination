'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'neu-lifecycle-http-'));
const port = 3038, origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port), SQLITE_PATH: path.join(folder, 'lifecycle.sqlite') },
  stdio: ['ignore', 'pipe', 'pipe']
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });
async function request(route, token, method = 'GET', payload) {
  const response = await fetch(origin + route, {
    method, headers: { Authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'Content-Type':'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  return { status: response.status, body: await response.json() };
}
async function login(username, password) {
  const response = await fetch(origin + '/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password}) });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}
(async () => {
  try {
    let healthy = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { healthy = (await fetch(origin + '/api/health')).ok; } catch (_) {}
      if (healthy) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(healthy, 'server must start');
    const admin = await login('admin', 'admin123'), dean = await login('dean.demo', 'dean123');

    let result = await request('/api/accounts/2025-00002/archive', dean, 'POST', { reason:'Should be blocked' });
    assert.equal(result.status, 403, 'only an Administrator can change account status');

    result = await request('/api/accounts/2025-00002/archive', admin, 'POST', {});
    assert.equal(result.status, 400, 'archive requires a reason');

    result = await request('/api/accounts/2025-00002/deactivate', admin, 'POST', {});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.account.lifecycleStatus, 'Deactivated');
    assert.equal(result.body.account.disabled, true);
    assert.equal(result.body.account.password, undefined, 'password must never be returned');
    assert.equal(result.body.account.lifecycleHistory.length, 1);

    result = await request('/api/accounts/2025-00002/deactivate', admin, 'POST', {});
    assert.equal(result.status, 409, 'cannot deactivate an already-deactivated account');

    result = await request('/api/accounts/23-32534-345/graduate', admin, 'POST', { reason:'Not a student' });
    assert.equal(result.status, 400, 'graduate is student-only');

    result = await request('/api/accounts/2025-00002/archive', admin, 'POST', { reason:'Long-term leave of absence' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.account.lifecycleStatus, 'Archived');
    assert.equal(result.body.account.lifecycleHistory.length, 2);

    result = await request('/api/accounts/2025-00002/reactivate', admin, 'POST', {});
    assert.equal(result.status, 409, 'an archived account cannot be reactivated directly');

    result = await request('/api/accounts/2025-00002/restore', admin, 'POST', {});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.account.lifecycleStatus, 'Active');
    assert.equal(result.body.account.disabled, false);

    result = await request('/api/accounts/2025-00002/graduate', admin, 'POST', { reason:'Completed the program' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.account.lifecycleStatus, 'Graduated');

    result = await request('/api/accounts/2025-00002/does-not-exist', admin, 'POST', {});
    assert.equal(result.status, 404);

    result = await request('/api/storage/applicationAuditLog', admin);
    const entries = result.body.value.filter(entry => entry.entityId === '2025-00002' && entry.category === 'account/lifecycle');
    assert.equal(entries.length, 4, 'each transition writes one account/lifecycle audit entry');
    assert.ok(entries.every(entry => entry.actorId === 'admin' && entry.actorRole === 'admin'));

    assert.equal(errors, '', errors);
    console.log('✅ account-lifecycle HTTP routes enforce transitions, reasons, and role checks');
  } finally {
    server.kill();
    setTimeout(() => fs.rmSync(folder, { recursive:true, force:true }), 250);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
