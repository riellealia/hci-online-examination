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
    ${items.map(it => `
      <a id="link-${it.id}" href="#${it.id}" data-panel="${it.id}">
        <span class="nav-icon" aria-hidden="true">${it.icon || ''}</span>
        <span>${it.label}</span>
        ${Number(it.badge)>0?`<span class="nav-count" aria-label="${Number(it.badge)} pending">${Number(it.badge)}</span>`:''}
      </a>`).join('')}
  `;
  document.body.appendChild(bar);

  const known = panels || items.map(i => i.id);

  function setOpen(open) {
    bar.style.width = open ? '260px' : '0';
    menuBtn.setAttribute('aria-expanded', String(open));
  }

  function show(id) {
    known.forEach(p => {
      const el = document.getElementById(p);
      if (el) el.style.display = (p === id) ? 'block' : 'none';
    });
    bar.querySelectorAll('a').forEach(a =>
      a.classList.toggle('active', a.dataset.panel === id));

    const item = items.find(i => i.id === id);
    if (titleEl && item) {
      const t = typeof titleEl === 'string' ? document.querySelector(titleEl) : titleEl;
      if (t) t.textContent = item.label;
    }
    setOpen(false);
    if (onSelect) onSelect(id);
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

  show(startAt || items[0].id);
  return { show, open: () => setOpen(true), close: () => setOpen(false) };
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

function textareaInputDialog({ title = 'Add a note', label = 'Note', value = '', confirmLabel = 'Save', danger = false } = {}) {
  return new Promise(resolve => {
    const bg=document.createElement('div');
    bg.className='modal-bg confirm-bg';bg.style.display='flex';
    bg.innerHTML=`<div class="modal confirm-box" role="dialog" aria-modal="true"><h3></h3><label class="dialog-input-label"><span></span><textarea rows="4"></textarea></label><div class="confirm-actions"><button type="button" class="confirm-cancel">Cancel</button><button type="button" class="confirm-ok ${danger?'is-danger':''}">${confirmLabel}</button></div></div>`;
    bg.querySelector('h3').textContent=title;bg.querySelector('label span').textContent=label;
    const input=bg.querySelector('textarea');input.value=value;
    document.body.appendChild(bg);
    const done=result=>{bg.remove();resolve(result)};
    bg.querySelector('.confirm-cancel').onclick=()=>done(null);
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
  let inboxItems = announcements.filter(item => !item.audience || item.audience === 'all' || item.audience === role)
    .map(item => ({kind:'Announcement',title:item.title||'Admin announcement',text:item.message||'',at:item.createdAt,pending:!item.read}));
  if (role === 'faculty') {
    const owned = new Set(exams.filter(exam => exam.facultyId === id).map(exam => exam.id));
    inboxItems.push(...reports.filter(report => owned.has(report.examId)).map(report => ({kind:`Report · ${report.status}`,title:report.category||'Question report',text:report.details||'',at:report.createdAt,pending:report.status==='open'})));
    inboxItems.push(...emails.filter(email => email.facultyId === id).map(email => ({kind:'Student mail',title:email.subject||'Message from student',text:email.message||'',at:email.sentAt,pending:email.read!==true})));
  } else if (role === 'student') {
    inboxItems.push(...reportNotices.filter(item => item.studentId === id).map(item => ({kind:'Report update',title:'Question report status',text:item.message||'',at:item.createdAt,pending:item.read!==true})));
  } else if (role === 'admin') {
    const openCount = reports.filter(report => report.status === 'open').length;
    if (reports.length) inboxItems.push({kind:'System status',title:'Question reports',text:`${openCount} pending · ${reports.length} total`,at:new Date().toISOString(),pending:openCount>0});
  }
  inboxItems.sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')));
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
        <header><strong>Inbox</strong><span>${pendingInboxCount} pending</span></header>
        <div class="header-inbox-list">${inboxItems.length?inboxItems.slice(0,12).map(item=>`<article class="header-inbox-item${item.pending?' pending':''}"><span>${safe(item.kind)}</span><strong>${safe(item.title)}</strong><p>${safe(item.text)}</p></article>`).join(''):'<p class="header-inbox-empty">No messages or updates.</p>'}</div>
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
