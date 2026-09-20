const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'neu-http-test-'));
const database = path.join(folder, 'test.sqlite');
const port = 3017;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port), SQLITE_PATH: database },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverErrors = '';
server.stderr.on('data', chunk => { serverErrors += chunk; });

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Temporary HTTP server did not start.');
}

(async () => {
  try {
    await waitForServer();
    let response = await fetch(`${origin}/api/storage/users`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: [{ username: 'admin', password: 'admin123', role: 'admin', status: 'active' }] })
    });
    assert.strictEqual(response.status, 401, 'anonymous collection writes must be rejected');
    response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginText = await response.text();
    assert.strictEqual(response.status, 200, loginText);
    const login = JSON.parse(loginText);
    assert.ok(login.token && login.session.role === 'admin', 'HTTP login must return an opaque server session');
    const authorized = { Authorization: `Bearer ${login.token}` };
    response = await fetch(`${origin}/api/auth/session`, { headers: authorized });
    assert.strictEqual(response.status, 200, await response.text());
    const csv = 'id,name,note\r\n1,"Reyes, Maria","line one\nline two"\r\n2,Santos,"said ""hello"""';
    response = await fetch(`${origin}/api/csv/students/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv', ...authorized },
      body: csv
    });
    assert.strictEqual(response.status, 200, await response.text());

    response = await fetch(`${origin}/api/storage/students`, { headers: authorized });
    let body = await response.json();
    assert.deepStrictEqual(body.value, [
      { id: '1', name: 'Reyes, Maria', note: 'line one\nline two' },
      { id: '2', name: 'Santos', note: 'said "hello"' }
    ]);

    response = await fetch(`${origin}/api/csv/students/export`, { headers: authorized });
    const exported = await response.text();
    assert.strictEqual(response.status, 200);
    assert.match(exported, /"Reyes, Maria"/);
    assert.match(exported, /"line one\nline two"/);

    response = await fetch(`${origin}/api/csv/notAllowed/export`);
    assert.strictEqual(response.status, 400, 'CSV collection whitelist must be enforced');

    response = await fetch(`${origin}/api/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authorized },
      body: JSON.stringify({
        records: { students: [{ id: 'stale' }], exams: [{ id: 'e1' }] },
        missingOnly: true
      })
    });
    assert.strictEqual(response.status, 200, await response.text());
    response = await fetch(`${origin}/api/storage`, { headers: authorized });
    body = await response.json();
    assert.strictEqual(body.records.students[0].id, '1', 'browser data must not overwrite SQLite');
    assert.strictEqual(body.records.exams[0].id, 'e1', 'a missing collection should migrate');

    const secondLogin = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    }).then(item => item.json());
    const auditEntry = suffix => ({
      id: `audit_concurrent_${suffix}`, at: new Date().toISOString(), actorId: 'admin', actorRole: 'admin',
      action: 'concurrency-test', entityType: 'storage', entityId: suffix, category: 'system',
      previousValue: null, newValue: null, result: 'success', reason: '', academicPeriod: '', details: {}
    });
    for (const [token, suffix] of [[login.token, 'a'], [secondLogin.token, 'b']]) {
      response = await fetch(`${origin}/api/storage/applicationAuditLog/append`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ entry: auditEntry(suffix) })
      });
      assert.strictEqual(response.status, 200, await response.text());
    }
    response = await fetch(`${origin}/api/storage/applicationAuditLog`, { headers: authorized });
    body = await response.json();
    assert.deepStrictEqual(body.value.map(item => item.id), ['audit_concurrent_a','audit_concurrent_b'], 'concurrent audit appends must preserve both events');

    response = await fetch(`${origin}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '2025-00002', password: 'santos2025' })
    });
    const studentLogin = await response.json();
    assert.strictEqual(response.status, 200, JSON.stringify(studentLogin));
    const studentAuthorized = { Authorization: `Bearer ${studentLogin.token}` };
    response = await fetch(`${origin}/api/storage/users`, { headers: studentAuthorized });
    assert.strictEqual(response.status, 403, 'Student must not read the account collection');
    response = await fetch(`${origin}/api/storage/exams`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...studentAuthorized }, body: JSON.stringify({ value: [] })
    });
    assert.strictEqual(response.status, 403, 'Student must not modify examinations');
    response = await fetch(`${origin}/api/storage/examAttempts`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...studentAuthorized }, body: JSON.stringify({ value: { draft: true } })
    });
    assert.strictEqual(response.status, 200, await response.text());
    response = await fetch(`${origin}/api/csv/students/export`, { headers: studentAuthorized });
    assert.strictEqual(response.status, 403, 'CSV transfer must remain Administrator-only');

    response = await fetch(`${origin}/api/auth/logout`, { method: 'DELETE', headers: authorized });
    assert.strictEqual(response.status, 200, await response.text());
    response = await fetch(`${origin}/api/auth/session`, { headers: authorized });
    assert.strictEqual(response.status, 401, 'logged-out token must be rejected');
    assert.strictEqual(serverErrors, '', `Server wrote errors:\n${serverErrors}`);
    console.log('✅ HTTP SQLite source-of-truth and CSV import/export pass');
  } finally {
    server.kill();
    setTimeout(() => fs.rmSync(folder, { recursive: true, force: true }), 250);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
