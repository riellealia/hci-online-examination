const fs = require('fs');
const { JSDOM } = require('jsdom');
const R = require('path').join(__dirname, '..') + '/';
const shared = fs.readFileSync(R + 'css/shared-ui.css', 'utf8');
const base = fs.readFileSync(R + 'css/style.css', 'utf8');

const ok = (c, m) => console.log(`  ${c ? '✅' : '❌'} ${m}`);

console.log('=== Every data table scrolls inside its own container ===');
let unwrapped = 0, checked = 0;
for (const f of ['admin.html', 'student.html']) {
  const dom = new JSDOM(fs.readFileSync(R + 'html/' + f, 'utf8'));
  for (const tbl of dom.window.document.querySelectorAll('table[id]')) {
    checked++;
    if (!tbl.closest('.table-scroll')) { unwrapped++; console.log('     unwrapped: #' + tbl.id + ' in ' + f); }
  }
}
ok(unwrapped === 0, `${checked} tables checked, ${unwrapped} without a scroll container`);
ok(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/.test(shared), '.table-scroll actually scrolls horizontally');
ok(/\.table-scroll > table\s*\{[^}]*min-width/.test(shared), 'tables keep a readable minimum width inside it');

console.log('\n=== Nothing can be wider than the viewport ===');
const capRule = shared.match(/\.modal,\s*\.question-modal,\s*\.exam-box,\s*\.login-container,\s*\.confirm-box\s*\{([^}]*)\}/);
ok(!!capRule, 'a shared cap rule exists for every wide surface');
ok(capRule && /max-width:\s*calc\(100vw/.test(capRule[1]), 'and it caps to the viewport');
ok(/body\s*\{[^}]*overflow-x:\s*hidden/.test(shared), 'body cannot scroll sideways');

// Which fixed-width selectors exist, and are they all in the cap list?
const capped = ['.modal', '.question-modal', '.exam-box', '.login-container', '.confirm-box'];
const wide = new Set();
for (const src of [shared, base, fs.readFileSync(R + 'html/faculty.html', 'utf8'),
                   fs.readFileSync(R + 'html/student.html', 'utf8')]) {
  for (const m of src.matchAll(/([.#][\w-]+)\s*\{[^}]*?[^-]width:\s*(\d{3,})px/g)) {
    if (Number(m[2]) > 380) wide.add(m[1]);
  }
}
const missing = [...wide].filter(s => !capped.includes(s));
ok(missing.length === 0, missing.length ? 'uncapped: ' + missing.join(', ')
   : `all ${wide.size} wide surfaces (${[...wide].join(', ')}) are capped`);

console.log('\n=== Phone breakpoints ===');
const bps = [...shared.matchAll(/@media \(max-width:\s*(\d+)px\)/g)].map(m => Number(m[1])).sort((a, b) => b - a);
ok(bps.includes(640), 'a 640px breakpoint exists');
ok(bps.includes(400), 'a 400px breakpoint exists for very small phones');
console.log('     breakpoints: ' + bps.join(', ') + 'px');

const small = shared.slice(shared.indexOf('@media (max-width: 640px)', shared.indexOf('Small screens')));
for (const [what, re] of [
  ['dialogs become full-width sheets', /\.modal,\s*\.question-modal,\s*\.exam-box\s*\{[^}]*width:\s*calc\(100vw/],
  ['button rows stack', /flex-direction:\s*column/],
  ['toasts span the width', /\.toast-host\s*\{[^}]*right:\s*10px/],
  ['import controls stack', /\.action-box\s*\{[^}]*flex-direction:\s*column/],
  ['exam timer wraps below the title', /\.exam-head-right\s*\{[^}]*width:\s*100%/],
]) ok(re.test(small), what);
