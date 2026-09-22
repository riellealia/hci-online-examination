/* Dedicated Admin workspaces for academic periods and account lifecycle. */
const AdminWorkspaces = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const backend = () => DB.backend?.() === 'sqlite';
  let periods = [];
  let accountSource = null;
  const accountView = { query: '', statuses: new Set(), group: '', sort: 'last', descending: false, open: '', renderLimit: 100, batchSize: 100, collapsedGroups: new Set() };
  let accountObserver = null;
  let accountAuditByEntity = new Map();
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
    const studentById = new Map(students.map(item => [item.id, item])), facultyById = new Map(faculty.map(item => [item.id, item]));
    return users.map(user => {
      const role = String(user.role || '').toLowerCase();
      const person = role === 'student' ? studentById.get(user.username) : ['faculty', 'professor'].includes(role) ? facultyById.get(user.username) : null;
      const first = person?.first || user.first || '', last = person?.last || user.last || '';
      const group = role === 'student' ? 'Students' : ['faculty', 'professor'].includes(role) ? 'Professors' : role === 'coordinator' ? 'Faculty' : role === 'dean' ? 'Dean' : role === 'admin' ? 'Admin' : 'Other';
      return { user, id: String(user.username || user.id || ''), name: [first, last].filter(Boolean).join(' ') || user.name || user.displayName || String(user.username || user.id || 'Unknown account'), last: last || user.username || '', role, group, status: statusOf(user), person };
    });
  }
  function indexAccountAudit() {
    accountAuditByEntity = new Map();
    const allowed = new Set(['user', 'student', 'faculty', 'student-account', 'faculty-account', 'account', 'coordinator', 'dean', 'admin']);
    for (const entry of typeof AuditLog !== 'undefined' ? AuditLog.read() : []) {
      if (!allowed.has(String(entry.entityType || '').toLowerCase()) || ['profile-view', 'login', 'logout', 'create'].includes(String(entry.action || '').toLowerCase())) continue;
      const id = String(entry.entityId || '');
      if (!accountAuditByEntity.has(id)) accountAuditByEntity.set(id, []);
      accountAuditByEntity.get(id).push({ at: entry.at, what: [entry.action, entry.reason || entry.details?.name || ''].filter(Boolean).join(' · '), actor: entry.actorId || 'system' });
    }
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
    return records.filter(row => (!query || [row.id, row.name, row.role, row.status].some(value => String(value).toLowerCase().includes(query))) && (!accountView.statuses.size || accountView.statuses.has(row.status))).sort((a, b) => {
      const field = accountView.sort === 'id' ? 'id' : accountView.sort === 'role' ? 'role' : accountView.sort === 'status' ? 'status' : 'last';
      const groupOrder = accountView.group ? groupValue(a).localeCompare(groupValue(b), undefined, { numeric: true, sensitivity: 'base' }) : 0;
      return (groupOrder || String(a[field]).localeCompare(String(b[field]), undefined, { numeric: true, sensitivity: 'base' })) * (accountView.descending ? -1 : 1);
    });
  }
  function accountHistory(row) {
    const audit = accountAuditByEntity.get(row.id) || [];
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
  function groupValue(row) {
    if (accountView.group === 'status') return row.status;
    if (accountView.group === 'year') return accountCreatedYear(row) === '—' ? 'Unknown year' : accountCreatedYear(row);
    if (accountView.group === 'role') return row.role === 'faculty' ? 'Professor' : titleCase(row.role);
    if (accountView.group === 'edited') return accountHistory(row).length ? 'Edited' : 'Not edited';
    if (accountView.group === 'not-edited') return accountHistory(row).length ? '2 · Edited' : '1 · Not edited';
    return '';
  }
  function titleCase(value) { const text = String(value || 'Unknown'); return text.charAt(0).toUpperCase() + text.slice(1); }
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
  function accountLifecycleActionMenu(row) {
    const label = escapeHtml(row.name);
    return `<div class="section-action-wrap admin-row-action"><button type="button" class="table-icon-btn section-action-trigger" onclick="toggleSectionActionMenu(event)" aria-label="Actions for ${label}" title="Actions" aria-haspopup="menu" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.8 7.8 0 0 0 0-2l2.1-1.6-2-3.4-2.5 1a8 8 0 0 0-1.7-1L15 3.3h-4L10.6 6a8 8 0 0 0-1.7 1L6.5 6l-2 3.4L6.6 11a7.8 7.8 0 0 0 0 2l-2.1 1.6 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.4 2.7h4l.4-2.7a8 8 0 0 0 1.7-1l2.4 1 2-3.4L19.4 13ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/></svg></button><nav class="section-action-menu" role="menu" aria-label="Actions for ${label}"><button type="button" role="menuitem" onclick="closeSectionActionMenu(event);AdminWorkspaces.editAccountStatus('${row.id}')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5.25 3.4 9.74 8 11 4.6-1.26 8-5.75 8-11V5l-8-3Zm-1.2 14.2-3.2-3.2 1.4-1.4 1.8 1.8 4.6-4.6 1.4 1.4-6 6Z"/></svg><span>Edit status</span></button></nav></div>`;
  }
  function accountRows(rows, allVisibleRows = rows) {
    let previous = '', hydrated = 0, markup = '';
    const groupCounts = new Map();
    if (accountView.group) allVisibleRows.forEach(row => { const key = groupValue(row); groupCounts.set(key, (groupCounts.get(key) || 0) + 1); });
    for (const row of rows) {
      const group = groupValue(row), displayGroup = group.replace(/^\d · /, '');
      const collapsed = accountView.collapsedGroups.has(group);
      if (!collapsed && hydrated >= accountView.renderLimit) break;
      const heading = accountView.group && group !== previous ? `<tr class="workspace-group-row"><td colspan="7"><button type="button" class="workspace-group-toggle" data-account-group="${escapeHtml(group)}" aria-expanded="${!collapsed}"><span class="workspace-group-chevron" aria-hidden="true">&#9662;</span><span>${escapeHtml(displayGroup)}</span><span class="workspace-group-count">${groupCounts.get(group) || 0}</span></button></td></tr>` : '';
      previous = group;
      markup += heading;
      if (collapsed) continue;
      const history = accountHistory(row), summary = history.length ? `Edited ${ageOf(history[0].at)} · ${history.length} edit${history.length === 1 ? '' : 's'}` : 'No edits yet · 0 edits';
      markup += `<tr class="workspace-person-row" tabindex="0" data-account-id="${escapeHtml(row.id)}" data-account-group-row="${escapeHtml(group)}" aria-label="Open profile for ${escapeHtml(row.name)}"><td>${escapeHtml(row.id)}</td><td class="workspace-person-name">${escapeHtml(row.name)}</td><td>${escapeHtml(row.role)}</td><td>${escapeHtml(accountCreatedYear(row))}</td><td><span class="workspace-badge ${escapeHtml(row.status.toLowerCase())}">${escapeHtml(row.status)}</span></td><td><span class="workspace-history-pill">${escapeHtml(summary)}</span></td><td>${accountLifecycleActionMenu(row)}</td></tr>`;
      hydrated += 1;
    }
    return markup || '<tr><td colspan="7" class="workspace-empty">No accounts match these filters.</td></tr>';
  }
  function accountToolbar() {
    const search = accountIcon('<circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.2 4.2"/>');
    const filterIcon = accountIcon('<path d="M4 5h16l-6.2 7.1V19l-3.6 1v-7.9L4 5Z"/>');
    const group = accountIcon('<path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z"/>');
    const sort = accountIcon('<path d="M5 7h14M5 12h10M5 17h6"/>');
    const direction = accountIcon('<path d="M12 4v16m-5-5 5 5 5-5"/>');
    const upload = accountIcon('<path d="M12 17V4m-5 5 5-5 5 5M4 17v3h16v-3"/>');
    const download = accountIcon('<path d="M12 4v13m-5-5 5 5 5-5M4 17v3h16v-3"/>');
    return `<div class="lifecycle-tools"><div class="lifecycle-tools-left"><label class="lifecycle-icon" title="Import CSV" aria-label="Import CSV">${upload}<input id="lifecycleImport" type="file" accept=".csv,text/csv" aria-label="Import CSV"></label><button type="button" class="lifecycle-icon" id="lifecycleExport" title="Export CSV" aria-label="Export CSV">${download}</button></div><div class="lifecycle-tools-right"><div class="lifecycle-search" ${accountView.open === 'search' ? '' : 'hidden'}><input id="lifecycleSearch" type="search" value="${escapeHtml(accountView.query)}" placeholder="Search accounts" aria-label="Search accounts"></div><button type="button" class="lifecycle-icon" data-lifecycle-menu="search" aria-label="Search" title="Search" aria-expanded="${accountView.open === 'search'}">${search}</button><button type="button" class="lifecycle-icon" data-lifecycle-menu="filter" aria-label="Filter status" title="Filter status" aria-expanded="${accountView.open === 'filter'}">${filterIcon}</button><button type="button" class="lifecycle-icon" data-lifecycle-menu="group" aria-label="Group by" title="Group by" aria-expanded="${accountView.open === 'group'}">${group}</button><button type="button" class="lifecycle-icon" data-lifecycle-menu="sort" aria-label="Sort by" title="Sort by" aria-expanded="${accountView.open === 'sort'}">${sort}</button><button type="button" class="lifecycle-icon ${accountView.descending ? 'is-descending' : ''}" id="lifecycleDirection" aria-label="${accountView.descending ? 'Sort descending' : 'Sort ascending'}" title="${accountView.descending ? 'Descending' : 'Ascending'}">${direction}</button></div>${accountView.open === 'filter' ? `<div class="lifecycle-popover" role="group" aria-label="Filter account status"><strong>Filter status</strong>${['Active', 'Deactivated', 'Archived', 'Graduated', 'Transferred'].map(status => `<label><input type="checkbox" value="${status}" ${accountView.statuses.has(status) ? 'checked' : ''}>${status}</label>`).join('')}<div class="lifecycle-popover-actions"><button type="button" data-lifecycle-action="clear">Clear</button><button type="button" data-lifecycle-action="apply">Apply</button></div></div>` : ''}${accountView.open === 'group' ? `<div class="lifecycle-popover" role="group" aria-label="Group accounts"><strong>Group by</strong>${[['', 'No grouping'], ['status', 'Status'], ['year', 'Creation year'], ['edited', 'Edited'], ['not-edited', 'Not edited'], ['role', 'Role']].map(([value, label]) => `<label><input type="radio" name="lifecycleGroup" value="${value}" ${accountView.group === value ? 'checked' : ''}>${label}</label>`).join('')}</div>` : ''}${accountView.open === 'sort' ? `<div class="lifecycle-popover" role="group" aria-label="Sort accounts"><strong>Sort by</strong>${[['last', 'Last name'], ['id', 'ID'], ['role', 'Role'], ['status', 'Status']].map(([value, label]) => `<label><input type="radio" name="lifecycleSort" value="${value}" ${accountView.sort === value ? 'checked' : ''}>${label}</label>`).join('')}</div>` : ''}</div>`;
  }
  function hydratableAccountCount(rows) {
    return accountView.group ? rows.filter(row => !accountView.collapsedGroups.has(groupValue(row))).length : rows.length;
  }
  function accountHydrationMarkup(host, rows) {
    const available = hydratableAccountCount(rows), hydrated = Math.min(accountView.renderLimit, available), more = hydrated < available;
    return `<div class="lifecycle-hydration" aria-live="polite"><span>Showing ${hydrated} of ${available}${available !== rows.length ? ` · ${rows.length - available} collapsed` : ''}</span>${more ? '<button type="button" data-lifecycle-more>Scroll to load more</button>' : '<span>All matching accounts loaded</span>'}</div>`;
  }
  function observeAccountHydration(host) {
    accountObserver?.disconnect();
    const sentinel = host.querySelector('[data-lifecycle-more]');
    if (!sentinel || typeof IntersectionObserver === 'undefined') return;
    accountObserver = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { accountObserver.disconnect(); accountView.renderLimit += accountView.batchSize; updateAccountTable(host); } }, { rootMargin: '300px 0px' });
    accountObserver.observe(sentinel);
  }
  function updateAccountTable(host) {
    const visible = visibleAccounts(accountRecords());
    host.querySelector('tbody').innerHTML = accountRows(visible, visible);
    host.querySelector('.lifecycle-hydration')?.remove();
    host.querySelector('.workspace-table-scroll').insertAdjacentHTML('afterend', accountHydrationMarkup(host, visible));
    observeAccountHydration(host);
  }
  function renderAccounts() {
    const host = document.getElementById('accountLifecycleRoot');
    if (!host) return;
    indexAccountAudit();
    const records = accountRecords(), users = records.map(row => row.user), visible = visibleAccounts(records);
    const statuses = ['Active', 'Deactivated', 'Archived', 'Graduated', 'Transferred'];
    host.innerHTML = `<div class="workspace-stats">${statuses.map(status => `<div><strong>${users.filter(user => statusOf(user) === status).length}</strong><span>${status}</span></div>`).join('')}</div>${accountToolbar()}<div class="workspace-table-scroll"><table class="workspace-table"><thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Created at</th><th>Status</th><th>History</th><th>Actions</th></tr></thead><tbody>${accountRows(visible, visible)}</tbody></table></div>${accountHydrationMarkup(host, visible)}<p class="workspace-notice">Use a row's Actions menu (or right-click) to change an account's status. CSV import previews existing accounts only; bulk status changes are not yet enabled.</p>`;
    host.querySelectorAll('[data-lifecycle-menu]').forEach(button => button.addEventListener('click', () => { accountView.open = accountView.open === button.dataset.lifecycleMenu ? '' : button.dataset.lifecycleMenu; renderAccounts(); if (accountView.open === 'search') host.querySelector('#lifecycleSearch')?.focus(); }));
    host.querySelector('#lifecycleSearch')?.addEventListener('input', event => { accountView.query = event.target.value; accountView.renderLimit = accountView.batchSize; updateAccountTable(host); });
    host.querySelector('[data-lifecycle-action="apply"]')?.addEventListener('click', () => { accountView.statuses = new Set([...host.querySelectorAll('.lifecycle-popover input:checked')].map(input => input.value)); accountView.renderLimit = accountView.batchSize; accountView.open = ''; renderAccounts(); });
    host.querySelector('[data-lifecycle-action="clear"]')?.addEventListener('click', () => { accountView.statuses.clear(); accountView.renderLimit = accountView.batchSize; accountView.open = ''; renderAccounts(); });
    host.querySelectorAll('input[name="lifecycleGroup"]').forEach(input => input.addEventListener('change', () => { accountView.group = input.value; accountView.collapsedGroups.clear(); accountView.renderLimit = accountView.batchSize; accountView.open = ''; renderAccounts(); }));
    host.querySelectorAll('input[name="lifecycleSort"]').forEach(input => input.addEventListener('change', () => { accountView.sort = input.value; accountView.page = 1; accountView.open = ''; renderAccounts(); }));
    host.querySelector('#lifecycleDirection').addEventListener('click', () => { accountView.descending = !accountView.descending; renderAccounts(); });
    host.querySelector('#lifecycleExport').addEventListener('click', () => exportAccounts(visibleAccounts(accountRecords())));
    host.querySelector('#lifecycleImport').addEventListener('change', importAccounts);
    if (!host.dataset.lifecycleHydration) {
      host.dataset.lifecycleHydration = 'true';
      host.addEventListener('click', event => {
        const groupButton = event.target.closest('[data-account-group]');
        if (groupButton) { const group = groupButton.dataset.accountGroup; accountView.collapsedGroups.has(group) ? accountView.collapsedGroups.delete(group) : accountView.collapsedGroups.add(group); accountView.renderLimit = accountView.batchSize; updateAccountTable(host); return; }
        if (event.target.closest('[data-lifecycle-more]')) { accountView.renderLimit += accountView.batchSize; updateAccountTable(host); }
      });
    }
    observeAccountHydration(host);
    host.querySelector('tbody').addEventListener('click', event => { const row = event.target.closest('[data-account-id]'); if (row) openAccountProfile(row.dataset.accountId); });
    host.querySelector('tbody').addEventListener('keydown', event => { if (event.key !== 'Enter' && event.key !== ' ') return; const row = event.target.closest('[data-account-id]'); if (row) { event.preventDefault(); openAccountProfile(row.dataset.accountId); } });
  }
  function openAccountProfile(id) {
    const row = accountRecords().find(item => item.id === id);
    if (!row) return;
    const history = accountHistory(row), actors = [...new Set(history.map(item => item.actor))].sort();
    const view = { tab: 'history', query: '', actor: '', oldest: false, group: '', open: '' };
    const modal = document.createElement('div');
    modal.className = 'modal-bg student-profile-bg lifecycle-profile-bg'; modal.style.display = 'flex';
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
      const initials = row.name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AC';
      const profile = `<section class="lifecycle-profile-content"><header><div><h3>Public profile</h3><p>Account identity and access information.</p></div></header><dl><div><dt>ID</dt><dd>${escapeHtml(row.id)}</dd></div><div><dt>Name</dt><dd>${escapeHtml(row.name)}</dd></div><div><dt>Role</dt><dd>${escapeHtml(row.role)}</dd></div><div><dt>Created at</dt><dd>${escapeHtml(accountCreatedYear(row))}</dd></div><div><dt>Status</dt><dd>${escapeHtml(row.status)}</dd></div>${row.person?.email || row.user.email ? `<div><dt>Email</dt><dd>${escapeHtml(row.person?.email || row.user.email)}</dd></div>` : ''}</dl></section>`;
      const historyPanel = `<section class="student-enrollment-manager lifecycle-history-content"><header><div><h3>Account history</h3><p>Changes to this person’s account, shown from latest to oldest.</p></div></header><div class="lifecycle-history-tools"><div class="lifecycle-search" ${view.open === 'search' ? '' : 'hidden'}><input type="search" id="historySearch" aria-label="Search history" placeholder="Search history" value="${escapeHtml(view.query)}"></div>${icon('Search history','<circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.2 4.2"/>','search')}${icon('Filter by editor','<path d="M4 5h16l-6.2 7.1V19l-3.6 1v-7.9L4 5Z"/>','filter')}${icon(view.oldest ? 'Oldest first' : 'Latest first','<path d="M5 7h14M5 12h10M5 17h6"/>','order')}${icon('Group history','<path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v6H4zM14 15h6v6h-6z"/>','group')}${view.open === 'filter' ? `<div class="lifecycle-popover"><strong>Who made the change</strong><label><input type="radio" name="historyActor" value="" ${view.actor ? '' : 'checked'}>All editors</label>${actors.map(actor => `<label><input type="radio" name="historyActor" value="${escapeHtml(actor)}" ${view.actor === actor ? 'checked' : ''}>${escapeHtml(actor)}</label>`).join('')}</div>` : ''}${view.open === 'group' ? `<div class="lifecycle-popover"><strong>Group by</strong>${[['', 'No grouping'], ['actor', 'Editor'], ['what', 'What changed']].map(([value, label]) => `<label><input type="radio" name="historyGroup" value="${value}" ${view.group === value ? 'checked' : ''}>${label}</label>`).join('')}</div>` : ''}</div><div class="workspace-table-scroll"><table class="workspace-table"><thead><tr><th>Time and date</th><th>What changed</th><th>Who changed</th></tr></thead><tbody>${historyBody()}</tbody></table></div></section>`;
      modal.innerHTML = `<div class="student-profile-page lifecycle-account-page" role="dialog" aria-modal="true" aria-label="Account profile"><header class="student-profile-head"><div class="profile-hero-identity"><div class="profile-avatar ${row.group === 'Professors' ? 'faculty-avatar' : ''}" aria-hidden="true">${escapeHtml(initials)}</div><div><p class="profile-eyebrow">${escapeHtml(row.role)} administration</p><h2>${escapeHtml(row.name)}</h2><p>${escapeHtml(row.id)} · Account ${escapeHtml(row.status.toLowerCase())}</p></div></div><div class="student-enrollment-head-actions"><details class="student-command-menu"><summary aria-label="Account profile sections" title="Profile sections">&#8942;</summary><nav aria-label="Account profile sections"><button type="button" data-profile-tab="history"><span aria-hidden="true">&#9719;</span><span>View history</span></button><button type="button" data-profile-tab="profile"><span aria-hidden="true">&#128100;</span><span>View public profile</span></button></nav></details><button type="button" class="profile-close lifecycle-profile-close" aria-label="Close profile" title="Close">×</button></div></header><nav class="profile-tabs lifecycle-profile-tabs" role="tablist" aria-label="Account profile sections"><button type="button" class="profile-tab ${view.tab === 'history' ? 'active' : ''}" role="tab" data-profile-tab="history" aria-selected="${view.tab === 'history'}">History</button><button type="button" class="profile-tab ${view.tab === 'profile' ? 'active' : ''}" role="tab" data-profile-tab="profile" aria-selected="${view.tab === 'profile'}">Public profile</button></nav><main class="lifecycle-profile-main">${view.tab === 'profile' ? profile : historyPanel}</main></div>`;
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
      await confirmDialog({ title: 'Account CSV preview', message: `${lines.length - 1} rows found; ${matched} IDs match existing accounts. Bulk status changes are not enabled yet. No records will be changed.`, confirmLabel: 'Close' });
    } catch (error) { message(error.message); }
  }

  /* ---------- Account status actions (deactivate/archive/restore/graduate/transfer) ---------- */
  const NEXT_ACTIONS = {
    Active: ['deactivate', 'archive', 'graduate', 'transfer'],
    Deactivated: ['reactivate', 'archive', 'graduate', 'transfer'],
    Archived: ['restore'],
    Graduated: ['restore'],
    Transferred: ['restore']
  };
  const TOGGLE_ACTIONS = new Set(['deactivate', 'reactivate']);
  const REASON_REQUIRED_ACTIONS = new Set(['archive', 'graduate', 'transfer']);
  const STUDENT_ONLY_ACTIONS = new Set(['graduate', 'transfer']);
  const ACTION_META = {
    deactivate: { label: 'Deactivate account', status: 'Deactivated', help: 'Prevents sign-in. Academic records remain available.' },
    reactivate: { label: 'Reactivate account', status: 'Active', help: 'This account will be able to sign in again.' },
    archive: { label: 'Archive account', status: 'Archived', help: 'Hides the account from active lists. Academic records remain available.' },
    restore: { label: 'Restore account', status: 'Active', help: 'Returns the account to active lists and lets it sign in again.' },
    graduate: { label: 'Mark as graduated', status: 'Graduated', help: 'Marks the student graduated and hides the account from active lists.' },
    transfer: { label: 'Mark as transferred', status: 'Transferred', help: 'Marks the student transferred and hides the account from active lists.' }
  };
  function entityTypeFor(role) { return role === 'student' ? 'student-account' : ['faculty', 'professor'].includes(role) ? 'faculty-account' : 'account'; }
  /* Single prompt: a checkbox toggles Deactivate/Reactivate, a dropdown covers
     Archive/Graduate/Transfer/Restore. Picking a dropdown option and checking the
     box are mutually exclusive — matches the one status change a request applies. */
  function accountStatusDialog(row, actions) {
    return new Promise(resolve => {
      const dropdownActions = actions.filter(action => !TOGGLE_ACTIONS.has(action));
      const showCheckbox = actions.some(action => TOGGLE_ACTIONS.has(action));
      const bg = document.createElement('div');
      bg.className = 'modal-bg confirm-bg';
      bg.style.display = 'flex';
      bg.innerHTML = `<div class="modal confirm-box account-status-box" role="dialog" aria-modal="true" aria-labelledby="statusTitle">
        <h3 id="statusTitle">Edit status — ${escapeHtml(row.name)}</h3>
        <p class="confirm-msg">Current status: ${escapeHtml(row.status)}.</p>
        ${showCheckbox ? `<label class="account-status-toggle"><input type="checkbox" id="statusDeactivate" ${row.status === 'Deactivated' ? 'checked' : ''}><span class="account-status-toggle-copy"><strong>Deactivate account</strong><small>${escapeHtml(ACTION_META.deactivate.help)}</small></span></label>` : ''}
        ${dropdownActions.length ? `<label class="dialog-input-label"><span>${showCheckbox ? 'Other status change' : 'Status change'}</span><select id="statusDropdown"><option value="">— None —</option>${dropdownActions.map(action => `<option value="${action}">${escapeHtml(ACTION_META[action].label)}</option>`).join('')}</select></label><p class="account-status-help" id="statusDropdownHelp" hidden></p>` : ''}
        <label class="dialog-input-label" id="statusReasonField" hidden><span>Reason (required)</span><textarea id="statusReason" rows="3"></textarea></label>
        <div class="confirm-actions">
          <button type="button" class="confirm-cancel" id="statusCancel">Cancel</button>
          <button type="button" class="confirm-ok" id="statusSave">Save</button>
        </div>
      </div>`;
      document.body.appendChild(bg);
      const checkbox = bg.querySelector('#statusDeactivate'), select = bg.querySelector('#statusDropdown');
      const reasonField = bg.querySelector('#statusReasonField'), reasonInput = bg.querySelector('#statusReason'), dropdownHelp = bg.querySelector('#statusDropdownHelp');
      function syncDropdown() {
        const needsReason = select && select.value && REASON_REQUIRED_ACTIONS.has(select.value);
        reasonField.hidden = !needsReason;
        if (!needsReason) { reasonInput.value = ''; clearFieldErrors(bg); }
        if (dropdownHelp) { dropdownHelp.hidden = !select.value; dropdownHelp.textContent = select.value ? ACTION_META[select.value].help : ''; }
      }
      checkbox?.addEventListener('change', () => { if (checkbox.checked && select) { select.value = ''; syncDropdown(); } });
      select?.addEventListener('change', () => { if (select.value && checkbox) checkbox.checked = false; syncDropdown(); });
      const previouslyFocused = document.activeElement;
      const done = value => { bg.remove(); if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus(); resolve(value); };
      bg.querySelector('#statusCancel').addEventListener('click', () => done(null));
      bg.addEventListener('click', event => { if (event.target === bg) done(null); });
      bg.addEventListener('keydown', event => { if (event.key === 'Escape') done(null); });
      bg.querySelector('#statusSave').addEventListener('click', () => {
        const dropdownValue = select ? select.value : '';
        if (dropdownValue) {
          if (REASON_REQUIRED_ACTIONS.has(dropdownValue) && !reasonInput.value.trim()) { setFieldError(reasonInput, 'A reason is required for this change.'); reasonInput.focus(); return; }
          return done({ action: dropdownValue, reason: reasonInput.value.trim() });
        }
        if (checkbox) {
          const wasDeactivated = row.status === 'Deactivated';
          if (checkbox.checked !== wasDeactivated) return done({ action: checkbox.checked ? 'deactivate' : 'reactivate', reason: '' });
        }
        done(null);
      });
      (checkbox || select)?.focus();
    });
  }
  async function editAccountStatus(id) {
    const row = accountRecords().find(item => item.id === id);
    if (!row) return message('That account no longer exists.');
    const actions = (NEXT_ACTIONS[row.status] || []).filter(action => !STUDENT_ONLY_ACTIONS.has(action) || row.role === 'student');
    if (!actions.length) return message(`No status change is available for a ${row.status} account.`, 'info');
    const choice = await accountStatusDialog(row, actions);
    if (!choice) return;
    const meta = ACTION_META[choice.action];
    try {
      if (backend()) {
        await request(`/api/accounts/${encodeURIComponent(row.id)}/${choice.action}`, 'POST', { reason: choice.reason });
      } else {
        const users = DB.read('users', []);
        const index = users.findIndex(user => user.username === row.id);
        if (index < 0) throw new Error('Account not found.');
        const previousStatus = statusOf(users[index]);
        const currentUser = DB.read('currentUser', null) || { username: 'system', role: 'system' };
        const history = [...(users[index].lifecycleHistory || []), { at: new Date().toISOString(), actorId: currentUser.username, actorRole: currentUser.role, from: previousStatus, to: meta.status, reason: choice.reason }];
        users[index] = { ...users[index], lifecycleStatus: meta.status, disabled: meta.status !== 'Active', lifecycleHistory: history };
        DB.write('users', users);
        AuditLog.record(choice.action, entityTypeFor(row.role), row.id, { reason: choice.reason, from: previousStatus, to: meta.status });
      }
      message(`${row.name}'s account is now ${meta.status}.`, 'success');
      renderAccounts();
      if (typeof loadAll === 'function') loadAll();
      if (typeof refreshStudentCommandState === 'function') refreshStudentCommandState();
    } catch (error) { message(error.message); }
  }

  function mount() { loadPeriods().catch(error => { message(error.message); renderPeriods(); }); loadAccounts().catch(error => message(error.message)); }
  return { mount, periods: () => loadPeriods().catch(error => message(error.message)), accounts: () => loadAccounts().catch(error => message(error.message)), editAccountStatus };
})();
