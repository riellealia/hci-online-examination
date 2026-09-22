/* Dedicated Admin workspaces for academic periods and account lifecycle. */
const AdminWorkspaces = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const backend = () => DB.backend?.() === 'sqlite';
  let periods = [];
  let accountSource = null;
  const accountView = { query: '', statuses: new Set(), group: '', sort: 'last', descending: false, open: '' };
  function message(value, type = 'error') { if (typeof notify === 'function') notify(value, type); }
  async function request(path, method = 'GET', body) {
    const token = sessionStorage.getItem('serverSessionToken') || '';
    const response = await fetch(path, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
    return payload;
  }
  function periodCard(item) {
    const actions = item.status === 'draft' ? `<button type="button" data-period-action="activate" data-id="${escapeHtml(item.id)}">Activate</button>` : item.status === 'active' ? `<button type="button" data-period-action="close" data-id="${escapeHtml(item.id)}">Review close</button>` : item.status === 'closed' ? `<button type="button" data-period-action="archive" data-id="${escapeHtml(item.id)}">Archive</button>` : '';
    const history = (item.history || []).map(event => `<li><span>${escapeHtml(event.status)}</span><small>${escapeHtml(event.at ? new Date(event.at).toLocaleString() : '')} · ${escapeHtml(event.actorId || 'system')}${event.reason ? ` · ${escapeHtml(event.reason)}` : ''}</small></li>`).join('');
    return `<article class="workspace-row"><div class="workspace-row-main"><div><strong>${escapeHtml(item.schoolYear)} · ${escapeHtml(item.term)}</strong><span class="workspace-badge ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></div><small>${escapeHtml(item.startDate || 'Date not set')} — ${escapeHtml(item.endDate || 'Date not set')}</small></div><div class="workspace-row-actions">${actions}<details><summary>History</summary><ul class="workspace-history">${history || '<li>No changes recorded.</li>'}</ul></details></div></article>`;
  }
  function renderPeriods() {
    const host = document.getElementById('academicPeriodsRoot');
    if (!host) return;
    const active = periods.find(item => item.status === 'active');
    host.innerHTML = `<header class="management-page-head"><h3>Academic periods</h3><p>Create terms, review rollover impact, and preserve closed-period records.</p></header><div class="workspace-summary"><div><span class="workspace-eyebrow">Current period</span><strong>${active ? `${escapeHtml(active.schoolYear)} · ${escapeHtml(active.term)}` : 'No active period'}</strong></div><span class="workspace-badge ${active ? 'active' : 'draft'}">${active ? 'Active' : 'Needs activation'}</span></div>${backend() ? `<form id="academicPeriodForm" class="workspace-form"><div class="workspace-form-head"><strong>New academic period</strong><span>Created as a draft</span></div><div class="workspace-fields"><label>School year<input name="schoolYear" placeholder="2026-2027" required pattern="[0-9]{4}-[0-9]{4}"></label><label>Term<select name="term"><option>First Semester</option><option>Second Semester</option><option>Summer</option><option>Special Term</option></select></label><label>Start date<input name="startDate" type="date" required></label><label>End date<input name="endDate" type="date" required></label><label>Enrollment start<input name="enrollmentStart" type="date"></label><label>Enrollment end<input name="enrollmentEnd" type="date"></label></div><button type="submit" class="workspace-primary">Create draft</button></form>` : '<p class="workspace-notice">Protected period changes require the SQLite server. Start the app through the server to create or roll over periods.</p>'}<div class="workspace-list-head"><strong>All periods</strong><span>${periods.length} total</span></div><div class="workspace-list">${periods.map(periodCard).join('') || '<p class="workspace-empty">No academic periods yet.</p>'}</div>`;
    host.querySelector('#academicPeriodForm')?.addEventListener('submit', createPeriod);
    host.querySelectorAll('[data-period-action]').forEach(button => button.addEventListener('click', () => periodAction(button.dataset.id, button.dataset.periodAction)));
  }
  async function loadPeriods() {
    if (backend()) periods = (await request('/api/academic-periods')).periods || [];
    else periods = DB.read('academicPeriods', []) || [];
    const count = document.getElementById('countAcademicPeriods');
    if (count) count.textContent = periods.length;
    renderPeriods();
  }
  async function createPeriod(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = Object.fromEntries(new FormData(form));
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try { await request('/api/academic-periods', 'POST', input); await loadPeriods(); message('Draft academic period created.', 'success'); }
    catch (error) { message(error.message); button.disabled = false; }
  }
  async function periodAction(id, action) {
    const item = periods.find(period => period.id === id);
    if (!item) return;
    try {
      let impactText = '';
      if (action === 'close') {
        const impact = await request(`/api/academic-periods/${encodeURIComponent(id)}/impact`);
        const totals = Object.entries(impact.counts || {}).filter(([, count]) => count).map(([name, count]) => `${count} ${name}`).join(', ');
        impactText = `Preserved records: ${totals || 'none'}. Pending approvals: ${impact.warnings?.pendingApprovals || 0}. Pending grading: ${impact.warnings?.pendingGrading || 0}.`;
      }
      const reason = action === 'activate' ? 'Academic period activated' : await textareaInputDialog({ title: `${action[0].toUpperCase()}${action.slice(1)} academic period`, label: `Reason required. ${impactText}`, confirmLabel: 'Continue', danger: true });
      if (reason === null || (action !== 'activate' && !reason.trim())) return;
      if (typeof confirmDialog === 'function' && !await confirmDialog({ title: `${action[0].toUpperCase()}${action.slice(1)} academic period?`, message: impactText || `This will ${action} ${item.schoolYear} · ${item.term}.`, confirmLabel: `${action[0].toUpperCase()}${action.slice(1)}`, danger: action !== 'activate' })) return;
      await request(`/api/academic-periods/${encodeURIComponent(id)}/${action}`, 'POST', { reason });
      await loadPeriods();
      message(`Academic period ${action === 'close' ? 'closed' : action === 'archive' ? 'archived' : 'activated'}. Reloading current records…`, 'success');
      if (action !== 'archive') setTimeout(() => location.reload(), 250);
    } catch (error) { message(error.message); }
  }
  function statusOf(user) { return user.lifecycleStatus || (user.disabled ? 'Deactivated' : 'Active'); }
  const accountIcon = paths => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths}</svg>`;
  function accountRecords() {
    const users = accountSource?.users || DB.read('users', []) || [];
    const students = accountSource?.students || DB.read('students', []) || [], faculty = accountSource?.faculty || DB.read('faculty', []) || [];
    return users.map(user => {
      const role = String(user.role || '').toLowerCase();
      const person = role === 'student' ? students.find(item => item.id === user.username) : ['faculty', 'professor'].includes(role) ? faculty.find(item => item.id === user.username) : null;
      const first = person?.first || user.first || '', last = person?.last || user.last || '';
      const group = role === 'student' ? 'Students' : ['faculty', 'professor'].includes(role) ? 'Professors' : role === 'coordinator' ? 'Faculty' : role === 'dean' ? 'Dean' : role === 'admin' ? 'Admin' : 'Other';
      return { user, id: String(user.username || user.id || ''), name: [first, last].filter(Boolean).join(' ') || user.name || user.displayName || String(user.username || user.id || 'Unknown account'), last: last || user.username || '', role, group, status: statusOf(user), person };
    });
  }
  async function loadAccounts() {
    if (backend()) {
      const [users, students, faculty] = await Promise.all(['users', 'students', 'faculty'].map(key => request(`/api/storage/${key}`)));
      accountSource = { users: users.value || [], students: students.value || [], faculty: faculty.value || [] };
      const count = document.getElementById('countLifecycleAccounts');
      if (count) count.textContent = accountSource.users.length;
    } else accountSource = null;
    renderAccounts();
  }
  function visibleAccounts(records) {
    const query = accountView.query.trim().toLowerCase();
    return records.filter(row => (!accountView.group || row.group === accountView.group) && (!query || [row.id, row.name, row.role, row.status].some(value => String(value).toLowerCase().includes(query))) && (!accountView.statuses.size || accountView.statuses.has(row.status))).sort((a, b) => {
      const field = accountView.sort === 'id' ? 'id' : accountView.sort === 'role' ? 'role' : accountView.sort === 'status' ? 'status' : 'last';
      const groupOrder = accountView.group ? a.group.localeCompare(b.group) : 0;
      return (groupOrder || String(a[field]).localeCompare(String(b[field]), undefined, { numeric: true, sensitivity: 'base' })) * (accountView.descending ? -1 : 1);
    });
  }
  function accountHistory(row) {
    const allowed = new Set(['user', 'student', 'faculty', 'student-account', 'faculty-account', 'account', 'coordinator', 'dean', 'admin']);
    const audit = (typeof AuditLog !== 'undefined' ? AuditLog.read() : []).filter(entry =>
      String(entry.entityId || '') === row.id && allowed.has(String(entry.entityType || '').toLowerCase())
      && !['profile-view', 'login', 'logout', 'create'].includes(String(entry.action || '').toLowerCase())
    ).map(entry => ({ at: entry.at, what: [entry.action, entry.reason || entry.details?.name || ''].filter(Boolean).join(' · '), actor: entry.actorId || 'system' }));
    const legacy = (row.user.lifecycleHistory || []).map(change => ({ at: change.at, what: `${change.from || '—'} → ${change.to || '—'}${change.reason ? ` · ${change.reason}` : ''}`, actor: change.actorId || change.actor || 'system' }));
    const seen = new Set(audit.map(item => `${item.at}|${item.actor}`));
    return [...audit, ...legacy.filter(item => !seen.has(`${item.at}|${item.actor}`))].filter(item => !Number.isNaN(Date.parse(item.at))).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }
  function accountCreatedYear(row) {
    const explicit = row.user.createdAt || row.user.createdDate || row.person?.createdAt;
    if (explicit && !Number.isNaN(Date.parse(explicit))) return String(new Date(explicit).getFullYear());
    const studentYear = row.role === 'student' && String(row.id).match(/^(20\d{2})[-_]/)?.[1];
    if (studentYear) return studentYear;
    const dates = accountHistory(row).map(item => Date.parse(item.at)).filter(Number.isFinite);
    return dates.length ? String(new Date(Math.min(...dates)).getFullYear()) : '—';
  }
  function ageOf(timestamp) {
    const elapsed = Math.max(0, Date.now() - Date.parse(timestamp));
    const minute = 60000, hour = 60 * minute, day = 24 * hour, year = 365 * day;
    const format = (count, unit) => `${count} ${unit}${count === 1 ? '' : 's'} ago`;
    if (elapsed < minute) return 'just now';
    if (elapsed < hour) return format(Math.floor(elapsed / minute), 'min');
    if (elapsed < day) return format(Math.floor(elapsed / hour), 'hr');
    if (elapsed < year) return format(Math.floor(elapsed / day), 'day');
    return format(Math.floor(elapsed / year), 'yr');
  }
  function accountRows(rows) {
    let previous = '';
    return rows.map(row => {
      const heading = accountView.group && row.group !== previous ? `<tr class="workspace-group-row"><td colspan="6">${escapeHtml(row.group)}</td></tr>` : '';
      previous = row.group;
      const history = accountHistory(row), summary = history.length ? `Edited ${ageOf(history[0].at)} · ${history.length} edit${history.length === 1 ? '' : 's'}` : 'No edits yet · 0 edits';
      return `${heading}<tr class="workspace-person-row" tabindex="0" data-account-id="${escapeHtml(row.id)}" aria-label="Open profile for ${escapeHtml(row.name)}"><td>${escapeHtml(row.id)}</td><td class="workspace-person-name">${escapeHtml(row.name)}</td><td>${escapeHtml(row.role)}</td><td>${escapeHtml(accountCreatedYear(row))}</td><td><span class="workspace-badge ${escapeHtml(row.status.toLowerCase())}">${escapeHtml(row.status)}</span></td><td><span class="workspace-history-pill">${escapeHtml(summary)}</span></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="workspace-empty">No accounts match these filters.</td></tr>';
  }
  function accountToolbar() {
    const search = accountIcon('<circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.2 4.2"/>');
    const filterIcon = accountIcon('<path d="M4 5h16l-6.2 7.1V19l-3.6 1v-7.9L4 5Z"/>');
    const group = accountIcon('<path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z"/>');
    const sort = accountIcon('<path d="M5 7h14M5 12h10M5 17h6"/>');
    const direction = accountIcon('<path d="M12 4v16m-5-5 5 5 5-5"/>');
    const upload = accountIcon('<path d="M12 17V4m-5 5 5-5 5 5M4 17v3h16v-3"/>');
    const download = accountIcon('<path d="M12 4v13m-5-5 5 5 5-5M4 17v3h16v-3"/>');
    return `<div class="lifecycle-tools"><div class="lifecycle-tools-left"><label class="lifecycle-icon" title="Import CSV" aria-label="Import CSV">${upload}<input id="lifecycleImport" type="file" accept=".csv,text/csv" aria-label="Import CSV"></label><button type="button" class="lifecycle-icon" id="lifecycleExport" title="Export CSV" aria-label="Export CSV">${download}</button></div><div class="lifecycle-tools-right"><div class="lifecycle-search" ${accountView.open === 'search' ? '' : 'hidden'}><input id="lifecycleSearch" type="search" value="${escapeHtml(accountView.query)}" placeholder="Search accounts" aria-label="Search accounts"></div><button type="button" class="lifecycle-icon" data-lifecycle-menu="search" aria-label="Search" title="Search" aria-expanded="${accountView.open === 'search'}">${search}</button><button type="button" class="lifecycle-icon" data-lifecycle-menu="filter" aria-label="Filter status" title="Filter status" aria-expanded="${accountView.open === 'filter'}">${filterIcon}</button><button type="button" class="lifecycle-icon" data-lifecycle-menu="group" aria-label="Group by" title="Group by" aria-expanded="${accountView.open === 'group'}">${group}</button><button type="button" class="lifecycle-icon" data-lifecycle-menu="sort" aria-label="Sort by" title="Sort by" aria-expanded="${accountView.open === 'sort'}">${sort}</button><button type="button" class="lifecycle-icon ${accountView.descending ? 'is-descending' : ''}" id="lifecycleDirection" aria-label="${accountView.descending ? 'Sort descending' : 'Sort ascending'}" title="${accountView.descending ? 'Descending' : 'Ascending'}">${direction}</button></div>${accountView.open === 'filter' ? `<div class="lifecycle-popover" role="group" aria-label="Filter account status"><strong>Filter status</strong>${['Active', 'Deactivated', 'Archived', 'Graduated', 'Transferred'].map(status => `<label><input type="checkbox" value="${status}" ${accountView.statuses.has(status) ? 'checked' : ''}>${status}</label>`).join('')}<div class="lifecycle-popover-actions"><button type="button" data-lifecycle-action="clear">Clear</button><button type="button" data-lifecycle-action="apply">Apply</button></div></div>` : ''}${accountView.open === 'group' ? `<div class="lifecycle-popover" role="group" aria-label="Group accounts"><strong>Group by</strong>${['', 'Students', 'Professors', 'Faculty', 'Admin', 'Dean'].map(value => `<label><input type="radio" name="lifecycleGroup" value="${value}" ${accountView.group === value ? 'checked' : ''}>${value || 'No grouping'}</label>`).join('')}</div>` : ''}${accountView.open === 'sort' ? `<div class="lifecycle-popover" role="group" aria-label="Sort accounts"><strong>Sort by</strong>${[['last', 'Last name'], ['id', 'ID'], ['role', 'Role'], ['status', 'Status']].map(([value, label]) => `<label><input type="radio" name="lifecycleSort" value="${value}" ${accountView.sort === value ? 'checked' : ''}>${label}</label>`).join('')}</div>` : ''}</div>`;
  }
  function renderAccounts() {
    const host = document.getElementById('accountLifecycleRoot');
    if (!host) return;
    const records = accountRecords(), users = records.map(row => row.user), visible = visibleAccounts(records);
    const statuses = ['Active', 'Deactivated', 'Archived', 'Graduated', 'Transferred'];
    host.innerHTML = `<div class="workspace-stats">${statuses.map(status => `<div><strong>${users.filter(user => statusOf(user) === status).length}</strong><span>${status}</span></div>`).join('')}</div>${accountToolbar()}<div class="workspace-table-scroll"><table class="workspace-table"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Created at</th><th>Status</th><th>History</th></tr></thead><tbody>${accountRows(visible)}</tbody></table></div><p class="workspace-notice">CSV import previews existing accounts only. Status changes, archive, and restore require the protected account-lifecycle workflow.</p>`;
    host.querySelectorAll('[data-lifecycle-menu]').forEach(button => button.addEventListener('click', () => { accountView.open = accountView.open === button.dataset.lifecycleMenu ? '' : button.dataset.lifecycleMenu; renderAccounts(); if (accountView.open === 'search') host.querySelector('#lifecycleSearch')?.focus(); }));
    host.querySelector('#lifecycleSearch')?.addEventListener('input', event => { accountView.query = event.target.value; host.querySelector('tbody').innerHTML = accountRows(visibleAccounts(accountRecords())); });
    host.querySelector('[data-lifecycle-action="apply"]')?.addEventListener('click', () => { accountView.statuses = new Set([...host.querySelectorAll('.lifecycle-popover input:checked')].map(input => input.value)); accountView.open = ''; renderAccounts(); });
    host.querySelector('[data-lifecycle-action="clear"]')?.addEventListener('click', () => { accountView.statuses.clear(); accountView.open = ''; renderAccounts(); });
    host.querySelectorAll('input[name="lifecycleGroup"]').forEach(input => input.addEventListener('change', () => { accountView.group = input.value; accountView.open = ''; renderAccounts(); }));
    host.querySelectorAll('input[name="lifecycleSort"]').forEach(input => input.addEventListener('change', () => { accountView.sort = input.value; accountView.open = ''; renderAccounts(); }));
    host.querySelector('#lifecycleDirection').addEventListener('click', () => { accountView.descending = !accountView.descending; renderAccounts(); });
    host.querySelector('#lifecycleExport').addEventListener('click', () => exportAccounts(visibleAccounts(accountRecords())));
    host.querySelector('#lifecycleImport').addEventListener('change', importAccounts);
    host.querySelector('tbody').addEventListener('click', event => { const row = event.target.closest('[data-account-id]'); if (row) openAccountProfile(row.dataset.accountId); });
    host.querySelector('tbody').addEventListener('keydown', event => { if (event.key !== 'Enter' && event.key !== ' ') return; const row = event.target.closest('[data-account-id]'); if (row) { event.preventDefault(); openAccountProfile(row.dataset.accountId); } });
  }
  function openAccountProfile(id) {
    const row = accountRecords().find(item => item.id === id);
    if (!row) return;
    const history = accountHistory(row), actors = [...new Set(history.map(item => item.actor))].sort();
    const view = { tab: 'profile', query: '', actor: '', oldest: false, group: '', open: '' };
    const modal = document.createElement('div');
    modal.className = 'modal-bg confirm-bg lifecycle-profile-bg'; modal.style.display = 'flex';
    const icon = (label, paths, action) => `<button type="button" class="lifecycle-icon" data-history-action="${action}" aria-label="${label}" title="${label}">${accountIcon(paths)}</button>`;
    function historyBody() {
      const query = view.query.trim().toLowerCase();
      const entries = history.filter(item => (!view.actor || item.actor === view.actor) && (!query || [item.what, item.actor, item.at].some(value => String(value).toLowerCase().includes(query))));
      if (view.oldest) entries.reverse();
      if (view.group) entries.sort((a, b) => String(a[view.group]).localeCompare(String(b[view.group])) || ((Date.parse(b.at) - Date.parse(a.at)) * (view.oldest ? -1 : 1)));
      let prior = '';
      return entries.map(item => { const key = view.group ? item[view.group] : ''; const heading = view.group && key !== prior ? `<tr class="workspace-group-row"><td colspan="3">${escapeHtml(key)}</td></tr>` : ''; prior = key; return `${heading}<tr><td>${escapeHtml(new Date(item.at).toLocaleString())}</td><td>${escapeHtml(item.what)}</td><td>${escapeHtml(item.actor)}</td></tr>`; }).join('') || '<tr><td colspan="3" class="workspace-empty">No history matches.</td></tr>';
    }
    function render() {
      modal.innerHTML = `<div class="modal lifecycle-profile" role="dialog" aria-modal="true" aria-label="Account profile"><header class="lifecycle-profile-head"><div><span class="workspace-eyebrow">Account profile</span><h3>${escapeHtml(row.name)}</h3><p>${escapeHtml(row.id)} · ${escapeHtml(row.role)} <span class="workspace-badge ${escapeHtml(row.status.toLowerCase())}">${escapeHtml(row.status)}</span></p></div><button type="button" class="lifecycle-profile-close" aria-label="Close profile">×</button></header><nav class="lifecycle-profile-tabs" role="tablist" aria-label="Account profile tabs"><button type="button" role="tab" data-profile-tab="profile" aria-selected="${view.tab === 'profile'}">Public profile</button><button type="button" role="tab" data-profile-tab="history" aria-selected="${view.tab === 'history'}">History</button></nav>${view.tab === 'profile' ? `<div class="lifecycle-profile-content"><dl><div><dt>ID</dt><dd>${escapeHtml(row.id)}</dd></div><div><dt>Name</dt><dd>${escapeHtml(row.name)}</dd></div><div><dt>Role</dt><dd>${escapeHtml(row.role)}</dd></div><div><dt>Status</dt><dd>${escapeHtml(row.status)}</dd></div>${row.person?.email || row.user.email ? `<div><dt>Email</dt><dd>${escapeHtml(row.person?.email || row.user.email)}</dd></div>` : ''}</dl></div>` : `<div class="lifecycle-history-content"><div class="lifecycle-history-tools"><div class="lifecycle-search" ${view.open === 'search' ? '' : 'hidden'}><input type="search" id="historySearch" aria-label="Search history" placeholder="Search history" value="${escapeHtml(view.query)}"></div>${icon('Search history','<circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.2 4.2"/>','search')}${icon('Filter by editor','<path d="M4 5h16l-6.2 7.1V19l-3.6 1v-7.9L4 5Z"/>','filter')}${icon(view.oldest ? 'Oldest first' : 'Latest first','<path d="M5 7h14M5 12h10M5 17h6"/>','order')}${icon('Group history','<path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z"/>','group')}${view.open === 'filter' ? `<div class="lifecycle-popover"><strong>Who made the change</strong><label><input type="radio" name="historyActor" value="" ${view.actor ? '' : 'checked'}>All editors</label>${actors.map(actor => `<label><input type="radio" name="historyActor" value="${escapeHtml(actor)}" ${view.actor === actor ? 'checked' : ''}>${escapeHtml(actor)}</label>`).join('')}</div>` : ''}${view.open === 'group' ? `<div class="lifecycle-popover"><strong>Group by</strong>${[['', 'No grouping'], ['actor', 'Editor'], ['what', 'What changed']].map(([value, label]) => `<label><input type="radio" name="historyGroup" value="${value}" ${view.group === value ? 'checked' : ''}>${label}</label>`).join('')}</div>` : ''}</div><div class="workspace-table-scroll"><table class="workspace-table"><thead><tr><th>Time and date</th><th>What changed</th><th>Who changed</th></tr></thead><tbody>${historyBody()}</tbody></table></div></div>`}</div>`;
      modal.querySelector('.lifecycle-profile-close').addEventListener('click', close);
      modal.querySelectorAll('[data-profile-tab]').forEach(button => button.addEventListener('click', () => { view.tab = button.dataset.profileTab; view.open = ''; render(); }));
      modal.querySelectorAll('[data-history-action]').forEach(button => button.addEventListener('click', () => { const action = button.dataset.historyAction; if (action === 'order') view.oldest = !view.oldest; else view.open = view.open === action ? '' : action; render(); if (view.open === 'search') modal.querySelector('#historySearch')?.focus(); }));
      modal.querySelector('#historySearch')?.addEventListener('input', event => { view.query = event.target.value; modal.querySelector('tbody').innerHTML = historyBody(); });
      modal.querySelectorAll('input[name="historyActor"]').forEach(input => input.addEventListener('change', () => { view.actor = input.value; view.open = ''; render(); }));
      modal.querySelectorAll('input[name="historyGroup"]').forEach(input => input.addEventListener('change', () => { view.group = input.value; view.open = ''; render(); }));
    }
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    render(); modal.querySelector('.lifecycle-profile-close').focus();
  }
  function exportAccounts(rows) {
    const csv = ['ID,Name,Role,Created At,Status,History', ...rows.map(row => [row.id, row.name, row.role, accountCreatedYear(row), row.status, JSON.stringify(accountHistory(row))].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'account-lifecycle.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }
  async function importAccounts(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2 || !/^ID,Name,Role,Created At,Status,History$/i.test(lines[0].trim())) throw new Error('Use the Account Lifecycle CSV export format (ID, Name, Role, Created At, Status, History).');
      const ids = accountRecords().map(row => row.id);
      const matched = lines.slice(1).filter(line => ids.some(id => line.startsWith(`"${id.replace(/"/g, '""')}",`))).length;
      await confirmDialog({ title: 'Account CSV preview', message: `${lines.length - 1} rows found; ${matched} IDs match existing accounts. Importing lifecycle changes is not enabled until the protected account-lifecycle workflow is implemented. No records will be changed.`, confirmLabel: 'Close' });
    } catch (error) { message(error.message); }
  }
  function mount() { loadPeriods().catch(error => { message(error.message); renderPeriods(); }); loadAccounts().catch(error => message(error.message)); }
  return { mount, periods: () => loadPeriods().catch(error => message(error.message)), accounts: () => loadAccounts().catch(error => message(error.message)) };
})();
