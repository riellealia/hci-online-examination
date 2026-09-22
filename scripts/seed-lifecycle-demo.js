'use strict';

const path = require('path');
const fs = require('fs');
const { openDatabase } = require('../server/database');
const { prepare } = require('../server/lifecycle-demo');

const filename = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'neu-examination.sqlite');
const store = openDatabase(filename);
try {
  const result = prepare(store);
  if (result.alreadyApplied) {
    console.log(`Lifecycle demo already present: ${result.total} total accounts. Nothing changed.`);
  } else if (process.argv.includes('--apply')) {
    const backupFile = path.join(path.dirname(filename), `neu-examination.pre-lifecycle-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`);
    if (fs.existsSync(backupFile)) throw new Error('Backup target already exists; no records changed.');
    store.raw.exec(`VACUUM INTO '${backupFile.replace(/\\/g, '/').replace(/'/g, "''")}'`);
    store.migrate(result.records);
    console.log(`Added ${result.added} demo accounts. Total: ${result.total}.`);
    console.log(JSON.stringify(result.summary));
    console.log(`SQLite backup: ${backupFile}`);
  } else {
    console.log(`Dry run: would add ${result.added} demo accounts. Total: ${result.total}.`);
    console.log(JSON.stringify(result.summary));
    console.log('Pass --apply to write the generated demo data.');
  }
} finally { store.close(); }
