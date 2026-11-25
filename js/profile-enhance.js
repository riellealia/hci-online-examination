/* ==================================================================
   Easier Admin profile popups (student administration, student and
   faculty profiles): icons on the tabs, a quick-facts strip under the
   banner, and clearer subject tables (code chip, section pill,
   professor with initials). Purely visual; every existing handler and
   action keeps working.
   ================================================================== */
const ProfileEnhance = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, f = []) => { try { return DB.read(k, f) ?? f; } catch (_) { return f; } };
  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    subjects: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm2 2v11a1 1 0 0 0 1 1h9V7a1 1 0 0 0-1-1H7Z', assignments: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Zm2 2v11a1 1 0 0 0 1 1h9V7a1 1 0 0 0-1-1H7Z',
    overview: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z', history: 'M13 3a9 9 0 1 1-8.5 6H7a7 7 0 1 0 6-4V3Zm-1 5h2v4.6l3 1.8-1 1.7-4-2.4V8ZM3 4l4 1-1 4-3-5Z',
    grades: 'M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z', activity: 'M3 12h4l3-8 4 16 3-8h4v2h-2.6L14 22l-4-16-1.6 6H3v-2Z', actions: 'M3 12h4l3-8 4 16 3-8h4v2h-2.6L14 22l-4-16-1.6 6H3v-2Z',
    login: 'M10 17v-3H3v-4h7V7l5 5-5 5Zm2-14h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7v-2h7V5h-7V3Z', performance: 'M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z'
  };
  const iconFor = tab => { const key = Object.keys(ICON).find(k => (tab.dataset.commandTab || tab.dataset.profileTab || tab.dataset.facultyTab || tab.textContent).toLowerCase().includes(k)); return key ? ICON[key] : ICON.overview; };

  function tabs(modal) {
    modal.querySelectorAll('.profile-tab').forEach(tab => { if (tab.querySelector('svg')) return; tab.insertAdjacentHTML('afterbegin', svg(iconFor(tab))); });
  }
  // Quick facts under the banner for a student modal.
  function facts(modal) {
    const meta = modal.querySelector('.student-profile-head p:not(.profile-eyebrow)')?.textContent || '', id = (meta.match(/\d{4}-\d{5}/) || [])[0];
    const student = id && read('students').find(s => s.id === id); if (!student) return;
    const sections = read('sections'), sec = (student.sections || []).map(x => sections.find(s => s.id === x)).find(Boolean);
    const enr = read('studentEnrollments').filter(e => e.studentId === id), subs = read('subjects'), units = enr.reduce((t, e) => t + (Number(subs.find(s => s.code === e.subjectCode)?.units) || 0), 0);
    const items = [['Program', sec?.program || '—'], ['Year', sec?.yearLevel ? `Year ${sec.yearLevel}` : '—'], ['Section', (student.sections || []).join(', ') || '—'], ['Subjects', String(new Set(enr.map(e => e.subjectCode)).size)], ['Units', String(units)]];
    // Rebuilt when the numbers change (e.g. after saving subjects); untouched otherwise, so observers do not loop.
    const inner = items.map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join(''), existing = modal.querySelector('.pe-facts');
    if (existing) { if (existing.innerHTML !== inner) existing.innerHTML = inner; return; }
    modal.querySelector('.profile-tabs')?.insertAdjacentHTML('beforebegin', `<div class="pe-facts">${inner}</div>`);
  }
  // Subject rows: code chip, section pill, professor with initials.
  function rows(modal) {
    modal.querySelectorAll('.student-profile-page>main table tbody tr').forEach(tr => {
      if (tr.dataset.pe || tr.cells.length < 2) return; tr.dataset.pe = '1';
      const first = tr.cells[0], code = first.querySelector('strong');
      if (code && /^[A-Z]{2,6}\d{2,4}$/.test(code.textContent.trim())) code.classList.add('pe-code');
      [...tr.cells].forEach(td => {
        const own = [...td.childNodes].filter(n => n.nodeType === 3 || (n.nodeType === 1 && !n.matches('.section-action-wrap,.admin-row-action'))), text = own.map(n => n.textContent).join('').trim();
        if (/^\d[A-Z]{2,}[A-Z0-9]*-\d+$/.test(text)) { own.forEach(n => n.remove()); td.insertAdjacentHTML('afterbegin', `<span class="pe-section">${esc(text)}</span>`); }
        else if (/^Prof\.\s/.test(text)) { const name = text.replace(/^Prof\.\s*/, ''), ini = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase(); own.forEach(n => n.remove()); td.insertAdjacentHTML('afterbegin', `<span class="pe-prof"><i>${esc(ini)}</i>${esc(name)}</span>`); }
        else if (/^No professor/i.test(text)) { own.forEach(n => n.remove()); td.insertAdjacentHTML('afterbegin', `<span class="pe-missing">No professor yet</span>`); }
      });
    });
  }
  function enhance() { document.querySelectorAll('.student-profile-bg').forEach(m => { if (!m.offsetParent && getComputedStyle(m).display === 'none') return; tabs(m); facts(m); rows(m); }); }
  let queued = false;
  function mount() { new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; enhance(); }); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] }); enhance(); }
  return { mount, enhance };
})();
if (typeof window !== 'undefined') { window.ProfileEnhance = ProfileEnhance; if (document.readyState !== 'loading') ProfileEnhance.mount(); else document.addEventListener('DOMContentLoaded', () => ProfileEnhance.mount()); }
