/* ============================================================
   Shared header profile menu.

   mountProfileMenu({ name, role, id, container }) injects a round
   avatar button into the header. Clicking it opens a panel with an
   enlarged profile hero, the person's name, then Settings and Log out.

   Requires auth.js (for logout) and css/shared-ui.css.
   ============================================================ */

/* ---------- Global failure reporting ----------
   Nothing used to surface when the application broke: a thrown handler
   logged to a console the user never opens, and the button simply appeared
   to do nothing. Every uncaught failure now becomes a visible message. */

// Identical errors can fire repeatedly (a bad render in a loop); show each
// distinct problem once per short window rather than stacking dozens.
const _seenErrors = new Map();

function reportFailure(what, detail) {
  const key = String(detail && detail.message ? detail.message : detail);
  const now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now() : 0;
  const last = _seenErrors.get(key);
  if (last !== undefined && now - last < 4000) return;
  _seenErrors.set(key, now);

  console.error('[failure]', what, detail);
  if (typeof notify === 'function') {
    notify(
      `${what} did not complete. Nothing was changed — please try again, `
      + 'and reload the page if it keeps happening.',
      'error', 7000);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', e => {
    // Ignore failed images/stylesheets; those are reported separately.
    if (e.target && e.target !== window && e.target.tagName) {
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'img') {
        console.warn('[asset] image failed to load:', e.target.src);
        return;
      }
      if (tag === 'script' || tag === 'link') {
        if (typeof notify === 'function') {
          notify('Part of the page failed to load. Please reload.', 'error', 9000);
        }
        return;
      }
    }
    reportFailure('That action', e.error || e.message);
  }, true);

  window.addEventListener('unhandledrejection', e => {
    reportFailure('That action', e.reason);
  });
}

/* Wraps a risky operation so a thrown error becomes a visible message
   instead of a button that silently does nothing.

      guard('Saving the exam', () => { ... })

   Returns whatever the operation returns, or undefined when it failed. */
function guard(what, fn) {
  try {
    const out = fn();
    if (out && typeof out.catch === 'function') {
      return out.catch(err => { reportFailure(what, err); });
    }
    return out;
  } catch (err) {
    reportFailure(what, err);
    return undefined;
  }
}

/* Reports a precondition that stopped an action, so a control never just
   does nothing. Returns false so callers can `if (!required(...)) return;` */
function required(condition, message) {
  if (condition) return true;
  if (typeof notify === 'function') notify(message, 'error');
  return false;
}

