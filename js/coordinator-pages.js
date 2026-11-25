/* ==================================================================
   Coordinator Section / Professor / Student Management: two charts
   side by side above each table, the table in the shared card style
   (initials, load bars, table tools). Works on top of the existing
   renderers: it re-applies itself whenever a page re-renders and keeps
   every existing search, filter and row action.
   ================================================================== */
const CoordinatorPages = (() => {
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const COLORS = ['var(--role-shell-role)', 'var(--role-shell-yellow)', '#2f8d83', '#7560ad', '#b5534b', '#c8692e'];
  const cell = (row, i) => { const c = row.cells[i]; if (!c) return ''; const named = c.querySelector('.ck-person>span:last-child'); return (named || c).textContent.trim(); };
  const ratio = text => { const m = String(text).match(/(\d+)\s*\/\s*(\d+)/); return m ? [Number(m[1]), Number(m[2])] : null; };
  const initials = name => { const parts = String(name).split(',').map(p => p.trim()); const last = parts[0] || '', first = parts[1] || ''; return `${first[0] || ''}${last[0] || ''}`.toUpperCase(); };

  /* ---------- chart pieces ---------- */
  function bars(rows) {
    if (!rows.length) return '<p class="ck-empty">Nothing to show yet.</p>';
    return `<div class="ck-bars">${rows.map(r => `<div class="ck-bar" title="${esc(r.title || '')}"><span>${esc(r.label)}</span><i><b class="${r.tone || ''}" style="width:${Math.max(2, Math.min(100, r.pct))}%${r.color ? `;background:${r.color}` : ''}"></b></i><em>${esc(r.text)}</em></div>`).join('')}</div>`;
  }
  function donut(parts, center) {
    const total = parts.reduce((s, p) => s + p.value, 0), r = 46, c = 2 * Math.PI * r; let off = 0;
    const arcs = parts.filter(p => p.value).map((p, i) => { const len = total ? p.value / total * c : 0, arc = `<circle r="${r}" cx="60" cy="60" fill="none" stroke="${p.color || COLORS[i % COLORS.length]}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`; off += len; return arc; }).join('');
    return `<div class="ck-donut"><svg viewBox="0 0 120 120" aria-hidden="true"><circle r="${r}" cx="60" cy="60" fill="none" class="ck-track" stroke-width="16"/>${arcs}<text x="60" y="58" text-anchor="middle">${total}</text><text x="60" y="74" text-anchor="middle" class="ck-sub">${esc(center)}</text></svg><ul>${parts.map((p, i) => `<li><i style="background:${p.color || COLORS[i % COLORS.length]}"></i>${esc(p.label)}<b>${p.value}</b></li>`).join('')}</ul></div>`;
  }
  const card = (title, sub, body) => `<section class="ck-card"><header><h3>${esc(title)}</h3>${sub ? `<p>${esc(sub)}</p>` : ''}</header>${body}</section>`;
  const insights = (a, b) => `<div class="ck-insights">${a}${b}</div>`;

  /* ---------- per page ---------- */
  const PAGES = {
    sectionManagementSection: {
      table: '#coordinatorSectionTable', summary: '.section-summary', head: '.section-workspace-head', toolsAt: '.section-table-tools', search: '#sectionSearch', key: 'coordinator-sections', exportName: 'sections', add: () => document.querySelector('#sectionManagementSection .section-add')?.textContent.replace(/[＋+]/g, '').trim() || 'Add section', addButton: '.section-add',
      charts(rows) {
        const byProgram = new Map(), byYear = new Map();
        rows.forEach(r => { const p = cell(r, 2), y = cell(r, 1), [n, cap] = ratio(cell(r, 4)) || [0, 0]; const e = byProgram.get(p) || { n: 0, cap: 0, count: 0 }; e.n += n; e.cap += cap; e.count++; byProgram.set(p, e); byYear.set(y, (byYear.get(y) || 0) + 1); });
        const a = [...byProgram.entries()].sort((x, y) => (y[1].n / y[1].cap) - (x[1].n / x[1].cap)).map(([p, e]) => { const pct = e.cap ? e.n / e.cap * 100 : 0; return { label: p, pct, text: `${Math.round(pct)}%`, tone: pct >= 100 ? 'over' : pct >= 90 ? 'high' : '', title: `${p}: ${e.n} of ${e.cap} seats in ${e.count} sections` }; });
        const b = [...byYear.entries()].sort((x, y) => Number(x[0]) - Number(y[0])).map(([y, v]) => ({ label: `Year ${y}`, value: v }));
        return insights(card('Seats filled by program', 'Students placed against total section capacity', bars(a)), card('Sections by year level', `${rows.length} sections`, donut(b, 'sections')));
      },
      row(r) { const td = r.cells[4], v = ratio(td?.textContent); if (td && v && !td.querySelector('.ck-mini')) { const pct = v[1] ? v[0] / v[1] * 100 : 0; td.insertAdjacentHTML('beforeend', `<i class="ck-mini"><b class="${pct >= 100 ? 'over' : pct >= 90 ? 'high' : ''}" style="width:${Math.min(100, pct)}%"></b></i>`); } }
    },
    professorManagementSection: {
      table: '#coordinatorProfessorTable', summary: '.professor-summary', head: '.professor-workspace-head', key: null,
      charts(rows) {
        const loads = rows.map(r => ({ name: cell(r, 1), v: ratio(cell(r, 2)) || [0, 0] }));
        const status = { Over: 0, Full: 0, Light: 0, None: 0 };
        loads.forEach(l => { const [n, cap] = l.v; status[!n ? 'None' : n > cap ? 'Over' : n >= cap * .75 ? 'Full' : 'Light']++; });
        const a = [{ label: 'Overloaded', value: status.Over, color: '#b5534b' }, { label: 'Full load (75%+)', value: status.Full, color: 'var(--role-shell-role)' }, { label: 'Light load', value: status.Light, color: 'var(--role-shell-yellow)' }, { label: 'No load', value: status.None, color: '#8a8f99' }];
        const top = loads.slice().sort((x, y) => y.v[0] - x.v[0]).slice(0, 8).map(l => { const pct = l.v[1] ? l.v[0] / l.v[1] * 100 : 0; return { label: l.name, pct: Math.min(100, pct), text: `${l.v[0]}/${l.v[1]}`, tone: l.v[0] > l.v[1] ? 'over' : '', title: `${l.name}: ${l.v[0]} of ${l.v[1]} units` }; });
        const most = Math.max(1, ...a.map(x => x.value));
        const statusBars = a.map(x => ({ label: x.label, pct: x.value ? x.value / most * 100 : 0, text: String(x.value), color: x.color, title: `${x.label}: ${x.value} of ${rows.length} professors` }));
        return insights(card('Load status', `${rows.length} professors`, bars(statusBars)), card('Heaviest loads', 'Units taken against the normal load', bars(top)));
      },
      row(r) {
        const name = r.cells[1]; if (name && !name.querySelector('.ck-avatar')) name.innerHTML = `<span class="ck-person"><span class="ck-avatar">${esc(initials(name.textContent))}</span><span>${esc(name.textContent.trim())}</span></span>`;
        const td = r.cells[2], v = ratio(td?.textContent); if (td && v && !td.querySelector('.ck-mini')) td.insertAdjacentHTML('beforeend', `<i class="ck-mini"><b class="${v[0] > v[1] ? 'over' : ''}" style="width:${Math.min(100, v[1] ? v[0] / v[1] * 100 : 0)}%"></b></i>`);
      }
    },
    offeringsSection: {
      table: '#coordinatorStudentTable', summary: null, head: '.student-management-head', toolsAt: '.student-management-tools', search: '#coordinatorStudentTable', key: 'coordinator-students', exportName: 'students',
      charts(rows) {
        const byProgram = new Map(), load = { '0': 0, '1–2': 0, '3–5': 0, '6+': 0 };
        rows.forEach(r => { const p = cell(r, 2) || '—'; byProgram.set(p, (byProgram.get(p) || 0) + 1); const n = Number(cell(r, 5)) || 0; load[n === 0 ? '0' : n <= 2 ? '1–2' : n <= 5 ? '3–5' : '6+']++; });
        const max = Math.max(1, ...byProgram.values());
        const a = [...byProgram.entries()].sort((x, y) => y[1] - x[1]).map(([p, v]) => ({ label: p, pct: v / max * 100, text: String(v), title: `${p}: ${v} students` }));
        const b = Object.entries(load).map(([label, value], i) => ({ label: `${label} subjects`, value, color: ['#8a8f99', 'var(--role-shell-yellow)', 'var(--role-shell-role)', '#2f8d83'][i] }));
        return insights(card('Students by program', `${rows.length} students`, bars(a)), card('Active subject load', 'Subjects each student is enrolled in this period', donut(b, 'students')));
      },
      row(r) { const name = r.cells[1]; if (name && !name.querySelector('.ck-avatar')) name.innerHTML = `<span class="ck-person"><span class="ck-avatar">${esc(initials(name.textContent))}</span><span>${esc(name.textContent.trim())}</span></span>`; }
    }
  };

  function decorate(id) {
    const page = PAGES[id], host = document.getElementById(id), table = host?.querySelector(page.table);
    if (!table) return;
    host.classList.add('ck-page');
    const rows = [...table.querySelectorAll('tbody tr')].filter(r => r.cells.length > 2 && !r.classList.contains('table-group-row'));
    rows.forEach(r => page.row(r));
    if (!host.querySelector('.ck-insights')) {
      const anchor = (page.summary && host.querySelector(page.summary)) || (page.toolsAt && host.querySelector(page.toolsAt)) || table.closest('[class*="table-shell"]') || table;
      anchor.insertAdjacentHTML('beforebegin', page.charts(rows));
    }
    // Section and Student Management get the shared table tools beside their search and filter.
    const toolsAt = page.toolsAt && host.querySelector(page.toolsAt);
    if (page.key && toolsAt && !toolsAt.querySelector('.ck-tools') && typeof AdminTableTools !== 'undefined') {
      toolsAt.insertAdjacentHTML('beforeend', '<div class="ck-tools role-table-tools"></div>');
      const tools = toolsAt.querySelector('.ck-tools');
      AdminTableTools.mount(page.key, table, tools, { exportName: page.exportName || page.key, add: page.add ? { label: typeof page.add === 'function' ? page.add() : page.add, onClick: () => host.querySelector(page.addButton)?.click() } : null });
      // Re-apply the page's own search/filter after sorting or grouping.
      const refilter = () => setTimeout(() => toolsAt.querySelector('input[type="search"],input:not([type])')?.dispatchEvent(new Event('input')), 0);
      tools.addEventListener('click', refilter); tools.addEventListener('change', refilter);
    }
  }

  let pending = false;
  function schedule() { if (pending) return; pending = true; (window.requestAnimationFrame || setTimeout)(() => { pending = false; Object.keys(PAGES).forEach(decorate); }); }
  function mount() {
    Object.keys(PAGES).forEach(id => { const host = document.getElementById(id); if (host) new MutationObserver(schedule).observe(host, { childList: true, subtree: true }); });
    schedule();
  }
  return { mount, refresh: schedule, bars, donut, card, insights };
})();
