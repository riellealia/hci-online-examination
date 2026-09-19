const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseCsv, stringifyCsv } = require('../server/csv');
const { openDatabase } = require('../server/database');

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'neu-sqlite-test-'));
const filename = path.join(folder, 'test.sqlite');
const db = openDatabase(filename);
try {
  const records = [{id:'1',name:'Reyes, Maria',note:'Line one\nLine two',quote:'She said "hello"'},{id:'2',name:'Santos',note:'',quote:''}];
  const csv = stringifyCsv(records);
  assert.deepStrictEqual(parseCsv(csv), records, 'CSV must round-trip commas, newlines, quotes, and BOM');
  assert.throws(() => parseCsv('id,name\n1,"broken'), /unclosed quoted field/);
  assert.throws(() => parseCsv('id,id\n1,2'), /unique/);

  db.write('students', records);
  assert.deepStrictEqual(db.read('students', []), records, 'SQLite collection round-trip failed');
  db.migrate({students:[{id:'browser-stale'}],newCollection:[{id:'imported'}]},{missingOnly:true});
  assert.deepStrictEqual(db.read('students', []), records, 'missing-only migration must not overwrite authoritative SQLite data');
  assert.strictEqual(db.read('newCollection', [])[0].id, 'imported', 'missing browser collection should migrate into SQLite');
  db.migrate({subjects:[{code:'CCS101'}],sections:[{id:'1BSCS-1'}]});
  assert.strictEqual(db.all().subjects[0].code, 'CCS101');
  db.delete('sections');
  assert.strictEqual(db.read('sections', null), null);
  db.recordImport('students', records.length);
  console.log('✅ SQLite persistence, migration, deletion, and robust CSV round-trip pass');
} finally {
  db.close();
  fs.rmSync(folder, {recursive:true,force:true});
}
