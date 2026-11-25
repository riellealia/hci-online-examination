/* ==================================================================
   Coordinator Applications / Subject Schedule / Logs in the shared
   card style. Charts only where they say something:
   - Applications: request counts (a few requests read better as numbers
     than as a chart), clickable to filter by status.
   - Subject Schedule: a day x hour heatmap of when classes meet plus
     classes per day; the calendar below stays the main view.
   - Logs: activity per week and activity by workflow area.
   Existing controls are moved, never rebuilt, so their listeners and
   ids keep working. Search, filters and export sit in an icon toolbar
   at the top right of each card.
   ================================================================== */
const CoordinatorWorkspaces = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const P = () => (typeof CoordinatorPages !== 'undefined' ? CoordinatorPages : null);
  const ICONS = {
    search: '<path d="m20 19-4.3-4.3a7 7 0 1 0-1.4 1.4L18.6 20 20 19ZM5 10.5a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Z"/>',
    filter: '<path d="M3 5h18l-7 8v6l-4 2v-8L3 5Zm4.3 2 4.7 5.3V18l.1-.1V12.3L16.7 7H7.3Z"/>',
    export: '<path d="M11 3h2v8.2l2.6-2.6L17 10l-5 5-5-5 1.4-1.4 2.6 2.6V3ZM5 19v-4h2v2h10v-2h2v4H5Z"/>'
  };
  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;

  /* ---------- icon toolbar ---------- */
  // Each tool is { name, label, icon, panel: Element[] (moved in) | 'export' }.
  function toolbar(tools, options = {}) {
    const bar = document.createElement('div');
    bar.className = 'table-tools cw-tools';
    tools.forEach(tool => {
      const wrap = document.createElement('div'); wrap.className = 'cw-tool';
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'tool-icon'; button.title = tool.label; button.setAttribute('aria-label', tool.label); button.setAttribute('aria-expanded', 'false'); button.dataset.cwTool = tool.name;
      button.innerHTML = icon(tool.icon);
      const panel = document.createElement('div');
      panel.className = tool.name === 'export' ? 'table-export-menu' : tool.name === 'search' ? 'table-search-box' : 'table-tool-select cw-filter-panel';
      panel.hidden = true;
      if (tool.name === 'export') panel.innerHTML = '<button type="button" data-format="csv">Export as CSV <small>.csv</small></button><button type="button" data-format="doc">Export as Word <small>.doc</small></button>';
      else (tool.panel || []).forEach(el => el && panel.appendChild(el));
      wrap.append(button, panel); bar.appendChild(wrap);
      button.addEventListener('click', event => {
        event.stopPropagation();
        const opening = panel.hidden;
        bar.querySelectorAll('.cw-tool').forEach(other => { other.querySelector(':scope>div').hidden = true; other.querySelector('.tool-icon').setAttribute('aria-expanded', 'false'); });
        panel.hidden = !opening; button.setAttribute('aria-expanded', String(opening));
        if (opening) panel.querySelector('input,select')?.focus();
        mark(bar);
      });
      panel.addEventListener('click', event => {
        event.stopPropagation();
        const item = event.target.closest('[data-format]');
        if (item && options.exportTable) { panel.hidden = true; const table = options.exportTable(); if (table && typeof AdminTableTools !== 'undefined') AdminTableTools.exportTable(table, options.exportName || 'table', item.dataset.format); }
      });
      panel.addEventListener('input', () => mark(bar)); panel.addEventListener('change', () => mark(bar));
    });
    document.addEventListener('click', event => { if (!bar.contains(event.target)) { bar.querySelectorAll('.cw-tool>div').forEach(p => { p.hidden = true; }); mark(bar); } });
    mark(bar);
    return bar;
  }
  // A tool is highlighted while its popover is open or its controls hold a value.
  function mark(bar) {
    bar.querySelectorAll('.cw-tool').forEach(tool => {
      const panel = tool.querySelector(':scope>div'), button = tool.querySelector('.tool-icon');
      const used = [...panel.querySelectorAll('input,select')].some(c => c.value && !(c.tagName === 'SELECT' && c.value === 'all'));
      button.classList.toggle('active', !panel.hidden); button.classList.toggle('has-query', used);
    });
  }

  /* ---------- Applications ---------- */
  const STATUS = [['pending', 'Pending', 'Waiting for the Dean'], ['approved', 'Approved', 'Signed off by the Dean'], ['rejected', 'Returned', 'Sent back with remarks'], ['withdrawn', 'Withdrawn', 'Pulled back by you']];
  function requests() { try { return ApprovalService.queryFor(session, {}) || []; } catch (_) { try { return DB.read('approvalRequests', []); } catch (__) { return []; } } }
  function applications() {
    const host = document.getElementById('applicationsSection'); if (!host) return;
    host.classList.add('cw-page');
    const tabs = host.querySelector('.application-tabs');
    if (tabs && !host.querySelector('.cw-stats')) {
      tabs.insertAdjacentHTML('beforebegin', '<div class="cw-stats" role="group" aria-label="Request status"></div>');
      host.querySelector('.cw-stats').addEventListener('click', event => {
        const cell = event.target.closest('[data-cw-status]'); const select = document.getElementById('coordinatorRequestStatus'); if (!cell || !select) return;
        select.value = select.value === cell.dataset.cwStatus ? '' : cell.dataset.cwStatus; select.dispatchEvent(new Event('change')); stats(); mark(host.querySelector('.cw-tools'));
      });
    }
    if (tabs && !tabs.querySelector('.cw-tools')) {
      const search = document.getElementById('coordinatorRequestSearch'), status = document.getElementById('coordinatorRequestStatus');
      if (search && status) {
        const label = document.createElement('label'); label.innerHTML = '<span>Status</span>'; label.appendChild(status);
        tabs.appendChild(toolbar([{ name: 'search', label: 'Search requests', icon: ICONS.search, panel: [search] }, { name: 'filter', label: 'Filter by status', icon: ICONS.filter, panel: [label] }]));
        status.addEventListener('change', stats);
      }
    }
    stats();
  }
  function stats() {
    const box = document.querySelector('#applicationsSection .cw-stats'); if (!box) return;
    const all = requests(), chosen = document.getElementById('coordinatorRequestStatus')?.value || '';
    const of = (status, type) => all.filter(r => (status === 'withdrawn' ? ['withdrawn', 'cancelled'].includes(r.status) : r.status === status) && (!type || r.type === type)).length;
    box.innerHTML = STATUS.map(([key, label, sub]) => `<button type="button" class="cw-stat${chosen === key ? ' active' : ''}" data-cw-status="${key}" data-tone="${key}" aria-pressed="${chosen === key}"><span>${label}</span><strong>${of(key)}</strong><small>${of(key, 'role-assignment')} role · ${of(key, 'professor-assignment') + of(key, 'student-enrollment')} subject · ${of(key, 'student-overload') + of(key, 'professor-overload')} load</small><em>${sub}</em></button>`).join('');
  }

  /* ---------- Subject Schedule ---------- */
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i);
  const hourLabel = h => `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}`;
  function scheduleCharts(root) {
    const grid = new Map(DAYS.map(d => [d, HOURS.map(() => 0)])), perDay = new Map(DAYS.map(d => [d, 0]));
    root.querySelectorAll('.subject-week-day[data-calendar-day]').forEach(day => {
      day.querySelectorAll('.subject-calendar-event:not([hidden])').forEach(ev => {
        const m = String(ev.title).match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/); if (!m) return;
        const start = +m[1] * 60 + +m[2], end = +m[3] * 60 + +m[4];
        perDay.set(day.dataset.calendarDay, perDay.get(day.dataset.calendarDay) + 1);
        HOURS.forEach((h, i) => { if (start < (h + 1) * 60 && end > h * 60) grid.get(day.dataset.calendarDay)[i]++; });
      });
    });
    const shown = DAYS.filter(d => d !== 'Sunday' || perDay.get('Sunday'));
    const max = Math.max(1, ...shown.flatMap(d => grid.get(d)));
    let peak = { d: '', h: 0, n: 0 }; shown.forEach(d => grid.get(d).forEach((n, i) => { if (n > peak.n) peak = { d, h: HOURS[i], n }; }));
    const heat = `<div class="cw-heat" style="--cols:${HOURS.length}"><span></span>${HOURS.map(h => `<span class="cw-heat-h">${hourLabel(h)}</span>`).join('')}${shown.map(d => `<span class="cw-heat-d">${d.slice(0, 3)}</span>${grid.get(d).map((n, i) => `<i style="--a:${n ? (0.12 + 0.88 * n / max).toFixed(2) : 0}" title="${d} ${hourLabel(HOURS[i])}–${hourLabel(HOURS[i] + 1)}: ${n} class${n === 1 ? '' : 'es'} meeting"></i>`).join('')}`).join('')}</div><div class="cw-heat-key"><span>Fewer</span><i style="--a:.15"></i><i style="--a:.45"></i><i style="--a:.75"></i><i style="--a:1"></i><span>More</span></div>`;
    const most = Math.max(1, ...shown.map(d => perDay.get(d)));
    const days = shown.map(d => ({ label: d, pct: perDay.get(d) / most * 100, text: String(perDay.get(d)), title: `${d}: ${perDay.get(d)} class meetings` }));
    const p = P();
    return p.insights(p.card('When classes meet', peak.n ? `Busiest: ${peak.d} ${hourLabel(peak.h)}–${hourLabel(peak.h + 1)} with ${peak.n} classes at once` : 'No timed classes in this view', heat), p.card('Classes per day', 'Meetings in the current view', p.bars(days)));
  }
  function schedule() {
    const root = document.getElementById('subjectScheduleRoot'), page = document.getElementById('schedulesSection'); if (!root || !P()) return;
    page?.classList.add('cw-page');
    const tabs = root.querySelector('.subject-schedule-tabs'); if (!tabs) return;
    const refresh = () => { const old = root.querySelector('.ck-insights'); if (!old) return; old.insertAdjacentHTML('beforebegin', scheduleCharts(root)); old.remove(); };
    if (!root.querySelector('.ck-insights')) tabs.insertAdjacentHTML('beforebegin', scheduleCharts(root));
    if (!tabs.querySelector('.cw-tools')) {
      const search = document.getElementById('subjectScheduleSearch'), year = document.getElementById('subjectScheduleYear'), scope = root.querySelector('.subject-calendar-scope');
      const yearLabel = document.createElement('label'); yearLabel.innerHTML = '<span>Year level</span>'; if (year) yearLabel.appendChild(year);
      if (scope) { scope.classList.remove('subject-calendar-scope'); scope.querySelector('span').textContent = 'Calendar section'; }
      tabs.appendChild(toolbar([{ name: 'search', label: 'Search subject, section or professor', icon: ICONS.search, panel: [search] }, { name: 'filter', label: 'Filter by year and section', icon: ICONS.filter, panel: [yearLabel, scope] }, { name: 'export', label: 'Export schedule', icon: ICONS.export }], { exportName: 'subject-schedule', exportTable: () => root.querySelector('.subject-schedule-table')?.cloneNode(true) }));
      root.querySelector('.subject-schedule-tools')?.classList.add('cw-emptied');
      search?.addEventListener('input', () => requestAnimationFrame(refresh)); year?.addEventListener('change', () => requestAnimationFrame(refresh));
    }
  }

  /* ---------- Logs ---------- */
  function events() { try { return AuditLog.queryFor(session) || []; } catch (_) { return []; } }
  const areaOf = item => { try { return coordinatorActivityArea(item); } catch (_) { return item.category || 'other'; } };
  function logCharts() {
    const all = events(), p = P(), now = new Date();
    const weekStart = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
    const first = all.reduce((min, e) => Math.min(min, new Date(e.at).getTime() || min), now.getTime());
    let start = weekStart(Math.min(first, now.getTime() - 11 * 7 * 864e5)); const limit = weekStart(now.getTime() - 25 * 7 * 864e5); if (start < limit) start = limit;
    const weeks = []; for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 7)) weeks.push({ at: new Date(d), n: 0 });
    all.forEach(e => { const t = new Date(e.at).getTime(); const w = weeks.findLast ? weeks.findLast(x => x.at.getTime() <= t) : weeks.filter(x => x.at.getTime() <= t).pop(); if (w) w.n++; });
    const top = Math.max(1, ...weeks.map(w => w.n));
    const columns = `<div class="cw-cols" style="--n:${weeks.length}">${weeks.map(w => `<span title="Week of ${w.at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${w.n} event${w.n === 1 ? '' : 's'}"><i style="height:${w.n ? Math.max(6, w.n / top * 100) : 0}%"></i></span>`).join('')}</div><div class="cw-cols-axis"><span>${weeks[0].at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span>This week</span></div>`;
    const byArea = new Map(); all.forEach(e => { const a = areaOf(e) || 'other'; byArea.set(a, (byArea.get(a) || 0) + 1); });
    const amax = Math.max(1, ...byArea.values());
    const areas = [...byArea.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => ({ label: a.charAt(0).toUpperCase() + a.slice(1), pct: n / amax * 100, text: String(n), title: `${a}: ${n} events` }));
    return p.insights(p.card('Activity per week', `${all.length} events recorded for you`, columns), p.card('By workflow area', 'Where your changes happened', p.bars(areas)));
  }
  const LOG_LABELS = { coordinatorLogFrom: 'From date', coordinatorLogTo: 'To date', coordinatorLogArea: 'Workflow area', coordinatorLogCategory: 'Category', coordinatorLogAction: 'Action', coordinatorLogTarget: 'Target', coordinatorLogResult: 'Result' };
  function logs() {
    const host = document.getElementById('logsSection'); if (!host || !P()) return;
    host.classList.add('cw-page');
    const filters = host.querySelector('.coordinator-log-filters'), table = document.getElementById('coordinatorLogTable'), summary = document.getElementById('coordinatorLogSummary');
    if (!filters || !table) return;
    if (!host.querySelector('.ck-insights')) filters.insertAdjacentHTML('beforebegin', logCharts());
    else { const old = host.querySelector('.ck-insights'); old.insertAdjacentHTML('beforebegin', logCharts()); old.remove(); }
    if (!host.querySelector('.cw-log-card')) {
      const card = document.createElement('section'); card.className = 'cw-log-card';
      const head = document.createElement('header'); head.className = 'cw-log-head';
      const title = document.createElement('div'); title.innerHTML = '<h3>Activity log</h3>'; if (summary) title.appendChild(summary);
      const search = document.getElementById('coordinatorLogSearch');
      const rest = [...filters.children].filter(el => el !== search);
      const fields = rest.map(el => { if (el.tagName === 'BUTTON') { el.classList.add('cw-reset'); return el; } const label = document.createElement('label'); label.innerHTML = `<span>${esc(LOG_LABELS[el.id] || el.getAttribute('aria-label') || 'Filter')}</span>`; label.appendChild(el); return label; });
      const bar = toolbar([{ name: 'search', label: 'Search activity', icon: ICONS.search, panel: [search] }, { name: 'filter', label: 'Filter activity', icon: ICONS.filter, panel: fields }, { name: 'export', label: 'Export activity', icon: ICONS.export }], { exportName: 'coordinator-activity', exportTable: () => table.querySelector('table') });
      head.append(title, bar); card.append(head, table); filters.after(card); filters.classList.add('cw-emptied');
      bar.querySelector('.cw-reset')?.addEventListener('click', () => setTimeout(() => mark(bar), 0));
    }
  }

  /* ---------- wiring ---------- */
  function refreshAll() { try { applications(); } catch (e) { console.warn(e); } try { schedule(); } catch (e) { console.warn(e); } try { logs(); } catch (e) { console.warn(e); } }
  function mount() {
    refreshAll();
    const watch = (el, fn, opts) => el && new MutationObserver(() => requestAnimationFrame(fn)).observe(el, opts);
    watch(document.getElementById('subjectScheduleRoot'), schedule, { childList: true });
    watch(document.getElementById('assignmentRequestList'), stats, { childList: true });
    watch(document.getElementById('overloadRequestList'), stats, { childList: true });
    let logPending = false;
    watch(document.getElementById('coordinatorLogTable'), () => { if (logPending) return; logPending = true; setTimeout(() => { logPending = false; logs(); }, 0); }, { childList: true });
  }
  return { mount, refresh: refreshAll, toolbar, mark, ICONS };
})();
if (typeof window !== 'undefined') window.CoordinatorWorkspaces = CoordinatorWorkspaces;
