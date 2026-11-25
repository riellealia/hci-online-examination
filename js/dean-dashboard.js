/* ==================================================================
   College Dean dashboard, same format as the other roles: banner hero,
   "Needs attention" cells that open the right page, two charts in the
   main column, approvals / exam results / quick links on the side.
   Reuses the coordinator dashboard styles (css/coordinator-dashboard.css).
   Uses page globals at call time: DB, ApprovalService, session, deanNav.
   ================================================================== */
const DeanDashboard = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const read = key => DB.read(key, []) || [];
  const NORMAL_LOAD = 24, STALE_DAYS = 7;
  const state = { year: 'all' };
  let quickLinks = '';

  function context() {
    const sections = read('sections'), students = read('students'), faculty = read('faculty'), subjects = read('subjects'), users = read('users');
    const coordinators = users.filter(u => u.role === 'coordinator' && u.disabled !== true);
    const offers = read('sectionSubjects').flatMap(r => (r.assignments || []).map(a => ({ ...a, sectionId: r.sectionId })));
    const units = code => Number(subjects.find(s => s.code === code)?.units) || 3;
    const load = new Map(); offers.forEach(o => { if (o.facultyId) load.set(o.facultyId, (load.get(o.facultyId) || 0) + units(o.subjectCode)); });
    const profRows = faculty.map(f => ({ id: f.id, name: `${f.last}, ${f.first}`, units: load.get(f.id) || 0 }));
    let requests = []; try { requests = ApprovalService.queryFor(session, {}) || []; } catch (_) { requests = read('approvalRequests'); }
    const sectionOf = new Map(sections.map(s => [s.id, s]));
    const studentInfo = new Map(students.map(st => { const sec = (st.sections || []).map(id => sectionOf.get(id)).find(Boolean); return [st.id, { program: sec?.program || st.program || '—', year: Number(sec?.yearLevel) || 0 }]; }));
    const exams = new Map(read('exams').map(e => [e.id, e]));
    const results = read('studentSubmissions').filter(s => Number(s.total) > 0 && exams.has(s.examId)).map(s => {
      const marks = (s.answers || []).reduce((t, a) => t + (Number(a.awarded) || 0), 0), pct = marks / Number(s.total) * 100;
      const info = studentInfo.get(s.studentId) || { program: '—', year: 0 };
      return { pct, passed: pct >= (Number(exams.get(s.examId).passingPercent) || 70), ...info };
    });
    return { sections, students, faculty, coordinators, offers, profRows, requests, results };
  }

  /* ---------- pieces ---------- */
  function hero(ctx) {
    const pending = ctx.requests.filter(r => r.status === 'pending').length;
    const stats = [[ctx.faculty.length, 'Professors'], [ctx.coordinators.length, 'Coordinators'], [ctx.sections.length, 'Sections'], [ctx.students.length, 'Students']];
    return `<header class="role-page-hero cd-hero"><div><p class="role-page-eyebrow">${esc(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}</p><h1>Welcome back, ${esc((read('users').find(u => u.username === session.username) || {}).first || 'Dean')}</h1><p class="role-page-copy">College of Information and Computer Studies. ${pending ? `<strong>${pending} request${pending === 1 ? ' is' : 's are'}</strong> waiting for your approval.` : 'No requests are waiting for your approval.'}</p></div><div class="cd-hero-stats">${stats.map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join('')}</div></header>`;
  }

  function attention(ctx) {
    const now = Date.now(), pending = ctx.requests.filter(r => r.status === 'pending');
    const stale = pending.filter(r => { const t = new Date(r.submittedAt || r.createdAt).getTime(); return t && now - t > STALE_DAYS * 864e5; }).length;
    const over = ctx.profRows.filter(p => p.units > NORMAL_LOAD).length;
    const idle = ctx.profRows.filter(p => !p.units).length;
    const unassigned = ctx.offers.filter(o => !o.facultyId).length;
    const cells = [
      [pending.length, 'Waiting for your approval', 'Assignments, overloads and enrollment changes', 'approvalsSection'],
      [stale, `Waiting over ${STALE_DAYS} days`, 'Oldest requests first', 'approvalsSection'],
      [over, 'Overloaded professors', `More than ${NORMAL_LOAD} units this period`, 'membersSection'],
      [idle, 'Professors without load', 'No classes assigned yet', 'membersSection'],
      [unassigned, 'Offerings without a professor', 'Coordinators still need to request one', 'statisticsSection']
    ];
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Needs attention</h2><p>Open an item to go to the page where you handle it.</p></div></header><div class="cd-attention">${cells.map(([n, title, copy, target]) => `<button type="button" class="cd-cell ${n ? 'has' : 'clear'}" data-dd-go="${target}"><span class="cd-cell-count">${n}</span><span><strong>${title}</strong><small>${n ? copy : 'All clear'}</small></span><span class="cd-cell-arrow" aria-hidden="true">&#8250;</span></button>`).join('')}</div></section>`;
  }

  function bars(rows) {
    if (!rows.length) return '<p class="cd-empty">Nothing to show yet.</p>';
    return `<div class="cd-bars">${rows.map(r => `<div class="cd-bar-row" title="${esc(r.title)}"><span class="cd-bar-label">${esc(r.label)}</span><span class="cd-bar-track"><i class="${r.tone || ''}" style="width:${Math.max(2, Math.min(100, r.pct))}%${r.color ? `;background:${r.color}` : ''}"></i></span><b>${esc(r.text)}</b></div>`).join('')}</div>`;
  }

  function performanceChart(ctx) {
    const years = [...new Set(ctx.results.map(r => r.year).filter(Boolean))].sort();
    if (state.year !== 'all' && !years.includes(Number(state.year))) state.year = 'all';
    const shown = ctx.results.filter(r => state.year === 'all' || r.year === Number(state.year));
    const byProgram = new Map(); shown.forEach(r => { const e = byProgram.get(r.program) || { sum: 0, n: 0, passed: 0 }; e.sum += r.pct; e.n++; if (r.passed) e.passed++; byProgram.set(r.program, e); });
    const rows = [...byProgram.entries()].map(([p, e]) => ({ label: p, avg: e.sum / e.n, rate: e.passed / e.n * 100, n: e.n })).sort((a, b) => b.avg - a.avg)
      .map(r => ({ label: r.label, pct: r.avg, text: `${r.avg.toFixed(1)}%`, tone: r.avg < 70 ? 'over' : r.avg < 80 ? 'high' : '', title: `${r.label}: average ${r.avg.toFixed(1)}%, ${Math.round(r.rate)}% passed (${r.n} results)` }));
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Exam performance by program</h2><p>Average score of graded exams · ${shown.length} results</p></div><select class="cd-select" data-dd-year aria-label="Year level">${['all', ...years].map(y => `<option value="${y}"${String(y) === String(state.year) ? ' selected' : ''}>${y === 'all' ? 'All years' : `Year ${y}`}</option>`).join('')}</select></header>${bars(rows)}<footer class="cd-legend"><span><i></i>80% and up</span><span><i class="high"></i>70–79%</span><span><i class="over"></i>Below 70%</span></footer></section>`;
  }

  function loadChart(ctx) {
    const groups = [
      ['Overloaded', p => p.units > NORMAL_LOAD, '#b5534b', `More than ${NORMAL_LOAD} units`],
      ['Full load', p => p.units >= NORMAL_LOAD * .75 && p.units <= NORMAL_LOAD, 'var(--role-shell-role)', `${Math.ceil(NORMAL_LOAD * .75)}–${NORMAL_LOAD} units`],
      ['Light load', p => p.units > 0 && p.units < NORMAL_LOAD * .75, 'var(--role-shell-yellow)', `Under ${Math.ceil(NORMAL_LOAD * .75)} units`],
      ['No load', p => !p.units, '#8a8f99', 'No classes assigned']
    ].map(([label, test, color, note]) => ({ label, n: ctx.profRows.filter(test).length, color, note }));
    const most = Math.max(1, ...groups.map(g => g.n));
    const rows = groups.map(g => ({ label: g.label, pct: g.n ? g.n / most * 100 : 0, text: String(g.n), color: g.color, title: `${g.label} (${g.note}): ${g.n} professors` }));
    const heaviest = ctx.profRows.slice().sort((a, b) => b.units - a.units).slice(0, 3).filter(p => p.units);
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Teaching load</h2><p>${ctx.profRows.length} professors · normal load ${NORMAL_LOAD} units</p></div><button type="button" class="cd-link" data-dd-go="membersSection">Members &#8250;</button></header>${bars(rows)}${heaviest.length ? `<p class="dd-note">Heaviest: ${heaviest.map(p => `${esc(p.name)} (${p.units} u)`).join(' · ')}</p>` : ''}</section>`;
  }

  function donut(parts) {
    const total = parts.reduce((s, p) => s + p.value, 0), r = 46, c = 2 * Math.PI * r; let off = 0;
    const arcs = parts.filter(p => p.value).map(p => { const len = total ? p.value / total * c : 0, arc = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += len; return arc; }).join('');
    return `<div class="cd-donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle r="${r}" cx="60" cy="60" fill="none" class="cd-donut-track" stroke-width="16"/>${arcs}<text x="60" y="64" text-anchor="middle">${total}</text></svg><ul>${parts.map(p => `<li><i style="background:${p.color}"></i>${esc(p.label)}<b>${p.value}</b></li>`).join('')}</ul></div>`;
  }

  function approvalsCard(ctx) {
    const count = s => ctx.requests.filter(r => r.status === s).length;
    const label = t => ({ 'professor-assignment': 'Professor assignment', 'student-overload': 'Student overload', 'faculty-student-enrollment': 'Enrollment change', 'role-assignment': 'Role', 'student-enrollment': 'Student subject', 'professor-overload': 'Professor overload', 'section-create': 'New section' }[t] || String(t || 'Request').replace(/-/g, ' '));
    const pending = ctx.requests.filter(r => r.status === 'pending').sort((a, b) => String(a.submittedAt || a.createdAt || '').localeCompare(String(b.submittedAt || b.createdAt || ''))).slice(0, 4);
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Approvals</h2><p>Requests from Faculty Coordinators and Professors</p></div><button type="button" class="cd-link" data-dd-go="approvalsSection">Review &#8250;</button></header>
      <div class="cd-req-stats"><div><strong>${count('pending')}</strong><span>Pending</span></div><div><strong>${count('approved')}</strong><span>Approved</span></div><div><strong>${count('rejected')}</strong><span>Rejected</span></div></div>
      ${pending.length ? `<ul class="cd-list">${pending.map(r => { const at = r.submittedAt || r.createdAt; return `<li><span><strong>${esc(label(r.type))}</strong><small>${esc(r.requesterId || '')}${r.targetId ? ` · ${esc(r.targetId)}` : ''}${at ? ` · ${esc(new Date(at).toLocaleDateString())}` : ''}</small></span><em class="cd-status pending">pending</em></li>`; }).join('')}</ul>` : '<p class="cd-empty">Nothing waiting. New requests from coordinators will appear here.</p>'}</section>`;
  }

  function resultsCard(ctx) {
    const passed = ctx.results.filter(r => r.passed).length, failed = ctx.results.length - passed;
    const exceptional = ctx.results.filter(r => r.pct >= 90).length;
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Exam results</h2><p>All graded attempts in the college</p></div><button type="button" class="cd-link" data-dd-go="statisticsSection">Statistics &#8250;</button></header>${ctx.results.length ? donut([{ label: '90% and up', value: exceptional, color: '#2f8d83' }, { label: 'Passed', value: passed - exceptional, color: 'var(--role-shell-role)' }, { label: 'Failed', value: failed, color: '#b5534b' }]) : '<p class="cd-empty">No graded exams yet.</p>'}</section>`;
  }

  function render() {
    const host = document.getElementById('dashboardSection'); if (!host) return;
    const ctx = context();
    // Keep the original quick-link cards and the counters the page still updates.
    if (!quickLinks) quickLinks = host.querySelector('.role-action-grid')?.outerHTML || '';
    const counters = ['professorCount', 'coordinatorCount', 'approvalCount', 'sectionCount'].map(id => `<span id="${id}">${esc(document.getElementById(id)?.textContent || '0')}</span>`).join('');
    host.classList.add('cd-page', 'dd-page');
    host.innerHTML = `${hero(ctx)}<div hidden aria-hidden="true">${counters}</div><div class="cd-layout"><div class="cd-main">${attention(ctx)}${performanceChart(ctx)}${loadChart(ctx)}</div><aside class="cd-side">${approvalsCard(ctx)}${resultsCard(ctx)}${quickLinks ? `<section class="cd-card cd-quick"><header class="cd-card-head"><div><h2>Quick links</h2><p>Every Dean workspace in one place</p></div></header>${quickLinks}</section>` : ''}</aside></div>`;
  }

  function bind() {
    const host = document.getElementById('dashboardSection'); if (!host || host.dataset.ddBound) return; host.dataset.ddBound = '1';
    host.addEventListener('click', e => { const go = e.target.closest('[data-dd-go]'); if (!go) return; deanNav?.show(go.dataset.ddGo); window.scrollTo?.(0, 0); });
    host.addEventListener('change', e => { if (e.target.matches('[data-dd-year]')) { state.year = e.target.value; render(); } });
    document.querySelector('#sidebar [data-panel="dashboardSection"]')?.addEventListener('click', render);
  }

  return { render: () => { bind(); render(); } };
})();
if (typeof window !== 'undefined') window.DeanDashboard = DeanDashboard;
