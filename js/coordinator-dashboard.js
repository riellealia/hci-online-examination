/* ==================================================================
   Faculty Coordinator dashboard (main + side, like Student/Professor).
   The coordinator organizes sections, professors and students; big
   changes (professor assignments, overloads, enrollment changes) are
   requests that the Dean approves, so cells link to the page where the
   coordinator prepares them.
   Uses page globals at call time: DB, SectionService, AuditLog,
   ApprovalService, session, coordinatorNav, showCoordinatorApplicationTab.
   ================================================================== */
const CoordinatorDashboard = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const read = key => DB.read(key, []) || [];
  const state = { program: 'all' };
  let quickLinks = '';

  function context() {
    const sections = read('sections'), students = read('students'), faculty = read('faculty'), subjects = read('subjects');
    const offers = SectionService.assignmentOfferings(read('sectionSubjects'), sections, read('curricula'));
    const units = code => Number(subjects.find(s => s.code === code)?.units) || 3;
    const members = id => students.filter(s => (s.sections || []).includes(id)).length;
    const sectionRows = sections.map(s => { const cap = Number(s.capacity) || 50, count = members(s.id); return { id: s.id, program: s.program || '—', year: Number(s.yearLevel) || 0, count, cap, fill: cap ? count / cap * 100 : 0 }; });
    const load = new Map(); offers.forEach(o => { if (o.facultyId) load.set(o.facultyId, (load.get(o.facultyId) || 0) + units(o.subjectCode)); });
    const profRows = faculty.map(f => ({ id: f.id, name: `${f.last}, ${f.first}`, units: load.get(f.id) || 0, classes: offers.filter(o => o.facultyId === f.id).length }));
    let requests = []; try { requests = ApprovalService.queryFor(session, {}) || []; } catch (_) { requests = read('approvalRequests'); }
    let activity = []; try { activity = AuditLog.queryFor(session) || []; } catch (_) {}
    return { sections, students, faculty, offers, sectionRows, profRows, requests, activity };
  }

  /* ---------- pieces ---------- */
  function hero(ctx) {
    const me = read('coordinators').find(c => c.username === session.username || c.id === session.username) || {};
    const pending = ctx.requests.filter(r => r.status === 'pending').length;
    const stats = [[ctx.sections.length, 'Sections'], [ctx.faculty.length, 'Professors'], [ctx.students.length, 'Students'], [ctx.offers.length, 'Offerings']];
    return `<header class="role-page-hero cd-hero"><div><p class="role-page-eyebrow">${esc(new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))}</p><h1>Welcome back, ${esc(me.first || 'Coordinator')}</h1><p class="role-page-copy">${esc(me.college || 'Faculty Coordinator')}. You organize sections, professors and students; ${pending ? `<strong>${pending} request${pending === 1 ? ' is' : 's are'}</strong> waiting for the Dean.` : 'no requests are waiting for the Dean.'}</p></div><div class="cd-hero-stats">${stats.map(([v, l]) => `<div><strong>${v}</strong><span>${l}</span></div>`).join('')}</div></header>`;
  }

  function attention(ctx) {
    const unassigned = ctx.offers.filter(o => !o.facultyId).length;
    const full = ctx.sectionRows.filter(s => s.fill >= 90).length;
    const idle = ctx.profRows.filter(p => !p.units).length;
    const unscheduled = ctx.offers.filter(o => !(o.schedule?.days || []).length || !o.schedule?.start).length;
    const pending = ctx.requests.filter(r => r.status === 'pending').length;
    const cells = [
      ['assign', unassigned, 'Unassigned offerings', 'Request a professor for the Dean to approve', 'applications'],
      ['capacity', full, 'Sections at 90%+ capacity', 'Review capacity before new requests', 'sectionManagementSection'],
      ['idle', idle, 'Professors without load', 'Candidates for open offerings', 'professorManagementSection'],
      ['schedule', unscheduled, 'Offerings without a schedule', 'Set meeting days, time and room', 'schedulesSection'],
      ['dean', pending, 'Waiting for the Dean', 'Assignments and overload applications', 'applications']
    ];
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Needs attention</h2><p>Open an item to go to the page where you handle it.</p></div></header><div class="cd-attention">${cells.map(([key, n, title, copy, target]) => `<button type="button" class="cd-cell ${n ? 'has' : 'clear'}" data-cd-go="${target}"><span class="cd-cell-count">${n}</span><span><strong>${title}</strong><small>${n ? copy : 'All clear'}</small></span><span class="cd-cell-arrow" aria-hidden="true">&#8250;</span></button>`).join('')}</div></section>`;
  }

  function bars(rows, value, label, tone, max = 100, suffix = '%') {
    if (!rows.length) return '<p class="cd-empty">Nothing to show yet.</p>';
    return `<div class="cd-bars">${rows.map(r => { const v = value(r), w = Math.max(2, Math.min(100, v / max * 100)); return `<div class="cd-bar-row" title="${esc(label(r))}"><span class="cd-bar-label">${esc(r.label)}</span><span class="cd-bar-track"><i class="${tone(r)}" style="width:${w}%"></i></span><b>${esc(r.text)}</b></div>`; }).join('')}</div>`;
  }

  function sectionChart(ctx) {
    const programs = [...new Set(ctx.sectionRows.map(s => s.program))].sort();
    if (state.program !== 'all' && !programs.includes(state.program)) state.program = 'all';
    const rows = ctx.sectionRows.filter(s => state.program === 'all' || s.program === state.program).sort((a, b) => b.fill - a.fill || a.id.localeCompare(b.id))
      .map(s => ({ ...s, label: s.id, text: `${s.count}/${s.cap}` }));
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Section capacity</h2><p>Students in each section compared with its capacity</p></div><select class="cd-select" data-cd-program aria-label="Program">${['all', ...programs].map(p => `<option value="${esc(p)}"${p === state.program ? ' selected' : ''}>${p === 'all' ? 'All programs' : esc(p)}</option>`).join('')}</select></header><div class="cd-scroll">${bars(rows, r => r.fill, r => `${r.id}: ${r.count} of ${r.cap} students (${Math.round(r.fill)}%)`, r => r.fill >= 100 ? 'over' : r.fill >= 90 ? 'high' : '')}</div><footer class="cd-legend"><span><i></i>Below 90%</span><span><i class="high"></i>90%+</span><span><i class="over"></i>Full</span></footer></section>`;
  }

  function loadChart(ctx) {
    const loaded = ctx.profRows.filter(p => p.units).sort((a, b) => b.units - a.units || a.name.localeCompare(b.name));
    const max = Math.max(1, ...loaded.map(p => p.units));
    const rows = loaded.slice(0, 12).map(p => ({ ...p, label: p.name, text: `${p.units} u` }));
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Professor teaching load</h2><p>Units assigned this period · ${loaded.length} of ${ctx.profRows.length} professors teaching</p></div><button type="button" class="cd-link" data-cd-go="professorManagementSection">Manage &#8250;</button></header>${bars(rows, r => r.units, r => `${r.name}: ${r.units} units across ${r.classes} classes`, () => '', max)}</section>`;
  }

  function donut(parts) {
    const total = parts.reduce((s, p) => s + p.value, 0), r = 46, c = 2 * Math.PI * r; let off = 0;
    const arcs = parts.filter(p => p.value).map(p => { const len = total ? p.value / total * c : 0, arc = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${p.color}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += len; return arc; }).join('');
    return `<div class="cd-donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle r="${r}" cx="60" cy="60" fill="none" class="cd-donut-track" stroke-width="16"/>${arcs}<text x="60" y="64" text-anchor="middle">${total}</text></svg><ul>${parts.map(p => `<li><i style="background:${p.color}"></i>${esc(p.label)}<b>${p.value}</b></li>`).join('')}</ul></div>`;
  }

  function yearCard(ctx) {
    const byYear = new Map();
    ctx.students.forEach(s => { const sec = ctx.sectionRows.find(x => (s.sections || []).includes(x.id)); const y = sec?.year || 0; byYear.set(y, (byYear.get(y) || 0) + 1); });
    const colors = ['var(--role-shell-role)', 'var(--role-shell-yellow)', '#2f8d83', '#7560ad', '#b5534b'];
    const parts = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([y, v], i) => ({ label: y ? `Year ${y}` : 'No section', value: v, color: colors[i % colors.length] }));
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Students by year</h2></div><button type="button" class="cd-link" data-cd-go="offeringsSection">Open &#8250;</button></header>${donut(parts)}</section>`;
  }

  function requestsCard(ctx) {
    const count = s => ctx.requests.filter(r => r.status === s).length;
    const latest = ctx.requests.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 4);
    const label = t => ({ 'professor-assignment': 'Professor assignment', 'student-overload': 'Student overload', 'faculty-student-enrollment': 'Enrollment change', 'role-assignment': 'Role', 'student-enrollment': 'Student subject', 'professor-overload': 'Professor overload' }[t] || String(t || 'Request').replace(/-/g, ' '));
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Dean requests</h2><p>Changes that need the Dean's approval</p></div><button type="button" class="cd-link" data-cd-go="applications">Open &#8250;</button></header>
      <div class="cd-req-stats"><div><strong>${count('pending')}</strong><span>Pending</span></div><div><strong>${count('approved')}</strong><span>Approved</span></div><div><strong>${count('rejected')}</strong><span>Rejected</span></div></div>
      ${latest.length ? `<ul class="cd-list">${latest.map(r => `<li><span><strong>${esc(label(r.type))}</strong><small>${esc(r.targetId || '')}${r.createdAt ? ` · ${esc(new Date(r.createdAt).toLocaleDateString())}` : ''}</small></span><em class="cd-status ${esc(r.status)}">${esc(r.status)}</em></li>`).join('')}</ul>` : '<p class="cd-empty">No requests yet. Professor assignments and overload applications you send will appear here.</p>'}</section>`;
  }

  function activityCard(ctx) {
    const items = ctx.activity.filter(i => !/^(login|logout|session)/i.test(String(i.action || '')) && i.entityType !== 'session').slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 5);
    return `<section class="cd-card"><header class="cd-card-head"><div><h2>Recent activity</h2></div><button type="button" class="cd-link" data-cd-go="logsSection">Logs &#8250;</button></header>${items.length ? `<ul class="cd-list">${items.map(i => `<li><span><strong>${esc(String(i.action || '').replace(/[-_]/g, ' '))}</strong><small>${esc(i.entityType || '')} · ${esc(new Date(i.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))}</small></span></li>`).join('')}</ul>` : '<p class="cd-empty">No coordination activity yet. Section, schedule, assignment and request changes will appear here.</p>'}</section>`;
  }

  function render() {
    const host = document.getElementById('dashboardSection'); if (!host) return;
    const ctx = context();
    // Keep the page's original quick-link cards (they open each workspace) and
    // the counters the rest of the page still updates.
    if (!quickLinks) quickLinks = host.querySelector('.role-action-grid')?.outerHTML || '';
    const counters = ['offeringCount', 'professorCount', 'studentCount', 'requestCount'].map(id => `<span id="${id}">${esc(document.getElementById(id)?.textContent || '0')}</span>`).join('');
    host.classList.add('cd-page');
    host.innerHTML = `${hero(ctx)}<div hidden aria-hidden="true">${counters}</div><div class="cd-layout"><div class="cd-main">${attention(ctx)}${sectionChart(ctx)}${loadChart(ctx)}</div><aside class="cd-side">${requestsCard(ctx)}${yearCard(ctx)}${quickLinks ? `<section class="cd-card cd-quick"><header class="cd-card-head"><div><h2>Quick links</h2><p>Every coordinator workspace in one place</p></div></header>${quickLinks}</section>` : ''}</aside></div>`;
  }

  function bind() {
    const host = document.getElementById('dashboardSection'); if (!host || host.dataset.cdBound) return; host.dataset.cdBound = '1';
    host.addEventListener('click', e => {
      const go = e.target.closest('[data-cd-go]'); if (!go) return;
      const target = go.dataset.cdGo;
      if (target === 'applications' && typeof showCoordinatorApplicationTab === 'function') showCoordinatorApplicationTab('assignment');
      else coordinatorNav?.show(target);
      window.scrollTo?.(0, 0);
    });
    host.addEventListener('change', e => { if (e.target.matches('[data-cd-program]')) { state.program = e.target.value; render(); } });
    document.querySelector('#sidebar [data-panel="dashboardSection"]')?.addEventListener('click', render);
  }

  return { render: () => { bind(); render(); } };
})();
