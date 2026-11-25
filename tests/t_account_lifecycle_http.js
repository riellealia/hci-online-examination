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
  // Never let a test server reach the real Supabase from .env.
  env: { ...process.env, PORT: String(port), SQLITE_PATH: path.join(folder, 'lifecycle.sqlite'), SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
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

    let result = await request('/api/accounts/2025-00002/deactivate', dean, 'POST', {});
    assert.equal(result.status, 403, 'the Dean cannot deactivate accounts');
    result = await request('/api/accounts/coordinator.demo/archive', dean, 'POST', { reason:'Should be blocked' });
    assert.equal(result.status, 403, 'the Dean can archive only Student and Professor accounts');

    // Seed a tiny roster: one Professor teaching O1, two Students enrolled in it.
    for (const [key, value] of Object.entries({
      students: [{ id:'2025-00002', first:'Bianca', last:'Santos', sections:['S1'] }, { id:'2025-00003', first:'Ana', last:'Cruz', sections:['S1'] }],
      faculty: [{ id:'23-32534-345', first:'Maria', last:'Reyes' }],
      sectionSubjects: [{ sectionId:'S1', assignments:[{ id:'O1', subjectCode:'CS1', facultyId:'23-32534-345' }] }],
      subjectAssignments: [{ subjectCode:'CS1', facultyIds:['23-32534-345'] }],
      studentEnrollments: [{ id:'E1', studentId:'2025-00002', offeringId:'O1', subjectCode:'CS1', sectionId:'S1' }, { id:'E2', studentId:'2025-00003', offeringId:'O1', subjectCode:'CS1', sectionId:'S1' }]
    })) assert.equal((await request(`/api/storage/${key}`, admin, 'PUT', { value })).status, 200, key);
    const read = async key => (await request(`/api/storage/${key}`, admin)).body.value || [];

    // The Dean archives a Professor: gone from the lists, classes unassigned, kept in the archive.
    result = await request('/api/accounts/23-32534-345/archive', dean, 'POST', { reason:'On sabbatical' });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok(!(await read('faculty')).some(p => p.id === '23-32534-345'), 'archived Professor leaves the faculty list');
    assert.equal((await read('sectionSubjects'))[0].assignments[0].facultyId, '', 'their classes become unassigned');
    assert.deepEqual((await read('subjectAssignments'))[0].facultyIds, []);
    let archive = await read('archivedPeople');
    assert.equal(archive.length, 1); assert.equal(archive[0].kind, 'faculty'); assert.equal(archive[0].archivedBy, 'dean.demo'); assert.equal(archive[0].offerings[0].offeringId, 'O1');
    // A stale copy of the faculty list cannot bring them back.
    await request('/api/storage/faculty', admin, 'PUT', { value: [{ id:'23-32534-345', first:'Maria', last:'Reyes' }] });
    assert.equal((await read('faculty')).length, 0, 'archived people are dropped from saved lists');
    result = await request('/api/accounts/23-32534-345/restore', dean, 'POST', {});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.ok((await read('faculty')).some(p => p.id === '23-32534-345'), 'restore puts the Professor back');
    assert.equal((await read('sectionSubjects'))[0].assignments[0].facultyId, '23-32534-345', 'and gives back classes nobody took');
    assert.equal((await read('archivedPeople')).length, 0);

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
    assert.deepEqual((await read('students')).map(s => s.id), ['2025-00003'], 'an Administrator archive removes the Student from the lists too');
    assert.deepEqual((await read('studentEnrollments')).map(e => e.id), ['E2'], 'with their enrollments');
    archive = await read('archivedPeople');
    assert.equal(archive[0].kind, 'student'); assert.equal(archive[0].enrollments[0].id, 'E1'); assert.equal(archive[0].reason, 'Long-term leave of absence');

    result = await request('/api/accounts/2025-00002/reactivate', admin, 'POST', {});
    assert.equal(result.status, 409, 'an archived account cannot be reactivated directly');

    result = await request('/api/accounts/2025-00002/restore', admin, 'POST', {});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.account.lifecycleStatus, 'Active');
    assert.equal(result.body.account.disabled, false);
    assert.ok((await read('students')).some(s => s.id === '2025-00002'), 'restore returns the Student to the lists');
    assert.ok((await read('studentEnrollments')).some(e => e.id === 'E1'), 'with their enrollments');

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
