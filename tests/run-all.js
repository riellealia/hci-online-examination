/* Runs every test file and prints a summary.

   Setup once:   cd tests && npm install jsdom
   Then:         node run-all.js
*/

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const files = fs.readdirSync(__dirname)
  .filter(f => f.startsWith('t_') && f.endsWith('.js'))
  .sort();

let pass = 0, fail = 0;
const failing = [];

let crashed = 0;

for (const f of files) {
  let out = '', crashedHere = false;
  try {
    out = execFileSync(process.execPath, [path.join(__dirname, f)], {
      encoding: 'utf8',
      timeout: 90000,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (e) {
    out = String((e.stdout || '') + (e.stderr || ''));
    // A file that throws part-way prints fewer ticks and no crosses, which
    // would otherwise read as "0 failed". Treat it as a failure explicitly.
    crashedHere = true;
  }

  const p = (out.match(/✅/g) || []).length;
  const n = (out.match(/❌/g) || []).length;
  pass += p;
  fail += n;

  if (crashedHere) {
    crashed++;
    failing.push(f + '  (crashed before finishing)');
    const err = out.split('\n').find(l => /Error|error:/.test(l));
    if (err) failing.push('    ' + err.trim());
  }
  if (n > 0) {
    failing.push(f);
    out.split('\n').filter(l => l.includes('❌')).forEach(l => failing.push('    ' + l.trim()));
  }

  const status = crashedHere ? 'CRASH' : (n === 0 ? 'ok   ' : 'FAIL ');
  console.log(`  ${status} ${f.padEnd(16)} ${String(p).padStart(3)} passed${n ? `, ${n} failed` : ''}${crashedHere ? ' — DID NOT FINISH' : ''}`);
}

console.log('  ' + '-'.repeat(52));
console.log(`  TOTAL: ${pass} passed, ${fail} failed`
  + (crashed ? `, ${crashed} file(s) crashed` : ''));
if (failing.length) {
  console.log('\n  Problems:');
  failing.forEach(l => console.log('  ' + l));
}
process.exit(fail === 0 && crashed === 0 ? 0 : 1);
