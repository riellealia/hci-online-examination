'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'neu-period-http-'));
const port = 3037, origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, PORT: String(port), SQLITE_PATH: path.join(folder, 'periods.sqlite') },
  stdio: ['ignore', 'pipe', 'pipe']
});
let errors = '';
server.stderr.on('data', chunk => { errors += chunk; });
async function request(route, token, method = 'GET', payload) {
  const response = await fetch(origin + route, {
    method, headers: { Authorization: `Bearer ${token}`, ...(payload === undefined ? {} : { 'Content-Type':'application/json' }) },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  return { status:response.status, body:await response.json() };
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
    let result = await request('/api/academic-periods', admin);
    assert.equal(result.status, 200);
    const initial = result.body.periods[0];
    assert.equal(initial.status, 'active');
    result = await request('/api/academic-periods', dean, 'POST', { schoolYear:'2027-2028', term:'First Semester', startDate:'2027-08-01', endDate:'2027-12-20' });
    assert.equal(result.status, 403, 'Dean cannot create periods');
    result = await request('/api/storage/academicPeriods', admin, 'PUT', {value:[]});
    assert.equal(result.status, 403, 'generic storage cannot bypass period workflow');
    result = await request('/api/migrate', admin, 'POST', {records:{academicPeriods:[]}});
    assert.equal(result.status, 403, 'migration cannot bypass period workflow');
    result = await request('/api/storage/systemSettings', admin);
    assert.equal(result.status, 200);
    result = await request('/api/storage/systemSettings', admin, 'PUT', {value:{...result.body.value,semester:'Second Semester'}});
    assert.equal(result.status, 409, 'semester cannot change outside rollover workflow');

    result = await request('/api/storage/studentEnrollments', admin, 'PUT', {value:[{id:'ENR-1',studentId:'S1',offeringId:'OFR-1'}]});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    assert.equal(result.body.value[0].academicPeriodId, initial.id);
    result = await request(`/api/academic-periods/${initial.id}/records/studentEnrollments`, admin);
    assert.equal(result.status, 200);
    assert.equal(result.body.records.length, 1);
    result = await request('/api/academic-periods/current/records/studentEnrollments', dean);
    assert.equal(result.status, 200, 'Dean can read period-scoped records');
    result = await request('/api/academic-periods/current/records/approvalRequests', dean);
    assert.equal(result.status, 200);
    result = await request('/api/academic-periods/current/records/approvalRequests', await login('2025-00002', 'santos2025'));
    assert.equal(result.status, 403, 'period read must still apply collection permissions');

    result = await request('/api/academic-periods', admin, 'POST', { schoolYear:'2027-2028', term:'First Semester', startDate:'2027-08-01', endDate:'2027-12-20' });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    const next = result.body.period;
    result = await request(`/api/academic-periods/${initial.id}/impact`, admin);
    assert.equal(result.body.counts.studentEnrollments, 1);
    result = await request(`/api/academic-periods/${initial.id}/close`, admin, 'POST', {reason:'End of term'});
    assert.equal(result.status, 200, JSON.stringify(result.body));
    result = await request('/api/storage/studentEnrollments', admin, 'PUT', {value:[]});
    assert.equal(result.status, 409, 'closed enrollment cannot be removed');
    result = await request('/api/migrate', admin, 'POST', {records:{studentEnrollments:[]},missingOnly:false});
    assert.equal(result.status, 409, 'migration cannot remove closed enrollments');
    let csvResponse = await fetch(origin + '/api/csv/studentEnrollments/import', {
      method:'POST', headers:{Authorization:`Bearer ${admin}`,'Content-Type':'text/csv'}, body:'id,studentId,offeringId\nENR-NEW,S2,OFR-2'
    });
    assert.equal(csvResponse.status, 409, 'CSV import cannot replace historical enrollments');
    result = await request('/api/storage/systemSettings', admin, 'DELETE');
    assert.equal(result.status, 403, 'current-period settings cannot be deleted');
    result = await request('/api/storage/academicPeriods', admin, 'DELETE');
    assert.equal(result.status, 403, 'period history cannot be deleted');
    result = await request('/api/storage/studentEnrollments', admin, 'PUT', {value:[{id:'ENR-LATE',studentId:'S2'}]});
    assert.equal(result.status, 409, 'closed period cannot accept new enrollments');
    result = await request(`/api/academic-periods/${next.id}/activate`, admin, 'POST', {reason:'New term'});
    assert.equal(result.status, 200);
    result = await request('/api/academic-periods/current/records/studentEnrollments', admin);
    assert.equal(result.body.records.length, 0, 'old enrollment must not appear in new period');
    result = await request(`/api/academic-periods/${initial.id}/records/studentEnrollments`, admin);
    assert.equal(result.body.records.length, 1, 'historical enrollment remains readable');
    assert.equal(errors, '', errors);
    console.log('✅ academic-period HTTP routes, write guards, and history access pass');
  } finally {
    server.kill();
    setTimeout(() => fs.rmSync(folder, { recursive:true, force:true }), 250);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