/* ---------- Shared sidebar navigation ----------
   All three roles use the same drawer, so moving between dashboards does not
   mean re-learning where things live. Produces the same markup and classes on
   every page: a hamburger in the header, and #sidebar holding the links.

   mountSidebar({
     items: [{ id: 'panelId', label: 'My Exams', icon: '📝' }],
     panels: ['panelId', ...],      // elements to show one at a time
     titleEl: '#pageTitle',         // optional, kept in step with the section
     onSelect(id) { ... }           // optional, fired after the panel is shown
   })
*/
function mountSidebar({ items, panels, container = '.topbar-left',
                        titleEl = null, onSelect = null, startAt = null } = {}) {
  const host = typeof container === 'string' ? document.querySelector(container) : container;
  if (!host || !Array.isArray(items) || items.length === 0) return null;
  const navItems = items.filter(item => item && item.id);
  if (!navItems.length) return null;

  // Hamburger goes first in the header, before the logo.
  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = 'menu-btn';
  menuBtn.setAttribute('aria-label', 'Open navigation');
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-controls', 'sidebar');
  menuBtn.textContent = '☰';
  host.insertBefore(menuBtn, host.firstChild);

  const bar = document.createElement('nav');
  bar.id = 'sidebar';
  bar.setAttribute('aria-label', 'Sections');
  bar.innerHTML = `
    <button type="button" class="close-x" aria-label="Close navigation">×</button>
    ${items.map(it => it.divider ? `<div class="sidebar-divider" role="separator"${it.label?` aria-label="${it.label}"><span>${it.label}</span>`:'>'}</div>` : `
      <a id="link-${it.id}" href="#${it.id}" data-panel="${it.id}">
        <span class="nav-icon" aria-hidden="true">${it.icon || ''}</span>
        <span>${it.label}</span>
        ${Number(it.badge)>0?`<span class="nav-count" aria-label="${Number(it.badge)} pending">${Number(it.badge)}</span>`:''}
      </a>`).join('')}
  `;
  document.body.appendChild(bar);

  const known = panels || navItems.map(i => i.id);
  const routePanels = new Set(navItems.map(item => item.id));
  const routeKey = `neu:last-panel:${location.pathname}`;
  const historyKey = `neu-panel:${location.pathname}`;
  let activePanel = null;
  let historyIndex = 0;
  const panelHistory = [];

  function savedPanel() {
    const hashPanel = decodeURIComponent(location.hash.replace(/^#/, '').split('/')[0] || '');
    if (routePanels.has(hashPanel)) return hashPanel;
    try {
      const stored = sessionStorage.getItem(routeKey);
      if (routePanels.has(stored)) return stored;
    } catch (_) {}
    return null;
  }

  function setOpen(open) {
    bar.style.width = open ? '260px' : '0';
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  function show(id, options = {}) {
    if (!known.includes(id)) return false;
    const changed = activePanel !== id;
    if (changed && activePanel !== null && !options.fromHistory && !options.fromBack) {
      panelHistory.push(activePanel);
    }
    known.forEach(p => {
      const el = document.getElementById(p);
      if (el) el.style.display = (p === id) ? 'block' : 'none';
    });
    bar.querySelectorAll('a').forEach(a =>
      a.classList.toggle('active', a.dataset.panel === id));

    const item = navItems.find(i => i.id === id);
    if (titleEl && item) {
      const t = typeof titleEl === 'string' ? document.querySelector(titleEl) : titleEl;
      if (t) t.textContent = item.label;
    }
    setOpen(false);
    if (routePanels.has(id)) {
      try { sessionStorage.setItem(routeKey, id); } catch (_) {}
      if (options.syncUrl !== false) {
        const state = { neuPanelKey: historyKey, panel: id, index: historyIndex };
        if (options.fromHistory || options.fromBack) {
          history.replaceState(state, '', `#${encodeURIComponent(id)}`);
        } else if (changed && activePanel !== null) {
          historyIndex += 1;
          state.index = historyIndex;
          history.pushState(state, '', `#${encodeURIComponent(id)}`);
        } else {
          history.replaceState(state, '', `#${encodeURIComponent(id)}`);
        }
      }
    }
    activePanel = id;
    if (onSelect) onSelect(id);
    return true;
  }

  function back(fallback = navItems[0].id) {
    while (panelHistory.length) {
      const previous = panelHistory.pop();
      if (known.includes(previous) && previous !== activePanel) {
        if (routePanels.has(previous)) historyIndex = Math.max(0, historyIndex - 1);
        return show(previous, { fromBack: true });
      }
    }
    if (historyIndex > 0) {
      history.back();
      return true;
    }
    return show(fallback);
  }

  menuBtn.addEventListener('click', e => {
    e.stopPropagation();
    setOpen(bar.style.width !== '260px');
  });
  bar.querySelector('.close-x').addEventListener('click', () => setOpen(false));
  bar.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); show(a.dataset.panel); }));

  // Escape closes; clicking the page behind it closes.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && bar.style.width === '260px') { setOpen(false); menuBtn.focus(); }
  });
  document.addEventListener('click', e => {
    if (bar.style.width === '260px' && !bar.contains(e.target) && e.target !== menuBtn) setOpen(false);
  });

  window.addEventListener('popstate', event => {
    const state = event.state;
    if (!state || state.neuPanelKey !== historyKey || !routePanels.has(state.panel)) return;
    historyIndex = Number.isFinite(state.index) ? state.index : 0;
    show(state.panel, { fromHistory: true });
  });

  show(startAt || savedPanel() || items[0].id);
  return {
    show,
    back,
    current: () => activePanel,
    open: () => setOpen(true),
    close: () => setOpen(false)
  };
}

