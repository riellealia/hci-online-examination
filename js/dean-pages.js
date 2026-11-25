/* ==================================================================
   Dean Approvals / Statistics / Logs in the shared look. Works on top
   of the page's own renderers (moves their controls, never rebuilds
   them) and re-applies after each re-render.
   - Approvals: status counts (clickable) + one "Requests" card with the
     search / status icon tools; request cards restyled in CSS.
   - Statistics: stat tiles, two charts (approval decisions, teaching
     load status), load table as a card with table tools.
   - Logs: activity per week + activity by role, log table card with
     search / filter / export icons.
   Needs CoordinatorPages (charts) and CoordinatorWorkspaces (toolbar).
   ================================================================== */
const DeanPages = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const read = key => DB.read(key, []) || [];
  const P = () => (typeof CoordinatorPages !== 'undefined' ? CoordinatorPages : null);
  const W = () => (typeof CoordinatorWorkspaces !== 'undefined' ? CoordinatorWorkspaces : null);
  const NORMAL_LOAD = 24;
  const STATUS = [['pending', 'Pending', 'Waiting for your decision'], ['approved', 'Approved', 'Applied to the records'], ['rejected', 'Rejected', 'Returned with remarks'], ['withdrawn', 'Withdrawn', 'Pulled back by the requester']];
  const TYPE = { 'role-assignment': 'role', 'professor-assignment': 'subject', 'student-enrollment': 'subject', 'professor-overload': 'load', 'student-overload': 'load', 'faculty-student-enrollment': 'enrollment change', 'section-create': 'section' };
  function requests() { try { return ApprovalService.queryFor(session, {}) || []; } catch (_) { return read('approvalRequests'); } }

  /* ---------- Approvals ---------- */
  function approvals() {
    const host = document.getElementById('approvalsSection'), list = document.getElementById('deanApprovalList'); if (!host || !list || !W()) return;
    host.classList.add('dp-page', 'cw-page');
    const bar = host.querySelector('.role-filter-bar');
    if (!host.querySelector('.cw-stats')) {
      (bar || list).insertAdjacentHTML('beforebegin', '<div class="cw-stats" role="group" aria-label="Requests by status"></div>');
      host.querySelector('.cw-stats').addEventListener('click', event => {
        const cell = event.target.closest('[data-cw-status]'), select = document.getElementById('deanApprovalStatus'); if (!cell || !select) return;
        select.value = select.value === cell.dataset.cwStatus ? '' : cell.dataset.cwStatus; select.dispatchEvent(new Event('change')); stats(); W().mark(host.querySelector('.cw-tools'));
      });
    }
    if (!host.querySelector('.dp-requests')) {
      const card = document.createElement('section'); card.className = 'dp-table-card dp-requests';
      const head = document.createElement('header'); head.className = 'dp-table-head';
      head.innerHTML = '<div><h3>Requests</h3><p>Roles, subjects and loads for Professors and Students · Faculty enrollment changes</p></div>';
      const search = document.getElementById('deanApprovalSearch'), status = document.getElementById('deanApprovalStatus');
      const label = document.createElement('label'); label.innerHTML = '<span>Status</span>'; if (status) label.appendChild(status);
      head.appendChild(W().toolbar([{ name: 'search', label: 'Search requests', icon: W().ICONS.search, panel: [search] }, { name: 'filter', label: 'Filter by status', icon: W().ICONS.filter, panel: [label] }]));
      const body = document.createElement('div'); body.className = 'dp-requests-body';
      list.parentElement.before(card); body.appendChild(list.closest('.role-workflow-list') || list); card.append(head, body);
      bar?.classList.add('cw-emptied');
      status?.addEventListener('change', stats);
    }
    stats();
  }
  function stats() {
    const box = document.querySelector('#approvalsSection .cw-stats'); if (!box) return;
    const all = requests(), chosen = document.getElementById('deanApprovalStatus')?.value || '';
    const of = status => all.filter(r => status === 'withdrawn' ? ['withdrawn', 'cancelled'].includes(r.status) : r.status === status);
    const split = rows => [...new Set(Object.values(TYPE))].map(l => `${rows.filter(r => TYPE[r.type] === l).length} ${l}`).join(' · ');
    box.innerHTML = STATUS.map(([key, label, sub]) => { const rows = of(key); return `<button type="button" class="cw-stat${chosen === key ? ' active' : ''}" data-cw-status="${key}" data-tone="${key}" aria-pressed="${chosen === key}"><span>${label}</span><strong>${rows.length}</strong><small>${split(rows)}</small><em>${sub}</em></button>`; }).join('');
  }

  /* ---------- Statistics ---------- */
  function loads() {
    const subjects = read('subjects'), units = code => Number(subjects.find(s => s.code === code)?.units) || 3;
    const offers = read('sectionSubjects').flatMap(r => (r.assignments || []).map(a => ({ ...a, sectionId: r.sectionId })));
    return read('faculty').map(f => { const mine = offers.filter(o => o.facultyId === f.id); return { name: `${f.first} ${f.last}`, units: mine.reduce((s, o) => s + units(o.subjectCode), 0) }; });
  }
  function statistics() {
    const root = document.getElementById('deanStatistics'); if (!root || !P() || root.querySelector('.ck-insights')) return;
    document.getElementById('statisticsSection')?.classList.add('dp-page');
    const all = requests(), count = s => all.filter(r => r.status === s).length;
    const decisions = P().donut([{ label: 'Pending', value: count('pending'), color: '#d39a2c' }, { label: 'Approved', value: count('approved'), color: '#2f8d83' }, { label: 'Rejected', value: count('rejected'), color: '#b5534b' }, { label: 'Withdrawn / cancelled', value: count('withdrawn') + count('cancelled'), color: '#8a8f99' }], 'requests');
    const rows = loads(), groups = [['Overloaded', p => p.units > NORMAL_LOAD, '#b5534b'], ['Full load', p => p.units >= NORMAL_LOAD * .75 && p.units <= NORMAL_LOAD, 'var(--role-shell-role)'], ['Light load', p => p.units > 0 && p.units < NORMAL_LOAD * .75, 'var(--role-shell-yellow)'], ['No load', p => !p.units, '#8a8f99']].map(([label, test, color]) => ({ label, n: rows.filter(test).length, color }));
    const most = Math.max(1, ...groups.map(g => g.n));
    const loadBars = P().bars(groups.map(g => ({ label: g.label, pct: g.n ? g.n / most * 100 : 0, text: String(g.n), color: g.color, title: `${g.label}: ${g.n} professors` })));
    const grid = root.querySelector('.dean-stat-grid');
    (grid || root.firstChild)?.insertAdjacentHTML('afterend', P().insights(P().card('Approval decisions', `${all.length} requests in total`, decisions), P().card('Teaching load status', `${rows.length} professors · normal load ${NORMAL_LOAD} units`, loadBars)));
    // The text-only decisions panel is now a chart.
    [...root.querySelectorAll('.dean-stat-panel')].find(p => /approval decisions/i.test(p.querySelector('h3')?.textContent || ''))?.classList.add('cw-emptied');
    // Teaching-load table: card with table tools, units with a load bar, state as a pill.
    const panel = [...root.querySelectorAll('.dean-stat-panel')].find(p => /teaching-load/i.test(p.querySelector('h3')?.textContent || ''));
    const table = panel?.querySelector('table');
    if (panel && table) {
      panel.classList.add('dp-table-card', 'dp-stat-table');
      const h3 = panel.querySelector('h3'), head = document.createElement('header'); head.className = 'dp-table-head';
      head.innerHTML = `<div><h3>Teaching-load distribution</h3><p>Offerings and units per professor this period</p></div><div class="dp-tools"></div>`; h3.replaceWith(head);
      table.classList.add('dp-table'); table.id = 'deanLoadTable';
      table.querySelectorAll('tbody tr').forEach(tr => {
        const u = Number(tr.cells[2]?.textContent); if (tr.cells[2] && Number.isFinite(u)) tr.cells[2].innerHTML = `<span class="dp-load">${u}/${NORMAL_LOAD}</span><i class="ck-mini"><b class="${u > NORMAL_LOAD ? 'over' : u >= NORMAL_LOAD * .9 ? 'high' : ''}" style="width:${Math.min(100, u / NORMAL_LOAD * 100)}%"></b></i>`;
        const s = tr.cells[3]; if (s) s.innerHTML = `<span class="dp-pill ${/unassigned/i.test(s.textContent) ? 'bad' : 'good'}">${esc(s.textContent.trim())}</span>`;
      });
      if (typeof AdminTableTools !== 'undefined') AdminTableTools.mount('dean-load', table, head.querySelector('.dp-tools'), { exportName: 'teaching-load' });
    }
  }

  /* ---------- Logs ---------- */
  const LOG_LABELS = { deanLogFrom: 'From date', deanLogTo: 'To date', deanLogActor: 'Actor', deanLogRole: 'Role', deanLogCategory: 'Category', deanLogAction: 'Action', deanLogTarget: 'Target', deanLogProgram: 'Program', deanLogResult: 'Result' };
  function logCharts() {
    let all = []; try { all = AuditLog.queryFor(session) || []; } catch (_) {}
    const p = P(), now = new Date(), weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
    const first = all.reduce((min, e) => Math.min(min, new Date(e.at).getTime() || min), now.getTime());
    let start = weekStart(Math.min(first, now.getTime() - 11 * 7 * 864e5)); const limit = weekStart(now.getTime() - 25 * 7 * 864e5); if (start < limit) start = limit;
    const weeks = []; for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 7)) weeks.push({ at: new Date(d), n: 0 });
    all.forEach(e => { const t = new Date(e.at).getTime(); const w = weeks.filter(x => x.at.getTime() <= t).pop(); if (w) w.n++; });
    const top = Math.max(1, ...weeks.map(w => w.n));
    const columns = `<div class="cw-cols" style="--n:${weeks.length}">${weeks.map(w => `<span title="Week of ${w.at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${w.n} event${w.n === 1 ? '' : 's'}"><i style="height:${w.n ? Math.max(6, w.n / top * 100) : 0}%"></i></span>`).join('')}</div><div class="cw-cols-axis"><span>${weeks[0].at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span>This week</span></div>`;
    const ROLE = { dean: 'Dean', coordinator: 'Faculty Coordinator', faculty: 'Professor', student: 'Student', admin: 'Administrator' };
    const byRole = new Map(); all.forEach(e => { const r = ROLE[e.actorRole] || e.actorRole || 'Other'; byRole.set(r, (byRole.get(r) || 0) + 1); });
    const most = Math.max(1, ...byRole.values());
    const roles = [...byRole.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => ({ label: r, pct: n / most * 100, text: String(n), title: `${r}: ${n} events` }));
    return p.insights(p.card('Activity per week', `${all.length} college events`, columns), p.card('Activity by role', 'Who made the changes', p.bars(roles)));
  }
  function logs() {
    const host = document.getElementById('logsSection'), filters = host?.querySelector('.dean-log-filters'), table = document.getElementById('deanLogTable'), summary = document.getElementById('deanLogSummary');
    if (!host || !filters || !table || !P() || !W()) return;
    host.classList.add('dp-page');
    const old = host.querySelector('.ck-insights'); if (old) { old.insertAdjacentHTML('beforebegin', logCharts()); old.remove(); } else filters.insertAdjacentHTML('beforebegin', logCharts());
    if (!host.querySelector('.cw-log-card')) {
      const card = document.createElement('section'); card.className = 'cw-log-card';
      const head = document.createElement('header'); head.className = 'cw-log-head';
      const title = document.createElement('div'); title.innerHTML = '<h3>Activity log</h3>'; if (summary) title.appendChild(summary);
      const search = document.getElementById('deanLogSearch');
      const fields = [...filters.children].filter(el => el !== search).map(el => { if (el.tagName === 'BUTTON') { el.classList.add('cw-reset'); return el; } const label = document.createElement('label'); label.innerHTML = `<span>${esc(LOG_LABELS[el.id] || 'Filter')}</span>`; label.appendChild(el); return label; });
      const bar = W().toolbar([{ name: 'search', label: 'Search activity', icon: W().ICONS.search, panel: [search] }, { name: 'filter', label: 'Filter activity', icon: W().ICONS.filter, panel: fields }, { name: 'export', label: 'Export activity', icon: W().ICONS.export }], { exportName: 'college-activity', exportTable: () => table.querySelector('table') });
      head.append(title, bar); card.append(head, table); filters.after(card); filters.classList.add('cw-emptied');
      bar.querySelector('.cw-reset')?.addEventListener('click', () => setTimeout(() => W().mark(bar), 0));
    }
  }

  /* ---------- wiring ---------- */
  function refresh() { [approvals, statistics, logs].forEach(fn => { try { fn(); } catch (e) { console.warn(e); } }); }
  function mount() {
    refresh();
    const watch = (id, fn) => { const el = document.getElementById(id); if (!el) return; let queued = false; new MutationObserver(() => { if (queued) return; queued = true; setTimeout(() => { queued = false; fn(); }, 0); }).observe(el, { childList: true }); };
    watch('deanApprovalList', stats);
    watch('deanStatistics', statistics);
    watch('deanLogTable', logs);
  }
  return { mount, refresh };
})();
if (typeof window !== 'undefined') window.DeanPages = DeanPages;
