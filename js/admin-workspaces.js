/* Dedicated Admin workspaces for academic periods and account lifecycle. */
const AdminWorkspaces = (() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const backend = () => DB.backend?.() === 'sqlite';
  let periods = [];
  let filter = '';
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
  function renderAccounts() {
    const host = document.getElementById('accountLifecycleRoot');
    if (!host) return;
    const users = DB.read('users', []) || [];
    const statuses = ['Active', 'Deactivated', 'Archived', 'Graduated', 'Transferred'];
    const visible = users.filter(user => !filter || statusOf(user).toLowerCase() === filter);
    host.innerHTML = `<header class="management-page-head"><h3>Account lifecycle</h3><p>Review account access and status independently from faculty and student profiles.</p></header><div class="workspace-stats">${statuses.map(status => `<div><strong>${users.filter(user => statusOf(user) === status).length}</strong><span>${status}</span></div>`).join('')}</div><div class="workspace-toolbar"><label for="lifecycleFilter">Status</label><select id="lifecycleFilter"><option value="">All statuses</option>${statuses.map(status => `<option value="${status.toLowerCase()}" ${filter === status.toLowerCase() ? 'selected' : ''}>${status}</option>`).join('')}</select><button type="button" id="lifecycleExport">Export CSV</button></div><div class="workspace-table-scroll"><table class="workspace-table"><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>History</th></tr></thead><tbody>${visible.map(user => `<tr><td>${escapeHtml(user.username || user.id || '—')}</td><td>${escapeHtml(user.role || '—')}</td><td><span class="workspace-badge ${escapeHtml(statusOf(user).toLowerCase())}">${escapeHtml(statusOf(user))}</span></td><td>${Array.isArray(user.lifecycleHistory) && user.lifecycleHistory.length ? `<details><summary>${user.lifecycleHistory.length} changes</summary><ul class="workspace-history">${user.lifecycleHistory.map(change => `<li>${escapeHtml(change.from || '—')} → ${escapeHtml(change.to || '—')} · ${escapeHtml(change.at || '')} · ${escapeHtml(change.reason || '')}</li>`).join('')}</ul></details>` : '—'}</td></tr>`).join('') || '<tr><td colspan="4" class="workspace-empty">No accounts match this filter.</td></tr>'}</tbody></table></div><p class="workspace-notice">Status changes, archive, and restore need the protected account-lifecycle workflow. Existing student deactivation remains in Student Management.</p>`;
    host.querySelector('#lifecycleFilter').addEventListener('change', event => { filter = event.target.value; renderAccounts(); });
    host.querySelector('#lifecycleExport').addEventListener('click', () => exportAccounts(visible));
  }
  function exportAccounts(users) {
    const csv = ['Username,Role,Status', ...users.map(user => [user.username || user.id || '', user.role || '', statusOf(user)].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'account-lifecycle.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }
  function mount() { loadPeriods().catch(error => { message(error.message); renderPeriods(); }); renderAccounts(); }
  return { mount, periods: () => loadPeriods().catch(error => message(error.message)), accounts: renderAccounts };
})();
