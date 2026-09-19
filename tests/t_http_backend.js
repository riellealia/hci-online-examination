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
    const csv = 'id,name,note\r\n1,"Reyes, Maria","line one\nline two"\r\n2,Santos,"said ""hello"""';
    let response = await fetch(`${origin}/api/csv/students/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: csv
    });
    assert.strictEqual(response.status, 200, await response.text());

    response = await fetch(`${origin}/api/storage/students`);
    let body = await response.json();
    assert.deepStrictEqual(body.value, [
      { id: '1', name: 'Reyes, Maria', note: 'line one\nline two' },
      { id: '2', name: 'Santos', note: 'said "hello"' }
    ]);

    response = await fetch(`${origin}/api/csv/students/export`);
    const exported = await response.text();
    assert.strictEqual(response.status, 200);
    assert.match(exported, /"Reyes, Maria"/);
    assert.match(exported, /"line one\nline two"/);

    response = await fetch(`${origin}/api/csv/notAllowed/export`);
    assert.strictEqual(response.status, 400, 'CSV collection whitelist must be enforced');

    response = await fetch(`${origin}/api/migrate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: { students: [{ id: 'stale' }], exams: [{ id: 'e1' }] },
        missingOnly: true
      })
    });
    assert.strictEqual(response.status, 200, await response.text());
    response = await fetch(`${origin}/api/storage`);
    body = await response.json();
    assert.strictEqual(body.records.students[0].id, '1', 'browser data must not overwrite SQLite');
    assert.strictEqual(body.records.exams[0].id, 'e1', 'a missing collection should migrate');
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