/* ---------- Toast notifications ----------
   Replaces alert() for feedback. Non-blocking, announced to screen
   readers, and carries an icon and a word so the meaning never depends
   on colour alone. */

function toastHost() {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    host.className = 'toast-host';
    // Assertive so validation errors interrupt; the region is otherwise empty.
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    document.body.appendChild(host);
  }
  return host;
}

const TOAST_KINDS = {
  success: { icon: '✓', word: 'Success' },
  error:   { icon: '!', word: 'Problem' },
  info:    { icon: 'i', word: 'Note'    }
};

function notify(message, type = 'info', timeout = 4200) {
  const kind = TOAST_KINDS[type] || TOAST_KINDS.info;
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${kind.icon}</span>
    <span class="toast-body"><strong>${kind.word}:</strong> ${message}</span>
    <button type="button" class="toast-close" aria-label="Dismiss">×</button>
  `;
  toastHost().appendChild(el);

  const close = () => {
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector('.toast-close').addEventListener('click', close);
  if (timeout) setTimeout(close, timeout);

  // rAF is unavailable in some embedding contexts; fall back to a timeout so
  // the toast still appears rather than throwing mid-save.
  const paint = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (fn => setTimeout(fn, 0));
  paint(() => el.classList.add('showing'));
  return el;
}

/* ---------- Confirmation dialog ----------
   Promise-based replacement for confirm(), so the wording, emphasis and
   danger styling can be designed rather than left to the browser.
   Callers use:  if (!(await confirmDialog({...}))) return; */

function confirmDialog({ title = 'Please confirm', message = '', confirmLabel = 'Confirm',
                         cancelLabel = 'Cancel', danger = false } = {}) {
  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg confirm-bg';
    bg.style.display = 'flex';
    bg.innerHTML = `
      <div class="modal confirm-box" role="alertdialog" aria-modal="true"
           aria-labelledby="confirmTitle" aria-describedby="confirmMsg">
        <h3 id="confirmTitle">${title}</h3>
        <p id="confirmMsg" class="confirm-msg">${String(message).replace(/\n/g, '<br>')}</p>
        <div class="confirm-actions">
          <button type="button" class="confirm-cancel" id="confirmNo">${cancelLabel}</button>
          <button type="button" class="confirm-ok ${danger ? 'is-danger' : ''}" id="confirmYes">${confirmLabel}</button>
        </div>
      </div>
    `;
    document.body.appendChild(bg);

    const previouslyFocused = document.activeElement;
    const done = value => {
      bg.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(value);
    };

    bg.querySelector('#confirmYes').addEventListener('click', () => done(true));
    bg.querySelector('#confirmNo').addEventListener('click', () => done(false));
    bg.addEventListener('click', e => { if (e.target === bg) done(false); });
    bg.addEventListener('keydown', e => {
      if (e.key === 'Escape') done(false);
    });

    // Focus the safe option first so Enter never destroys anything by accident.
    bg.querySelector('#confirmNo').focus();
  });
}

function textInputDialog({ title = 'Edit', label = 'Name', value = '', confirmLabel = 'Save' } = {}) {
  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg confirm-bg';
    bg.style.display = 'flex';
    bg.innerHTML = `<div class="modal confirm-box" role="dialog" aria-modal="true"><h3></h3><label class="dialog-input-label"><span></span><input type="text"></label><div class="confirm-actions"><button type="button" class="confirm-cancel">Cancel</button><button type="button" class="confirm-ok">${confirmLabel}</button></div></div>`;
    bg.querySelector('h3').textContent = title;
    bg.querySelector('label span').textContent = label;
    const input = bg.querySelector('input'); input.value = value;
    document.body.appendChild(bg);
    const done = result => { bg.remove(); resolve(result); };
    bg.querySelector('.confirm-cancel').onclick = () => done(null);
    bg.querySelector('.confirm-ok').onclick = () => done(input.value);
    bg.onclick = event => { if (event.target === bg) done(null); };
    bg.onkeydown = event => { if (event.key === 'Escape') done(null); if (event.key === 'Enter') { event.preventDefault(); done(input.value); } };
    input.focus(); input.select();
  });
}

function textareaInputDialog({ title = 'Add a note', label = 'Note', value = '', confirmLabel = 'Save', danger = false, allowSkip = false } = {}) {
  return new Promise(resolve => {
    const bg=document.createElement('div');
    bg.className='modal-bg confirm-bg';bg.style.display='flex';
    bg.innerHTML=`<div class="modal confirm-box ${allowSkip?'resolution-dialog':''}" role="dialog" aria-modal="true">${allowSkip?'<button type="button" class="dialog-close-x confirm-cancel" aria-label="Close" title="Close">&times;</button>':''}<h3></h3><label class="dialog-input-label"><span></span><textarea rows="4"></textarea></label><div class="confirm-actions">${allowSkip?'<button type="button" class="confirm-skip">Skip</button>':'<button type="button" class="confirm-cancel">Cancel</button>'}<button type="button" class="confirm-ok ${danger?'is-danger':''}">${confirmLabel}</button></div></div>`;
    bg.querySelector('h3').textContent=title;bg.querySelector('label span').textContent=label;
    const input=bg.querySelector('textarea');input.value=value;
    document.body.appendChild(bg);
    const done=result=>{bg.remove();resolve(result)};
    bg.querySelector('.confirm-cancel').onclick=()=>done(null);
    bg.querySelector('.confirm-skip')?.addEventListener('click',()=>done(''));
    bg.querySelector('.confirm-ok').onclick=()=>done(input.value.trim());
    bg.onclick=event=>{if(event.target===bg)done(null)};
    bg.onkeydown=event=>{if(event.key==='Escape')done(null)};
    input.focus();input.select();
  });
}

/* Three-way guard for editable forms. The caller can save, deliberately
   discard, or continue editing without relying on the browser's confirm UI. */
function saveDiscardDialog({ title = 'Unsaved changes', message = 'What would you like to do?' } = {}) {
  return new Promise(resolve => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg confirm-bg';
    bg.style.display = 'flex';
    bg.innerHTML = `
      <div class="modal confirm-box" role="alertdialog" aria-modal="true"
           aria-labelledby="saveDiscardTitle" aria-describedby="saveDiscardMsg">
        <h3 id="saveDiscardTitle">${title}</h3>
        <p id="saveDiscardMsg" class="confirm-msg">${message}</p>
        <div class="confirm-actions save-discard-actions">
          <button type="button" class="confirm-cancel" id="continueEditing">Continue editing</button>
          <button type="button" class="confirm-ok is-danger" id="discardChanges">Discard</button>
          <button type="button" class="confirm-ok" id="saveChanges">Save</button>
        </div>
      </div>`;
    document.body.appendChild(bg);
    const previouslyFocused = document.activeElement;
    const done = value => {
      bg.remove();
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      resolve(value);
    };
    bg.querySelector('#saveChanges').addEventListener('click', () => done('save'));
    bg.querySelector('#discardChanges').addEventListener('click', () => done('discard'));
    bg.querySelector('#continueEditing').addEventListener('click', () => done('continue'));
    bg.addEventListener('click', e => { if (e.target === bg) done('continue'); });
    bg.addEventListener('keydown', e => { if (e.key === 'Escape') done('continue'); });
    bg.querySelector('#continueEditing').focus();
  });
}

/* ---------- Inline field validation ----------
   Marks the offending input and puts the reason next to it, instead of
   a modal that hides the form while it says what is wrong. */

function clearFieldErrors(scope) {
  const root = scope || document;
  root.querySelectorAll('.field-error').forEach(n => n.remove());
  root.querySelectorAll('.has-error').forEach(n => {
    n.classList.remove('has-error');
    n.removeAttribute('aria-invalid');
  });
}

function setFieldError(el, message) {
  if (!el) return;
  el.classList.add('has-error');
  el.setAttribute('aria-invalid', 'true');

  const note = document.createElement('div');
  note.className = 'field-error';
  note.textContent = message;
  el.insertAdjacentElement('afterend', note);

  el.focus();
}

/* Validates required inputs; returns true when all are filled. */
function requireFields(pairs, scope) {
  clearFieldErrors(scope);
  let firstBad = null;
  for (const [el, label] of pairs) {
    if (!el || String(el.value).trim() !== '') continue;
    if (!firstBad) firstBad = [el, label];
  }
  if (firstBad) {
    setFieldError(firstBad[0], `${firstBad[1]} is required.`);
    notify(`${firstBad[1]} is required.`, 'error');
    return false;
  }
  return true;
}

/* Two initials from a display name, e.g. "Maria Reyes" -> "MR". */
function initialsFrom(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isPublicLoginPage() {
  return /\/(?:login|index)\.html$/i.test(location.pathname);
}

function interfaceThemeKey() {
  if (isPublicLoginPage()) return null;
  try {
    const account = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if (!account?.username || !account?.role) return null;
    return `uiTheme:${account.role}:${account.username}`;
  } catch (_) { return null; }
}

function currentInterfaceTheme() {
  const key = interfaceThemeKey();
  return key && localStorage.getItem(key) === 'dark' ? 'dark' : 'light';
}

function applyInterfaceTheme(theme) {
  const key = interfaceThemeKey();
  const next = key && theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  if (key) localStorage.setItem(key, next);
  document.querySelectorAll('#profileThemeBtn').forEach(button => {
    const dark = next === 'dark';
    button.innerHTML = `<span class="pi-icon" aria-hidden="true">${dark ? '☀' : '☾'}</span> ${dark ? 'Light mode' : 'Dark mode'}`;
    button.setAttribute('aria-pressed', String(dark));
  });
  return next;
}

applyInterfaceTheme(currentInterfaceTheme());

function mountProfileMenu({ name, role, id, container }) {
  const host = typeof container === 'string'
    ? document.querySelector(container)
    : container;
  if (!host) return;

  const initials = initialsFrom(name);
  const roleLabel = String(role || '').replace(/^./, c => c.toUpperCase());

  const safe = value => String(value == null ? '' : value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const announcements = typeof DB !== 'undefined' ? DB.read('adminAnnouncements', []) : [];
  const reports = typeof DB !== 'undefined' ? DB.read('questionReports', []) : [];
  const exams = typeof DB !== 'undefined' ? DB.read('exams', []) : [];
  const emails = typeof DB !== 'undefined' ? DB.read('studentEmails', []) : [];
  const reportNotices = typeof DB !== 'undefined' ? DB.read('studentNotifications', []) : [];
  const now = Date.now();
  let inboxItems = announcements.filter(item => !item.archived && (!item.publishAt || new Date(item.publishAt).getTime() <= now) && (!item.audience || item.audience === 'all' || item.audience === role))
    .map(item => ({kind:'Announcement',title:item.title||'Admin announcement',text:item.message||'',at:item.createdAt,pending:!item.read}));
  if (role === 'faculty') {
    const owned = new Set(exams.filter(exam => exam.facultyId === id).map(exam => exam.id));
    inboxItems.push(...reports.filter(report => owned.has(report.examId)).map(report => ({kind:`Report · ${report.status}`,title:report.category||'Question report',text:report.details||'',at:report.createdAt,pending:report.status==='open'})));
    inboxItems.push(...emails.filter(email => email.facultyId === id).map(email => ({kind:'Student mail',title:email.subject||'Message from student',text:email.message||'',at:email.sentAt,pending:email.read!==true})));
  } else if (role === 'student') {
    inboxItems.push(...reportNotices.filter(item => item.studentId === id).map(item => ({kind:item.type==='faculty-mail'?'Faculty mail':'Report update',title:item.subject||'Question report status',text:item.message||'',at:item.createdAt,pending:item.read!==true})));
  } else if (role === 'admin') {
    const openCount = reports.filter(report => report.status === 'open').length;
    if (reports.length) inboxItems.push({kind:'System status',title:'Question reports',text:`${openCount} pending · ${reports.length} total`,at:new Date().toISOString(),pending:openCount>0});
  }
  inboxItems.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
  const inboxOwner=`${role}:${id||'anonymous'}`;
  const inboxReceipts=typeof DB!=='undefined'?DB.read('inboxReadReceipts',[]):[];
  inboxItems.forEach((item,index)=>{
    let source='announcement',sourceId=null,senderId=null,relatedReportId=null;
    if(item.kind.startsWith('Report ·')){const record=reports.find(report=>report.details===item.text&&report.category===item.title);source='report';sourceId=record?.id||index;}
    else if(item.kind==='Student mail'){const record=emails.find(email=>email.message===item.text&&email.subject===item.title);source='student-mail';sourceId=record?.id||index;senderId=record?.studentId||null;relatedReportId=record?.reportId||reports.find(report=>report.studentId===senderId&&item.title.includes(exams.find(exam=>exam.id===report.examId)?.subjectCode||'__no_subject__'))?.id||null;}
    else if(item.kind==='Report update'||item.kind==='Faculty mail'){const record=reportNotices.find(notice=>notice.message===item.text);const report=reports.find(report=>report.id===record?.reportId),exam=exams.find(exam=>exam.id===report?.examId);source='student-notice';sourceId=record?.id||index;senderId=record?.facultyId||exam?.facultyId||null;relatedReportId=record?.reportId||null;}
    else if(item.kind==='System status'){source='system';sourceId='question-reports';}
    else {const record=announcements.find(announcement=>announcement.message===item.text&&announcement.title===item.title);sourceId=record?.id||index;}
    item.key=`${source}:${sourceId}`;item.source=source;item.sourceId=sourceId;item.senderId=senderId;item.relatedReportId=relatedReportId;
    if(inboxReceipts.includes(`${inboxOwner}:${item.key}`))item.pending=false;
  });
  const pendingInboxCount=inboxItems.filter(item=>item.pending).length;

  const wrap = document.createElement('div');
  wrap.className = 'profile-wrap';
  wrap.innerHTML = `
    <div class="header-inbox-wrap">
      <button type="button" class="header-inbox-btn" aria-label="Open inbox${pendingInboxCount?` — ${pendingInboxCount} pending`:''}" aria-expanded="false" title="Inbox">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4V5Zm2 2v1.1l6 4.2 6-4.2V7H6Zm12 10v-6.5l-6 4.2-6-4.2V17h12Z"/></svg>
        ${pendingInboxCount?`<span class="header-inbox-count">${pendingInboxCount}</span>`:''}
      </button>
      <section class="header-inbox-panel" aria-hidden="true">
        <header><div class="header-inbox-title"><strong>Inbox</strong>${pendingInboxCount?`<span class="header-inbox-title-count">${pendingInboxCount}</span>`:''}</div><div class="header-inbox-head-actions"><button type="button" class="header-inbox-read-all">Read all</button></div></header>
        <div class="header-inbox-list">${inboxItems.length?inboxItems.slice(0,12).map((item,index)=>`<button type="button" class="header-inbox-item${item.pending?' pending':''}" data-inbox-index="${index}"><span>${safe(item.kind)}</span><strong>${safe(item.title)}</strong><p>${safe(item.text)}</p></button>`).join(''):'<p class="header-inbox-empty">No messages or updates.</p>'}</div>
      </section>
    </div>
    <button type="button" class="avatar avatar-sm" id="avatarBtn"
            aria-haspopup="true" aria-expanded="false"
            aria-label="Account menu for ${name}" title="${name}">${initials}</button>

    <div class="profile-panel" id="profilePanel" role="menu" aria-hidden="true">
      <div class="profile-hero">
        <div class="avatar avatar-lg" aria-hidden="true">${initials}</div>
        <div class="profile-name">${name}</div>
        <div class="profile-role">${roleLabel}</div>
        ${id ? `<div class="profile-id">${id}</div>` : ''}
      </div>

      <div class="profile-menu">
        <button type="button" class="profile-item" role="menuitem" id="profileThemeBtn" aria-pressed="false">
          <span class="pi-icon" aria-hidden="true">☾</span> Dark mode
        </button>
        <button type="button" class="profile-item danger" role="menuitem" id="profileLogoutBtn">
          <span class="pi-icon" aria-hidden="true">⏻</span> Log out
        </button>
      </div>
    </div>
  `;
  host.appendChild(wrap);

  const btn = wrap.querySelector('#avatarBtn');
  const panel = wrap.querySelector('#profilePanel');
  const inboxBtn=wrap.querySelector('.header-inbox-btn');
  const inboxPanel=wrap.querySelector('.header-inbox-panel');
  const visibleInboxItems=inboxItems.slice(0,12);

  function markInboxRead(items){
    if(typeof DB==='undefined')return;
    const next=new Set(DB.read('inboxReadReceipts',[]));
    items.forEach(item=>{next.add(`${inboxOwner}:${item.key}`);item.pending=false;});
    DB.write('inboxReadReceipts',[...next]);
  }
  function refreshInboxPending(){
    const count=inboxItems.filter(item=>item.pending).length,badge=wrap.querySelector('.header-inbox-count'),titleBadge=wrap.querySelector('.header-inbox-title-count');
    if(count){if(badge)badge.textContent=count;else inboxBtn.insertAdjacentHTML('beforeend',`<span class="header-inbox-count">${count}</span>`);}else badge?.remove();
    if(count){if(titleBadge)titleBadge.textContent=count;else wrap.querySelector('.header-inbox-title').insertAdjacentHTML('beforeend',`<span class="header-inbox-title-count">${count}</span>`);}else titleBadge?.remove();
    inboxBtn.setAttribute('aria-label',`Open inbox${count?` — ${count} pending`:''}`);
  }
  async function replyToInboxItem(item){
    const reply=await textareaInputDialog({title:`Reply: ${item.title}`,label:'Message',confirmLabel:'Send reply'});
    if(!reply)return false;
    if(role==='faculty'&&item.senderId){
      const notices=DB.read('studentNotifications',[]);
      notices.push({id:`faculty-mail-${Date.now()}`,studentId:item.senderId,facultyId:id,message:reply,subject:`Re: ${item.title}`,createdAt:new Date().toISOString(),read:false,type:'faculty-mail'});
      DB.write('studentNotifications',notices);
    }else if(role==='student'&&item.senderId){
      const outgoing=DB.read('studentEmails',[]);
      outgoing.push({id:`student-mail-${Date.now()}`,studentId:id,facultyId:item.senderId,subject:`Re: ${item.title}`,message:reply,sentAt:new Date().toISOString(),read:false});
      DB.write('studentEmails',outgoing);
    }else return false;
    notify('Reply sent.','success');return true;
  }
  async function openInboxItem(item,index){
    markInboxRead([item]);
    wrap.querySelector(`[data-inbox-index="${index}"]`)?.classList.remove('pending');
    refreshInboxPending();
    if(item.source==='report'&&typeof openReportedQuestion==='function'){inboxPanel.classList.remove('open');openReportedQuestion(item.sourceId);return;}
    const canReply=(role==='faculty'&&item.source==='student-mail'&&item.senderId)||(role==='student'&&item.source==='student-notice'&&item.senderId);
    const contextPromise=confirmDialog({title:item.title,message:`${item.kind}\n\n${item.text}`,confirmLabel:canReply?'Reply':'Done',cancelLabel:'Close'});
    const related=reports.find(report=>report.id===item.relatedReportId);
    if(related&&typeof focusQuestionReport==='function'){
      const visualStatus=related.status==='open'||related.status==='reviewed'?'pending':related.status;
      const message=document.querySelector('.confirm-bg .confirm-msg');
      message?.insertAdjacentHTML('afterend',`<button type="button" class="inbox-related-report ${safe(visualStatus)}"><span class="inbox-related-report-head"><strong>Related report</strong><span>${safe(visualStatus)}</span></span><b>${safe(related.category||'Question report')}</b><small>${safe(related.details||'Open this report')}</small></button>`);
      document.querySelector('.inbox-related-report')?.addEventListener('click',()=>{document.querySelector('.confirm-bg .confirm-cancel')?.click();focusQuestionReport(related.id);});
    }
    const wantsReply=await contextPromise;
    if(wantsReply&&canReply)await replyToInboxItem(item);
  }

  function setOpen(open) {
    panel.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
  }

  btn.addEventListener('click', e => {
    e.stopPropagation();
    inboxPanel.classList.remove('open');
    setOpen(!panel.classList.contains('open'));
  });
  inboxBtn.addEventListener('click',e=>{e.stopPropagation();setOpen(false);const open=!inboxPanel.classList.contains('open');inboxPanel.classList.toggle('open',open);inboxPanel.setAttribute('aria-hidden',String(!open));inboxBtn.setAttribute('aria-expanded',String(open));});
  wrap.querySelector('.header-inbox-read-all').addEventListener('click',event=>{
    event.stopPropagation();markInboxRead(inboxItems);
    wrap.querySelectorAll('.header-inbox-item.pending').forEach(item=>item.classList.remove('pending'));
    refreshInboxPending();
  });
  wrap.querySelectorAll('.header-inbox-item').forEach(button=>button.addEventListener('click',event=>{
    event.stopPropagation();openInboxItem(visibleInboxItems[Number(button.dataset.inboxIndex)],Number(button.dataset.inboxIndex));
  }));

  // Click-away and Escape both dismiss the panel.
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) { setOpen(false); inboxPanel.classList.remove('open'); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && panel.classList.contains('open')) {
      setOpen(false);
      btn.focus();
    }
  });

  wrap.querySelector('#profileLogoutBtn').addEventListener('click', () => logout());
  applyInterfaceTheme(currentInterfaceTheme());
  wrap.querySelector('#profileThemeBtn').addEventListener('click', () => {
    applyInterfaceTheme(currentInterfaceTheme() === 'dark' ? 'light' : 'dark');
  });
  window.refreshSharedInbox=()=>{
    const keepOpen=inboxPanel.classList.contains('open');
    wrap.remove();
    mountProfileMenu({name,role,id,container:host});
    if(keepOpen)host.querySelector('.header-inbox-btn')?.click();
  };
}

/* Minimal settings dialog: read-only account details. Preferences are
   listed in the project plan as a future enhancement. */
function openSettings({ name, role, id }) {
  let bg = document.getElementById('settingsModal');
  if (!bg) {
    bg = document.createElement('div');
    bg.id = 'settingsModal';
    bg.className = 'modal-bg';
    bg.innerHTML = `
      <div class="modal" style="width:420px;">
        <h3>Settings</h3>
        <div id="settingsBody"></div>
        <button type="button" class="cancel" id="settingsCloseBtn">Close</button>
      </div>
    `;
    document.body.appendChild(bg);

    bg.querySelector('#settingsCloseBtn').addEventListener('click', () => {
      bg.style.display = 'none';
    });
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.style.display = 'none';
    });
  }

  bg.querySelector('#settingsBody').innerHTML = `
    <div class="settings-row">
      <span class="settings-label">Name</span>
      <span class="settings-value">${name}</span>
    </div>
    <div class="settings-row">
      <span class="settings-label">Role</span>
      <span class="settings-value">${role}</span>
    </div>
    ${id ? `<div class="settings-row">
      <span class="settings-label">ID</span>
      <span class="settings-value">${id}</span>
    </div>` : ''}
    <p style="margin-top:14px; font-size:12.5px; color:#667085; line-height:1.5;">
      Account details are maintained by the administrator. Display and
      notification preferences are planned for a later version.
    </p>
  `;
  bg.style.display = 'flex';
}
