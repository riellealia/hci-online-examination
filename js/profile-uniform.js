/* ==================================================================
   Profiles open the same way everywhere: click a person's row.
   - Admin Faculty / Students: left click opens the existing profile
     (the row menu still opens on right click).
   - Dean Members: opens a Professor / Coordinator profile in the shared
     profile popup (role-profile classes), in the Dean's colors.
   ================================================================== */
const ProfileUniform = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const read = (k, f = []) => { try { return DB.read(k, f) ?? f; } catch (_) { return f; } };
  const ignore = t => t.closest('button,a,input,select,label,summary,details,.section-action-menu,.section-action-trigger');

  /* ---------- Admin: left click opens the row's profile ---------- */
  function adminRows() {
    [['facultyTable', 'Profile'], ['studentTable', 'Profile']].forEach(([id]) => {
      const table = document.getElementById(id); if (!table || table.dataset.puBound) return; table.dataset.puBound = '1';
      table.addEventListener('click', e => {
        const row = e.target.closest('tbody tr'); if (!row || ignore(e.target) || row.classList.contains('table-group-row')) return;
        const open = [...row.querySelectorAll('[onclick]')].find(b => /open(Faculty|Student)Profile\(/.test(b.getAttribute('onclick')));
        if (open) { open.click(); return; }
        // Rows that open their own window (Admin students → Student administration) must not open a second one.
        if (row.hasAttribute('onclick')) return;
        const id = row.cells[0]?.textContent.trim();
        if (table.id === 'facultyTable' && typeof openFacultyProfile === 'function' && typeof faculty !== 'undefined') { const i = faculty.findIndex(f => f.id === id); if (i >= 0) openFacultyProfile(i); }
        if (table.id === 'studentTable' && typeof openStudentProfile === 'function' && typeof students !== 'undefined') { const i = students.findIndex(s => s.id === id); if (i >= 0) openStudentProfile(i); }
      });
    });
  }

  /* ---------- Shared popup (same markup as RoleProfileViewer) ---------- */
  let current = null;
  function host() {
    let h = document.getElementById('puOverlay'); if (h) return h;
    h = document.createElement('div'); h.id = 'puOverlay'; h.className = 'role-profile-overlay'; h.setAttribute('role', 'dialog'); h.setAttribute('aria-modal', 'true');
    h.addEventListener('click', e => { if (e.target === h || e.target.closest('[data-pu-close]')) close(); const t = e.target.closest('[data-pu-tab]'); if (t && current) { current.tab = t.dataset.puTab; draw(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && h.classList.contains('open')) close(); });
    document.body.appendChild(h); return h;
  }
  function close() { document.getElementById('puOverlay')?.classList.remove('open'); document.body.classList.remove('profile-view-open'); current = null; }
  function draw() {
    const h = host(), p = current; if (!p) return;
    const tab = p.tabs.find(t => t.id === p.tab) || p.tabs[0];
    h.setAttribute('aria-label', p.name);
    h.innerHTML = `<article class="role-profile-page"><header class="role-profile-head"><div class="role-profile-avatar">${esc(p.initials)}</div><div><small>${esc(p.eyebrow)}</small><h2>${esc(p.name)}</h2><p>${esc(p.meta)}</p></div><button type="button" class="role-profile-close" data-pu-close aria-label="Close profile">×</button></header><nav class="role-profile-tabs" aria-label="Profile sections">${p.tabs.map(t => `<button type="button" data-pu-tab="${t.id}" class="${t.id === tab.id ? 'active' : ''}" aria-pressed="${t.id === tab.id}">${esc(t.label)}</button>`).join('')}</nav><main class="role-profile-content">${tab.render()}</main></article>`;
    h.classList.add('open'); document.body.classList.add('profile-view-open');
    h.querySelector('.role-profile-close')?.focus();
  }
  function open(profile) { current = { ...profile, tab: profile.tabs[0].id }; draw(); }

  /* ---------- Dean: member profile ---------- */
  function memberProfile(id) {
    const faculty = read('faculty'), person = faculty.find(f => f.id === id) || read('coordinators').find(c => (c.id || c.username) === id);
    if (!person) return;
    const coordinators = new Set(read('coordinators').map(c => c.id || c.username)), isCoord = coordinators.has(id);
    const subjects = read('subjects'), units = c => Number(subjects.find(s => s.code === c)?.units) || 3;
    const offers = read('sectionSubjects').flatMap(r => (r.assignments || []).map(a => ({ ...a, sectionId: r.sectionId }))).filter(o => o.facultyId === id);
    const load = offers.reduce((s, o) => s + units(o.subjectCode), 0), max = Number((read('systemSettings', {}) || {}).professorLoadPolicy?.maximum) || 24;
    const exams = read('exams').filter(e => e.facultyId === id), examIds = new Set(exams.map(e => e.id));
    const subs = read('studentSubmissions').filter(s => examIds.has(s.examId) && Number(s.total) > 0);
    const pct = s => (s.answers || []).reduce((t, a) => t + (Number(a.awarded) || 0), 0) / Number(s.total) * 100;
    const avg = subs.length ? subs.reduce((t, s) => t + pct(s), 0) / subs.length : null;
    const passed = subs.filter(s => pct(s) >= (Number(exams.find(e => e.id === s.examId)?.passingPercent) || 70)).length;
    const students = new Set(read('studentEnrollments').filter(en => offers.some(o => o.sectionId === en.sectionId && o.subjectCode === en.subjectCode)).map(en => en.studentId));
    const name = `${person.first || ''} ${person.last || ''}`.trim() || id;
    const stats = [[`${load}/${max}`, 'Teaching units'], [String(offers.length), 'Classes'], [students.size.toLocaleString(), 'Students'], [avg === null ? '—' : `${avg.toFixed(1)}%`, 'Exam average']];
    const statHtml = `<div class="rp-stats">${stats.map(([v, l]) => `<div><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`).join('')}</div>`;
    const loadBar = `<section class="rp-card"><header><h3>Teaching load</h3><span>${load > max ? 'Overloaded' : load >= max * .75 ? 'Full load' : load ? 'Light load' : 'No classes'}</span></header><div class="pu-load"><i><b class="${load > max ? 'over' : ''}" style="width:${Math.min(100, load / max * 100)}%"></b></i><strong>${load} / ${max} units</strong></div></section>`;
    const classRows = offers.map(o => `<tr><td><strong>${esc(o.subjectCode)}</strong><small>${esc(subjects.find(s => s.code === o.subjectCode)?.name || '')}</small></td><td>${esc(o.sectionId)}</td><td>${units(o.subjectCode)}</td><td>${esc((o.schedule?.days || []).join(', ') || '—')} ${esc(o.schedule?.start || '')}</td></tr>`).join('');
    const classes = `<section class="rp-card"><header><h3>Classes this period</h3></header><div class="rp-table"><table><thead><tr><th>Subject</th><th>Section</th><th>Units</th><th>Schedule</th></tr></thead><tbody>${classRows || '<tr><td colspan="4" class="rp-empty">No classes assigned.</td></tr>'}</tbody></table></div></section>`;
    const examRows = exams.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).map(e => { const es = subs.filter(s => s.examId === e.id), a = es.length ? es.reduce((t, s) => t + pct(s), 0) / es.length : null; return `<tr><td><strong>${esc(e.title)}</strong><small>${esc(e.subjectCode)}</small></td><td>${esc(e.date || 'Always open')}</td><td>${es.length}</td><td>${a === null ? '—' : `${a.toFixed(1)}%`}</td></tr>`; }).join('');
    const examTable = `<section class="rp-card"><header><h3>Examinations</h3><span>${subs.length ? `${Math.round(passed / subs.length * 100)}% passed` : 'No results yet'}</span></header><div class="rp-table"><table><thead><tr><th>Exam</th><th>Date</th><th>Submissions</th><th>Average</th></tr></thead><tbody>${examRows || '<tr><td colspan="4" class="rp-empty">No examinations yet.</td></tr>'}</tbody></table></div></section>`;
    const info = `<section class="rp-card"><header><h3>Basic information</h3></header><dl class="rp-info">${[['Full name', name], ['Institutional ID', id], ['Role', isCoord ? 'Faculty Coordinator' : 'Professor'], ['Program', person.program || 'CICS'], ['College', person.college || 'College of Information and Computer Studies']].map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`;
    open({ initials: `${(person.first || '')[0] || ''}${(person.last || '')[0] || ''}`.toUpperCase(), eyebrow: isCoord ? 'Faculty Coordinator profile' : 'Professor profile', name, meta: `${id} · ${person.program || 'CICS'}`,
      tabs: [{ id: 'overview', label: 'Overview', render: () => statHtml + loadBar + info }, { id: 'classes', label: 'Classes', render: () => classes }, { id: 'exams', label: 'Examinations', render: () => examTable }] });
  }
  function deanRows() {
    const table = document.getElementById('deanPersonnelTable'); if (!table || table.dataset.puBound) return; table.dataset.puBound = '1';
    table.addEventListener('click', e => { const row = e.target.closest('tbody tr[data-id]'); if (!row || ignore(e.target)) return; memberProfile(row.dataset.id); });
  }

  function bind() { adminRows(); deanRows(); }
  let mounted = false;
  function mount() {
    if (mounted) return; mounted = true;
    bind();
    new MutationObserver(() => { clearTimeout(mount.t); mount.t = setTimeout(bind, 50); }).observe(document.body, { childList: true, subtree: true });
  }
  return { mount, open, close, memberProfile };
})();
if (typeof window !== 'undefined') { window.ProfileUniform = ProfileUniform; document.addEventListener('DOMContentLoaded', () => ProfileUniform.mount()); if (document.readyState !== 'loading') setTimeout(() => ProfileUniform.mount(), 0); }
