'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const writes = [];
const storage = new Map();
const context = vm.createContext({
  console,
  DB: {
    backend: () => 'sqlite',
    read: (key, fallback) => key === 'students' ? [{ id: '2025-00002' }] : fallback,
    write: (key) => { writes.push(key); return true; }
  },
  localStorage: {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value))
  }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'demo-data.js'), 'utf8') + '\nDemoData.install();', context);
assert.deepStrictEqual(writes, [], 'hydrated SQLite pages must not reseed collections');
assert.strictEqual(storage.get('demoCurriculumVersion'), '24');

const roleWrites = [];
const roleContext = vm.createContext({
  console,
  DB: {
    backend: () => 'sqlite',
    read: (key, fallback) => key === 'currentUser' ? { username: 'coord.004', role: 'coordinator' } : fallback,
    write: key => { roleWrites.push(key); return true; }
  },
  localStorage: { getItem: () => null, setItem: () => {} }
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'demo-data.js'), 'utf8') + '\nDemoData.install();', roleContext);
assert.deepStrictEqual(roleWrites, [], 'non-Admin SQLite pages must never run the full demo installer');
const storageSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');
assert.match(storageSource, /resetSqliteLoginEntry\(\)/, 'the SQLite login entry must reset stale browser authentication state');
assert.match(storageSource, /removeItem\('serverSessionToken'\)[\s\S]*removeItem\('currentUser'\)/, 'the reset must clear the stale token and identity before login');
console.log('✅ hydrated SQLite role pages do not attempt demo-data rewrites');
