/* ==================================================================
   Course editor (Professor › subject › Edit week).
   Large window, two columns:
   - left: the item picked in Contents — a week (title, description) or a
     content cell (one-line title, kind, rich text editor, link).
   - right: Contents — every week with its cells, collapsible; long-press
     a row to drag it (a week moves with all its cells; a cell can move
     to another week).
   Footer (bottom right): Add exam · Settings · Options ⋮ · Cancel · Save.
   CourseEditor.open({ subjectCode, week, api }) — api supplies
   readContent, writeContent, exams, facultyId, log, render, pickExam.
   ================================================================== */
const CourseEditor = (() => {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ICON = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    chevron: I('M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6-1.4-1.4Z'),
    week: I('M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10Z'),
    text: I('M14 17H4v2h10v-2Zm6-8H4v2h16V9ZM4 15h16v-2H4v2ZM4 5v2h16V5H4Z'),
    link: I('M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12ZM8 13h8v-2H8v2Zm9-6h-4v1.9h4a3.1 3.1 0 0 1 0 6.2h-4V17h4a5 5 0 0 0 0-10Z'),
    exam: I('M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm2 14H7v-2h7v2Zm3-4H7v-2h10v2Zm0-4H7V7h10v2Z'),
    file: I('M16.5 6v11.5a4 4 0 0 1-8 0V5a2.5 2.5 0 0 1 5 0v10.5a1 1 0 0 1-2 0V6H10v9.5a2.5 2.5 0 0 0 5 0V5a4 4 0 0 0-8 0v12.5a5.5 5.5 0 0 0 11 0V6h-1.5Z'),
    grip: I('M9 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm0 7a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM18 5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm-1.5 8.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM18 19a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z'),
    addExam: I('M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.1a6 6 0 0 1-.1-1 6 6 0 0 1 9-5.2V5a2 2 0 0 0-2-2ZM7 7h10v2H7V7Zm0 4h6v2H7v-2Zm12 4v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z'),
    settings: I('M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5-2.1-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z'),
    dots: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5.5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="18.5" r="1.8"/></svg>',
    plus: I('M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z'),
    copy: I('M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z'),
    trash: I('M8 5V3h8v2h5v2H3V5h5Zm-2 4h12l-1 12H7L6 9Z')
  };
  const kindIcon = c => ICON[c.type === 'link' ? 'link' : c.type === 'exam' ? 'exam' : c.type === 'file' ? 'file' : 'text'];
  const LONG_PRESS = 420;

  const toLocal = ms => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  // Older cells: "requiresPrevious" and "opens + duration" become the new prerequisite / expiry rules.
  function normalise(i) {
    const out = { ...i, html: i.bodyHtml ? RichText.sanitize(i.bodyHtml) : RichText.fromMarkdown(i.body || '') };
    out.prerequisite = i.prerequisite || (i.requiresPrevious ? { type: 'previous' } : null);
    out.sectionIds = Array.isArray(i.sectionIds) ? i.sectionIds.map(String) : [];
    if (!i.expiresAt && i.availability === 'scheduled' && i.openAt && Number(i.durationMinutes) > 0) { const t = new Date(i.openAt).getTime(); if (isFinite(t)) out.expiresAt = toLocal(t + Number(i.durationMinutes) * 60000); }
    out.openAt = i.availability === 'scheduled' ? i.openAt || '' : '';
    return out;
  }
  const hasRules = c => !!((c.prerequisite && c.prerequisite.type !== 'previous') || c.sectionIds?.length || c.openAt || c.expiresAt || c.availability === 'locked');

  function open({ subjectCode, week: startWeek, cellId, newCell, api }) {
    // ---------- model ----------
    const all = api.readContent(), mine = all.filter(i => i.subjectCode === subjectCode);
    const ordered = mine.map((item, index) => ({ item, index })).sort((a, b) => a.item.week - b.item.week || (a.item.order ?? 1e9) - (b.item.order ?? 1e9) || a.index - b.index).map(x => x.item);
    if (cellId) startWeek = ordered.find(i => i.id === cellId)?.week ?? startWeek;
    let weeks = [...new Set(ordered.map(i => i.week))].map(w => { const cells = ordered.filter(i => i.week === w).map(normalise); return { key: `w${w}`, title: cells[0]?.weekTitle || `Week ${w}`, description: cells[0]?.weekDescription || '', collapsed: w !== startWeek, cells }; });
    if (startWeek && !weeks.some(w => w.key === `w${startWeek}`)) weeks.push({ key: `w${startWeek}`, title: `Week ${weeks.length + 1}`, description: '', collapsed: false, cells: [] });
    let selected = cellId && ordered.some(i => i.id === cellId) ? { kind: 'cell', key: cellId } : { kind: 'week', key: `w${startWeek}` }, dirty = false, nextId = 0, editor = null;
    const findWeek = key => weeks.find(w => w.key === key), findCell = id => { for (const w of weeks) { const c = w.cells.find(x => x.id === id); if (c) return { week: w, cell: c }; } return null; };
    const weekNo = w => weeks.indexOf(w) + 1;

    // ---------- shell ----------
    const bg = document.createElement('div'); bg.className = 'modal-bg confirm-bg ce-bg'; bg.style.display = 'flex';
    bg.innerHTML = `<div class="modal ce" role="dialog" aria-modal="true" aria-labelledby="ceTitle">
      <header class="ce-head"><div><p class="ce-eyebrow">Course content · ${esc(subjectCode)}</p><h3 id="ceTitle">Edit course</h3></div><button type="button" class="pf-head-btn ce-close" aria-label="Close" title="Close">${ICON.close}</button></header>
      <div class="ce-body"><main class="ce-main"></main><aside class="ce-toc" aria-label="Table of contents"><div class="ce-toc-head"><strong>Contents</strong><small>Long-press an item to drag it</small></div><div class="ce-toc-list" role="tree"></div></aside></div>
      <footer class="ce-foot"><span class="ce-status"></span><div class="ce-actions">
        <div class="ce-options"><button type="button" class="ce-tool" data-ce="exam-menu" title="Add an exam to this week" aria-haspopup="menu">${ICON.addExam}<span>Add exam</span></button><nav class="ra-menu ce-menu ce-exam-menu" role="menu" hidden><button type="button" role="menuitem" data-ce="exam">${ICON.exam}<span>Attach existing exam<small>Pick one already made for this subject</small></span></button><button type="button" role="menuitem" data-ce="exam-new">${ICON.plus}<span>Create a new exam<small>Opens the exam builder, then adds it here</small></span></button></nav></div>
        <button type="button" class="ce-tool" data-ce="settings" title="Prerequisites, sections, opening and expiry for this page" aria-haspopup="dialog">${ICON.settings}<span>Settings</span></button>
        <div class="ce-options"><button type="button" class="ce-tool ce-icon" data-ce="options" aria-label="More options" title="More options" aria-haspopup="menu">${ICON.dots}</button><nav class="ra-menu ce-menu" role="menu" hidden>
          <button type="button" role="menuitem" data-ce="add-cell">${ICON.plus}<span>Add content cell</span></button>
          <button type="button" role="menuitem" data-ce="add-week">${ICON.week}<span>Add week</span></button>
          <button type="button" role="menuitem" data-ce="duplicate">${ICON.copy}<span>Duplicate cell</span></button>
          <button type="button" role="menuitem" class="danger" data-ce="delete">${ICON.trash}<span>Delete selected</span></button></nav></div>
        <span class="ce-sep" aria-hidden="true"></span>
        <button type="button" class="confirm-cancel" data-ce="cancel">Cancel</button><button type="button" class="confirm-ok" data-ce="save">Save changes</button>
      </div></footer></div>`;
    document.body.appendChild(bg);
    const $ = s => bg.querySelector(s), main = $('.ce-main'), tocList = $('.ce-toc-list'), menu = $('.ce-menu:not(.ce-exam-menu)'), examMenu = $('.ce-exam-menu');
    const setStatus = () => { $('.ce-status').textContent = dirty ? 'Unsaved changes' : 'All changes saved when you press Save'; };
    const touch = () => { dirty = true; setStatus(); };

    // ---------- left: the selected item ----------
    function commit() {
      if (selected.kind === 'week') { const w = findWeek(selected.key); if (!w) return; w.title = main.querySelector('[name=weekTitle]')?.value.trim() || w.title; w.description = main.querySelector('[name=weekDescription]')?.value ?? w.description; return; }
      const hit = findCell(selected.key); if (!hit) return; const c = hit.cell;
      const v = n => main.querySelector(`[name=${n}]`);
      c.title = v('title')?.value.trim() ?? c.title;
      if (v('type')) c.type = v('type').value;
      if (editor) c.html = editor.getHtml();
      if (v('url')) c.url = v('url').value.trim();
    }
    function renderMain() {
      editor = null;
      if (selected.kind === 'week') {
        const w = findWeek(selected.key); if (!w) { main.innerHTML = '<p class="profile-empty">Pick an item in Contents.</p>'; return; }
        main.innerHTML = `<p class="ce-crumb">Week ${weekNo(w)}</p><label class="ce-field"><span>Week title</span><input name="weekTitle" type="text" maxlength="120"></label><label class="ce-field ce-grow"><span>Description</span><textarea name="weekDescription" placeholder="What will students learn this week?"></textarea></label><p class="ce-hint">${w.cells.length} item${w.cells.length === 1 ? '' : 's'} this week. Pick one in Contents to edit it.</p>`;
        main.querySelector('[name=weekTitle]').value = w.title; main.querySelector('[name=weekDescription]').value = w.description;
      } else {
        const hit = findCell(selected.key); if (!hit) { selected = { kind: 'week', key: weeks[0]?.key }; return renderMain(); }
        const { week: w, cell: c } = hit, special = c.type === 'exam' || c.type === 'file';
        main.innerHTML = `<p class="ce-crumb">Week ${weekNo(w)} · ${esc(w.title)}</p>
          <div class="ce-row"><label class="ce-field ce-title"><span>Title</span><input name="title" type="text" maxlength="160" placeholder="Cell title"></label>${special ? '' : `<label class="ce-field ce-kind"><span>Kind</span><select name="type"><option value="text">Content</option><option value="link">External link</option></select></label>`}</div>
          ${special ? `<div class="ce-attached">${kindIcon(c)}<span><strong>${esc(c.type === 'exam' ? 'Attached exam' : 'Attached file')}</strong><small>${esc(c.type === 'exam' ? api.exams.find(x => x.id === c.examId)?.title || c.title || '' : c.title || c.fileName || '')}</small></span></div>${c.type === 'exam' ? '<div class="ce-field ce-grow"><span>Description <em class="ce-optional">shown to students above the exam · optional</em></span><div class="ce-rt"></div></div>' : ''}` : `<label class="ce-field ce-url"${c.type === 'link' ? '' : ' hidden'}><span>Link URL</span><input name="url" type="url" placeholder="https://example.com/resource"></label><div class="ce-field ce-grow"><span>${c.type === 'link' ? 'Description' : 'Content'}</span><div class="ce-rt"></div></div>`}
          ${rulesSummary(c)}`;
        const v = n => main.querySelector(`[name=${n}]`);
        v('title').value = c.title || '';
        if (!special) { v('type').value = c.type === 'link' ? 'link' : 'text'; v('url').value = c.url || ''; v('type').onchange = () => { main.querySelector('.ce-url').hidden = v('type').value !== 'link'; main.querySelector('.ce-grow>span').textContent = v('type').value === 'link' ? 'Description' : 'Content'; touch(); renderToc(); }; }
        if (main.querySelector('.ce-rt')) editor = RichText.editor(main.querySelector('.ce-rt'), c.html, { onChange: touch });
      }
      main.querySelectorAll('input,select,textarea').forEach(el => el.addEventListener('input', () => { touch(); if (el.name === 'title' || el.name === 'weekTitle') { commit(); renderToc(); } }));
      const gear = $('[data-ce="settings"]'); gear.disabled = selected.kind === 'week'; gear.title = selected.kind === 'week' ? 'Pick a page in Contents to change its settings' : 'Prerequisites, sections, opening and expiry for this page';
      $('[data-ce="duplicate"]').disabled = selected.kind === 'week';
    }
    // ---------- page settings (prerequisite, sections, opening, expiry) ----------
    const allCells = () => weeks.flatMap(w => w.cells.map(c => ({ w, c })));
    const subjectExams = () => api.exams.filter(x => !x.subjectCode || x.subjectCode === subjectCode);
    function sectionOptions(extra = []) {
      let offers = [];
      try { offers = SectionService.offerings(DB.read('sectionSubjects', [])).filter(o => o.subjectCode === subjectCode); } catch (_) {}
      const own = offers.filter(o => !o.facultyId || o.facultyId === api.facultyId), names = DB.read('sections', []) || [];
      const ids = [...new Set([...(own.length ? own : offers).map(o => String(o.sectionId)), ...extra])].filter(Boolean).sort();
      return ids.map(id => { const row = names.find(s => String(s.id) === id), n = String(row?.name || ''); return { id, name: n.length > 3 && n !== id ? `${id} · ${n}` : id }; });
    }
    const fmt = v => { const t = new Date(v).getTime(); return isFinite(t) ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : v; };
    function ruleLabels(c) {
      const out = [], p = c.prerequisite;
      if (c.availability === 'locked') out.push('Hidden from students');
      if (p) out.push(p.type === 'previous' ? 'Needs the previous page' : p.type === 'exam' ? `Needs exam: ${subjectExams().find(x => x.id === p.id)?.title || 'removed exam'}` : `Needs: ${findCell(p.id)?.cell.title || 'removed page'}`);
      if (c.sectionIds?.length) out.push(`Only ${c.sectionIds.join(', ')}`);
      if (c.openAt) out.push(`Opens ${fmt(c.openAt)}`);
      if (c.expiresAt) out.push(`Expires ${fmt(c.expiresAt)}`);
      return out;
    }
    const rulesSummary = c => { const l = ruleLabels(c); return l.length ? `<div class="ce-rules-summary">${ICON.settings}<span>${l.map(x => `<em>${esc(x)}</em>`).join('')}</span><button type="button" class="ce-link" data-ce="settings">Edit settings</button></div>` : ''; };

    function openSettings(c) {
      const sections = sectionOptions(c.sectionIds), exams = subjectExams(), p = c.prerequisite || {};
      const pages = allCells().filter(x => x.c !== c && x.c.type !== 'exam');
      const rule = (key, title, hint, on, body) => `<section class="ce-rule${on ? ' on' : ''}" data-rule="${key}"><label class="ce-rule-head"><span><strong>${title}</strong><small>${hint}</small></span><input type="checkbox" class="ce-switch" name="on-${key}"${on ? ' checked' : ''} role="switch"></label>${body ? `<div class="ce-rule-body"${on ? '' : ' hidden'}>${body}</div>` : ''}</section>`;
      const dlg = document.createElement('div'); dlg.className = 'modal-bg confirm-bg ce-rules-bg'; dlg.style.display = 'flex';
      dlg.innerHTML = `<div class="modal ce-rules" role="dialog" aria-modal="true" aria-labelledby="ceRulesTitle">
        <header><div><h3 id="ceRulesTitle">Page settings</h3><p>${esc(c.title || 'Untitled')} · every setting is optional</p></div><button type="button" class="pf-head-btn" data-r="close" aria-label="Close">${ICON.close}</button></header>
        <div class="ce-rules-body">
          ${rule('prereq', 'Prerequisite', 'Students must finish something before this page opens.', !!c.prerequisite, `<div class="ce-seg" role="radiogroup" aria-label="Kind of prerequisite">${[['previous', 'Previous page'], ['page', 'A page'], ['exam', 'An exam']].map(([v, l]) => `<label><input type="radio" name="ptype" value="${v}"${(p.type || 'previous') === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
            <label class="ce-field" data-for="page"><span>Page to finish first</span><select name="ppage"><option value="">Choose a page…</option>${weeks.map((w, wi) => `<optgroup label="Week ${wi + 1} · ${esc(w.title)}">${w.cells.filter(x => x !== c && x.type !== 'exam').map(x => `<option value="${esc(x.id)}"${p.type === 'page' && p.id === x.id ? ' selected' : ''}>${esc(x.title || 'Untitled')}</option>`).join('')}</optgroup>`).join('')}</select></label>
            <label class="ce-field" data-for="exam"><span>Exam to submit first</span><select name="pexam"><option value="">Choose an exam…</option>${exams.map(x => `<option value="${esc(x.id)}"${p.type === 'exam' && p.id === x.id ? ' selected' : ''}>${esc(x.title || 'Examination')}</option>`).join('')}</select></label>
            <p class="ce-hint" data-for="previous">Students mark the page before this one as done first.</p>`)}
          ${rule('sections', 'Limit to sections', 'Only these sections see this page. Everyone else skips to the next page.', !!c.sectionIds?.length, sections.length ? `<div class="ce-chips">${sections.map(s => `<label><input type="checkbox" name="sec" value="${esc(s.id)}"${c.sectionIds?.includes(s.id) ? ' checked' : ''}><span>${esc(s.name)}</span></label>`).join('')}</div>` : '<p class="ce-hint">No sections take this subject yet.</p>')}
          ${rule('opens', 'Opens later', 'The page stays locked until this date and time.', !!c.openAt, '<label class="ce-field"><span>Opens on</span><input type="datetime-local" name="openAt"></label>')}
          ${rule('expires', 'Expires', 'After this date and time the page closes for students.', !!c.expiresAt, '<label class="ce-field"><span>Closes on</span><input type="datetime-local" name="expiresAt"></label>')}
          ${rule('locked', 'Hide for now', 'Students see the page as locked until you turn this off.', c.availability === 'locked', '')}
          ${rule('collapse', 'Collapsible', 'Students can fold this page away in the lesson list.', !!c.collapsible, '')}
        </div>
        <footer class="ce-rules-foot"><button type="button" class="confirm-cancel" data-r="close">Cancel</button><button type="button" class="confirm-ok" data-r="apply">Apply</button></footer></div>`;
      document.body.appendChild(dlg);
      const q = s => dlg.querySelector(s), val = n => q(`[name=${n}]`);
      val('openAt').value = c.openAt || ''; val('expiresAt').value = c.expiresAt || '';
      const syncType = () => { const t = q('[name=ptype]:checked').value; dlg.querySelectorAll('[data-for]').forEach(el => { el.hidden = el.dataset.for !== t; }); };
      syncType(); dlg.querySelectorAll('[name=ptype]').forEach(r => r.onchange = syncType);
      dlg.querySelectorAll('.ce-switch').forEach(sw => sw.onchange = () => { const box = sw.closest('.ce-rule'); box.classList.toggle('on', sw.checked); const body = box.querySelector('.ce-rule-body'); if (body) body.hidden = !sw.checked; if (sw.checked) body?.querySelector('input:not([type=radio]),select')?.focus(); });
      const shut = () => { dlg.remove(); $('[data-ce="settings"]')?.focus(); };
      dlg.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } });
      dlg.addEventListener('click', e => {
        const r = e.target.closest('[data-r]')?.dataset.r; if (e.target === dlg) return shut(); if (!r) return; if (r === 'close') return shut();
        const on = k => val(`on-${k}`).checked, fail = (msg, el) => { notify(msg, 'error'); el?.focus(); };
        let prerequisite = null;
        if (on('prereq')) { const t = q('[name=ptype]:checked').value; if (t === 'previous') prerequisite = { type: 'previous' }; else { const id = val(t === 'page' ? 'ppage' : 'pexam').value; if (!id) return fail(`Choose the ${t} students must finish first.`, val(t === 'page' ? 'ppage' : 'pexam')); prerequisite = { type: t, id }; } }
        const sectionIds = on('sections') ? [...dlg.querySelectorAll('[name=sec]:checked')].map(x => x.value) : [];
        if (on('sections') && !sectionIds.length) return fail('Pick at least one section, or turn "Limit to sections" off.');
        const openAt = on('opens') ? val('openAt').value : '', expiresAt = on('expires') ? val('expiresAt').value : '';
        if (on('opens') && !openAt) return fail('Set when the page opens.', val('openAt'));
        if (on('expires') && !expiresAt) return fail('Set when the page expires.', val('expiresAt'));
        if (openAt && expiresAt && new Date(expiresAt) <= new Date(openAt)) return fail('The page must expire after it opens.', val('expiresAt'));
        Object.assign(c, { prerequisite, sectionIds, openAt, expiresAt, availability: on('locked') ? 'locked' : openAt ? 'scheduled' : 'open', collapsible: on('collapse'), durationMinutes: 0 });
        touch(); shut(); renderToc(); renderMain();
      });
      q('.ce-switch').focus();
    }

    function select(kind, key) { commit(); selected = { kind, key }; if (kind === 'cell') { const w = findCell(key)?.week; if (w) w.collapsed = false; } renderToc(); renderMain(); }

    // ---------- right: contents ----------
    function renderToc() {
      tocList.innerHTML = weeks.map(w => `<div class="ce-node${w.collapsed ? ' collapsed' : ''}" data-week="${w.key}" role="treeitem" aria-expanded="${!w.collapsed}">
        <div class="ce-row-item ce-week-row${selected.kind === 'week' && selected.key === w.key ? ' active' : ''}" data-drag="week" data-key="${w.key}" tabindex="0"><button type="button" class="ce-twisty" data-toggle="${w.key}" aria-label="${w.collapsed ? 'Expand' : 'Collapse'} week">${ICON.chevron}</button><span class="ce-label"><b>Week ${weekNo(w)}</b>${esc(w.title && w.title !== `Week ${weekNo(w)}` ? w.title : '')}</span><span class="ce-count">${w.cells.length}</span></div>
        <div class="ce-children" role="group">${w.cells.map(c => `<div class="ce-row-item ce-cell-row${selected.kind === 'cell' && selected.key === c.id ? ' active' : ''}" data-drag="cell" data-key="${esc(c.id)}" tabindex="0">${kindIcon(c)}<span class="ce-label">${esc(c.title || 'Untitled')}</span>${hasRules(c) ? `<span class="ce-rule-dot" title="${esc(ruleLabels(c).join(' · '))}">${ICON.settings}</span>` : ''}</div>`).join('')}</div></div>`).join('') || '<p class="profile-empty">No weeks yet. Use Options › Add week.</p>';
    }
    tocList.addEventListener('click', e => {
      if (tocList.dataset.dragging) return;
      const t = e.target.closest('[data-toggle]'); if (t) { const w = findWeek(t.dataset.toggle); w.collapsed = !w.collapsed; renderToc(); return; }
      const row = e.target.closest('.ce-row-item'); if (!row) return;
      select(row.dataset.drag, row.dataset.key);
    });
    tocList.addEventListener('keydown', e => { const row = e.target.closest('.ce-row-item'); if (!row) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); } if (row.dataset.drag === 'week' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { const w = findWeek(row.dataset.key); w.collapsed = e.key === 'ArrowLeft'; renderToc(); tocList.querySelector(`[data-key="${row.dataset.key}"]`)?.focus(); } });

    // Long-press drag. Weeks carry their cells; cells can move into another week.
    let press = null;
    tocList.addEventListener('pointerdown', e => {
      const row = e.target.closest('.ce-row-item'); if (!row || e.button !== 0 || e.target.closest('[data-toggle]')) return;
      press = { row, x: e.clientX, y: e.clientY, timer: setTimeout(() => startDrag(row, e.pointerId), LONG_PRESS) };
    });
    const cancelPress = () => { if (press) clearTimeout(press.timer); press = null; };
    tocList.addEventListener('pointermove', e => { if (press && !press.dragging && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 6) cancelPress(); });
    tocList.addEventListener('pointerup', () => { if (press && !press.dragging) cancelPress(); });
    tocList.addEventListener('contextmenu', e => { if (press) e.preventDefault(); });
    function startDrag(row, pointerId) {
      if (!press) return; press.dragging = true; commit();
      const kind = row.dataset.drag, key = row.dataset.key, source = kind === 'week' ? row.closest('.ce-node') : row;
      tocList.dataset.dragging = '1'; source.classList.add('ce-dragging'); try { tocList.setPointerCapture(pointerId); } catch (_) {}
      if (navigator.vibrate) navigator.vibrate(15);
      const marker = document.createElement('div'); marker.className = 'ce-drop';
      let target = null;
      const move = e => {
        target = null; marker.remove();
        const rows = [...tocList.querySelectorAll(kind === 'week' ? '.ce-week-row' : '.ce-row-item')].filter(r => !source.contains(r));
        let best = null; for (const r of rows) { const rect = r.getBoundingClientRect(); if (e.clientY < rect.top + rect.height / 2) { best = { r, before: true }; break; } best = { r, before: false }; }
        if (!best) return;
        if (kind === 'week') { const node = best.r.closest('.ce-node'); target = { week: node.dataset.week, before: best.before }; node[best.before ? 'before' : 'after'](marker); return; }
        if (best.r.dataset.drag === 'week') { const node = best.r.closest('.ce-node'); if (best.before) { const prev = node.previousElementSibling; if (!prev) return; target = { week: prev.dataset.week, index: Infinity }; prev.querySelector('.ce-children').append(marker); } else { target = { week: node.dataset.week, index: 0 }; node.querySelector('.ce-children').prepend(marker); } return; }
        const w = findCell(best.r.dataset.key).week, idx = w.cells.findIndex(c => c.id === best.r.dataset.key);
        target = { week: w.key, index: best.before ? idx : idx + 1 }; best.r[best.before ? 'before' : 'after'](marker);
      };
      const end = () => {
        tocList.removeEventListener('pointermove', move); tocList.removeEventListener('pointerup', end); tocList.removeEventListener('pointercancel', end);
        marker.remove(); source.classList.remove('ce-dragging'); press = null; setTimeout(() => delete tocList.dataset.dragging, 0);
        if (!target) return;
        if (kind === 'week') { const w = findWeek(key); weeks = weeks.filter(x => x !== w); const at = weeks.findIndex(x => x.key === target.week); weeks.splice(target.before ? at : at + 1, 0, w); }
        else { const from = findCell(key), to = findWeek(target.week); let index = Math.min(target.index, to.cells.length); const old = from.week.cells.indexOf(from.cell); if (from.week === to && old < index) index--; from.week.cells.splice(old, 1); to.cells.splice(index, 0, from.cell); to.collapsed = false; }
        touch(); renderToc(); renderMain();
      };
      tocList.addEventListener('pointermove', move); tocList.addEventListener('pointerup', end); tocList.addEventListener('pointercancel', end);
    }

    // ---------- footer actions ----------
    const currentWeek = () => selected.kind === 'week' ? findWeek(selected.key) : findCell(selected.key)?.week;
    const closeMenu = () => { menu.hidden = true; examMenu.hidden = true; };
    const addCell = (w, cell) => { w.cells.push(cell); w.collapsed = false; touch(); select('cell', cell.id); };
    bg.addEventListener('click', async e => {
      const a = e.target.closest('[data-ce]')?.dataset.ce; if (!a) { if (!e.target.closest('.ce-options')) closeMenu(); return; }
      if (a !== 'options' && a !== 'exam-menu') closeMenu();
      if (a === 'options') { examMenu.hidden = true; menu.hidden = !menu.hidden; return; }
      if (a === 'exam-menu') { menu.hidden = true; examMenu.hidden = !examMenu.hidden; return; }
      if (a === 'exam-new') return createExam();
      if (a === 'settings') { if (selected.kind === 'week') return; commit(); const hit = findCell(selected.key); if (hit) openSettings(hit.cell); return; }
      if (a === 'add-cell') { const w = currentWeek() || weeks[weeks.length - 1]; if (!w) return; commit(); return addCell(w, { id: `new_${++nextId}`, type: 'text', title: 'New content', html: '', availability: 'open' }); }
      if (a === 'add-week') { commit(); const w = { key: `n${++nextId}`, title: `Week ${weeks.length + 1}`, description: '', collapsed: false, cells: [] }; weeks.push(w); w.cells.push({ id: `new_${++nextId}`, type: 'text', title: 'New content', html: '', availability: 'open' }); touch(); return select('week', w.key); }
      if (a === 'duplicate' && selected.kind === 'cell') { commit(); const { week: w, cell: c } = findCell(selected.key); const copy = { ...c, id: `new_${++nextId}`, title: `${c.title || 'Untitled'} (copy)` }; w.cells.splice(w.cells.indexOf(c) + 1, 0, copy); touch(); return select('cell', copy.id); }
      if (a === 'delete') {
        const isWeek = selected.kind === 'week', w = currentWeek(); if (!w) return;
        const ok = typeof confirmDialog !== 'function' || await confirmDialog({ title: isWeek ? `Delete Week ${weekNo(w)}?` : 'Delete this cell?', message: isWeek ? `This removes the week and its ${w.cells.length} item${w.cells.length === 1 ? '' : 's'} when you save.` : 'It is removed when you save.', confirmLabel: 'Delete', danger: true });
        if (!ok) return; if (isWeek) { weeks = weeks.filter(x => x !== w); selected = weeks[0] ? { kind: 'week', key: weeks[0].key } : { kind: 'week', key: '' }; } else { w.cells = w.cells.filter(c => c.id !== selected.key); selected = { kind: 'week', key: w.key }; }
        touch(); renderToc(); renderMain(); return;
      }
      if (a === 'exam') { const w = currentWeek(); if (!w) return; commit(); const examId = await api.pickExam(weekNo(w)); if (!examId) return; if (w.cells.some(c => c.type === 'exam' && c.examId === examId)) { notify('That exam is already in this week.', 'info'); return; } const exam = api.exams.find(x => x.id === examId); return addCell(w, { id: `new_${++nextId}`, type: 'exam', examId, title: exam?.title || 'Examination', availability: 'open' }); }
      if (a === 'cancel') return close();
      if (a === 'save') return save();
    });
    /* Create a new exam: the editor steps aside (edits kept), the exam builder opens for this subject,
       and any exam saved there is added to the current week when the builder closes. */
    function createExam() {
      const w = currentWeek(); if (!w) return; commit();
      if (typeof api.createExam !== 'function') { notify('The exam builder is not available here.', 'error'); return; }
      const before = new Set((DB.read('exams', []) || []).map(x => x.id));
      bg.style.display = 'none';
      const restore = () => {
        bg.style.display = 'flex';
        const added = (DB.read('exams', []) || []).filter(x => !before.has(x.id) && x.subjectCode === subjectCode);
        if (!added.length) { notify('No new exam was saved, so nothing was added.', 'info'); return; }
        added.forEach(exam => { if (!api.exams.some(x => x.id === exam.id)) api.exams.push(exam); w.cells.push({ id: `new_${++nextId}`, type: 'exam', examId: exam.id, title: exam.title || 'Examination', availability: 'open' }); });
        w.collapsed = false; touch(); select('cell', w.cells[w.cells.length - 1].id);
        notify(`${added.length === 1 ? 'The new exam was' : added.length + ' new exams were'} added to Week ${weekNo(w)}. Save to keep it in the course.`, 'success');
      };
      api.createExam(subjectCode, restore);
    }
    async function close() {
      if (dirty && typeof confirmDialog === 'function' && !(await confirmDialog({ title: 'Discard changes?', message: 'Your edits to this course have not been saved.', confirmLabel: 'Discard', danger: true }))) return;
      bg.remove();
    }
    $('.ce-close').onclick = close;
    bg.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.closest('.rt-full')) { if (!menu.hidden) closeMenu(); else close(); } });

    function save() {
      commit();
      const badLink = weeks.flatMap(w => w.cells).find(c => c.type === 'link' && c.url && !/^https?:\/\//i.test(c.url));
      if (badLink) { notify(`"${badLink.title || 'Untitled'}": the link must start with https://`, 'error'); select('cell', badLink.id); return; }
      const now = new Date().toISOString(), out = [];
      const empty = weeks.filter(w => !w.cells.length);
      // New cells get their real ids first, so a prerequisite can point at a page added in this session.
      const ids = new Map(allCells().map(({ c }) => [c.id, String(c.id).startsWith('new_') ? `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` : c.id]));
      weeks.filter(w => w.cells.length).forEach((w, wi) => w.cells.forEach((c, ci) => {
        const { html, ...rest } = c, original = mine.find(i => i.id === c.id);
        const item = { ...(original || {}), ...rest, id: ids.get(c.id), subjectCode, week: wi + 1, order: ci, weekTitle: w.title || `Week ${wi + 1}`, weekDescription: w.description, title: c.title || 'Untitled', updatedAt: now, updatedBy: api.facultyId };
        if (!original) item.createdAt = now;
        let p = c.prerequisite || null;
        if (p?.type === 'page') p = ids.has(p.id) ? { type: 'page', id: ids.get(p.id) } : null; // the page was deleted
        if (p?.type === 'exam' && !api.exams.some(x => x.id === p.id)) p = null;
        Object.assign(item, { prerequisite: p, requiresPrevious: p?.type === 'previous', sectionIds: c.sectionIds || [], openAt: c.openAt || '', expiresAt: c.expiresAt || '', availability: c.availability === 'locked' ? 'locked' : c.openAt ? 'scheduled' : 'open', durationMinutes: 0 });
        if (c.type !== 'file') { const clean = RichText.sanitize(html || ''); item.bodyHtml = clean; item.body = RichText.toPlain(clean); }
        out.push(item);
      }));
      api.writeContent([...api.readContent().filter(i => i.subjectCode !== subjectCode), ...out]);
      api.log('edit', 'subject-course', subjectCode, { subjectCode, weeks: weeks.length - empty.length, cells: out.length });
      dirty = false; bg.remove(); notify(`Course saved: ${weeks.length - empty.length} week${weeks.length - empty.length === 1 ? '' : 's'}, ${out.length} item${out.length === 1 ? '' : 's'}.${empty.length ? ' Empty weeks were left out.' : ''}`, 'success'); api.render();
    }
    renderToc(); renderMain(); setStatus();
    if (newCell) { const w = findWeek(selected.key) || currentWeek() || weeks[weeks.length - 1]; if (w) { addCell(w, { id: `new_${++nextId}`, type: 'text', title: '', html: '', availability: 'open' }); dirty = false; setStatus(); } }
    tocList.querySelector('.ce-row-item.active')?.scrollIntoView({ block: 'nearest' });
    main.querySelector('input')?.focus();
  }
  return { open };
})();
if (typeof window !== 'undefined') window.CourseEditor = CourseEditor;
