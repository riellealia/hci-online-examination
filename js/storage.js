/* ============================================================
   storage.js — the only place that touches localStorage directly.

   Every read is fault-tolerant and every write reports failure, so a
   full disk, a private-browsing session, or corrupted data surfaces to
   the user instead of silently losing their work.

   Loaded before auth.js and ui.js on every page.
   ============================================================ */

/* notify() lives in ui.js, which loads after this file. Resolve it at call
   time and fall back to the console if it is not there yet.

   One user action can write several keys — saving a record touches five
   collections — so an identical message is shown once per short window
   rather than five times in a row. */
const _storageSeen = new Map();
const SQLITE_BACKEND_ACTIVE = typeof location !== 'undefined'
  && /^https?:$/.test(location.protocol) && location.port === '3000';
const SQLITE_LOCAL_ONLY = new Set(['currentUser','accessNotice']);
function sqliteSessionToken() { try { return sessionStorage.getItem('serverSessionToken') || ''; } catch (_) { return ''; } }
function resetSqliteLoginEntry() {
  if (!SQLITE_BACKEND_ACTIVE || typeof location === 'undefined' || !/(?:^|\/)login\.html$/.test(location.pathname || '')) return false;
  try {
    // Opening sign-in starts a fresh authentication attempt. Remove only
    // identity/session state; all hydrated academic collections remain.
    sessionStorage.removeItem('serverSessionToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessNotice');
  } catch (_) {}
  return true;
}
function invalidateSqliteSession(message = 'Your server session expired. Please sign in again.') {
  try {
    sessionStorage.removeItem('serverSessionToken');
    localStorage.removeItem('currentUser');
    localStorage.setItem('accessNotice', JSON.stringify(message));
  } catch (_) {}
}

/* The current UI is synchronous, so SQLite data is hydrated into a browser
   cache before page scripts execute. When served by server.js, writes must
   succeed in SQLite before the compatibility cache is changed. */
function sqliteBootstrap() {
  if (!SQLITE_BACKEND_ACTIVE || typeof XMLHttpRequest === 'undefined') return;
  const token = sqliteSessionToken();
  if (!token) return;
  try {
    const request = new XMLHttpRequest();
    request.open('GET', '/api/storage', false);
    request.setRequestHeader('Authorization', `Bearer ${token}`);
    request.send();
    if (request.status === 401 || request.status === 403) { invalidateSqliteSession(); return; }
    if (request.status !== 200) throw new Error(`SQLite bootstrap returned ${request.status}.`);
    const response = JSON.parse(request.responseText || '{}');
    const records = response.records || {};
    let browserSession = null;
    try { browserSession = JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (_) {}
    const serverSession = response.session || null;
    const normalizeRole = value => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
      .replace('administrator', 'admin').replace('collegedean', 'dean')
      .replace('facultycoordinator', 'coordinator').replace('professor', 'faculty');
    if (!serverSession || !browserSession
      || String(browserSession.username || browserSession.id || '') !== String(serverSession.username || '')
      || normalizeRole(browserSession.role) !== normalizeRole(serverSession.role)) {
      invalidateSqliteSession('Your browser login did not match the active server session. Please sign in again.');
      if (typeof window !== 'undefined') setTimeout(()=>window.location.replace('index.html'),0);
      return;
    }
    const serverCollections = Array.isArray(response.collections) ? response.collections : Object.keys(records);
    const keys = Object.keys(records);
    const local = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || SQLITE_LOCAL_ONLY.has(key)) continue;
      try { local[key] = JSON.parse(localStorage.getItem(key)); } catch (_) {}
    }
    serverCollections.forEach(key => { if (!SQLITE_LOCAL_ONLY.has(key) && !Object.hasOwn(records, key)) localStorage.removeItem(key); });
    if (keys.length) {
      keys.forEach(key => { if (!SQLITE_LOCAL_ONLY.has(key)) localStorage.setItem(key, JSON.stringify(records[key])); });
    }
    const migrationRecords = keys.length
      ? Object.fromEntries(Object.entries(local).filter(([key]) => !Object.hasOwn(records, key)))
      : local;
    if (Object.keys(migrationRecords).length) {
      const migration = new XMLHttpRequest();
      migration.open('POST', '/api/migrate', false);
      migration.setRequestHeader('Content-Type', 'application/json');
      migration.setRequestHeader('Authorization', `Bearer ${token}`);
      migration.send(JSON.stringify({ records: migrationRecords, missingOnly: keys.length > 0 }));
      if (migration.status !== 200) throw new Error(`SQLite migration returned ${migration.status}.`);
    }
  } catch (error) {
    console.warn('[storage] SQLite unavailable; continuing with browser cache.', error);
  }
}

function writeSqliteSync(method, key, value) {
  if (!SQLITE_BACKEND_ACTIVE || SQLITE_LOCAL_ONLY.has(key)) return true;
  if (!sqliteSessionToken()) return true;
  try {
    const request = new XMLHttpRequest();
    request.open(method, `/api/storage/${encodeURIComponent(key)}`, false);
    const token = sqliteSessionToken(); if (token) request.setRequestHeader('Authorization', `Bearer ${token}`);
    if (method === 'PUT') request.setRequestHeader('Content-Type', 'application/json');
    request.send(method === 'PUT' ? JSON.stringify({ value }) : null);
    if (request.status === 401) {
      invalidateSqliteSession();
      storageNotify('Your server session expired. Redirecting to sign in.', 'error');
      if (typeof window !== 'undefined') setTimeout(()=>window.location.replace('index.html'),0);
      return false;
    }
    if (request.status < 200 || request.status >= 300) {
      let reason = '';
      try { reason = JSON.parse(request.responseText || '{}').error || ''; } catch (_) {}
      throw new Error(reason || `SQLite returned ${request.status}.`);
    }
    return true;
  } catch (error) {
    storageNotify(`SQLite could not save "${key}": ${error.message || 'the server rejected the change'}`, 'error');
    console.error('[storage] SQLite write failed', key, error);
    return false;
  }
}

if (!resetSqliteLoginEntry()) sqliteBootstrap();

function storageNotify(message, type) {
  const now = (typeof performance !== 'undefined' && performance.now)
    ? performance.now() : 0;
  const last = _storageSeen.get(message);
  if (last !== undefined && now - last < 3000) return;
  _storageSeen.set(message, now);

  if (typeof notify === 'function') {
    notify(message, type, 8000);
  } else {
    console[type === 'error' ? 'error' : 'warn']('[storage] ' + message);
  }
}

function isQuotaError(e) {
  return e && (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 || e.code === 1014
  );
}

const DB = {
  /* Returns the parsed value, or `fallback` when the key is missing,
     unreadable, or corrupted. Never throws. */
  read(key, fallback) {
    let raw;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      // Storage can be blocked outright (private mode, disabled cookies).
      storageNotify(
        'This browser is blocking local storage, so saved data cannot be read. '
        + 'Try a normal (non-private) window.', 'error');
      return fallback;
    }

    if (raw === null || raw === undefined) return fallback;

    try {
      const parsed = JSON.parse(raw);
      return parsed === null ? fallback : parsed;
    } catch (e) {
      storageNotify(
        `Saved "${key}" data was unreadable and has been skipped. `
        + 'Some information may be missing.', 'error');
      console.warn(`[storage] corrupted value for "${key}"`, e);
      return fallback;
    }
  },

  /* Returns true when the value was stored. Reports and returns false
     when it was not, so callers can avoid claiming a save succeeded. */
  write(key, value) {
    let payload;
    try {
      payload = JSON.stringify(value);
    } catch (e) {
      storageNotify(`Could not prepare "${key}" for saving. Nothing was changed.`, 'error');
      console.error('[storage] serialise failed', key, e);
      return false;
    }

    try {
      if (!writeSqliteSync('PUT', key, value)) return false;
      localStorage.setItem(key, payload);
      return true;
    } catch (e) {
      if (isQuotaError(e)) {
        storageNotify(
          'Storage is full, so your change was not saved. '
          + 'Remove some old exams or submissions and try again.', 'error');
      } else {
        storageNotify(
          'Your change could not be saved. '
          + 'If this browser is in private mode, saving is unavailable.', 'error');
      }
      console.error('[storage] write failed', key, e);
      return false;
    }
  },

  /* Append one immutable event without replacing a possibly stale collection.
     SQLite performs this atomically so concurrent tabs cannot omit history. */
  append(key, entry) {
    if (!SQLITE_BACKEND_ACTIVE || SQLITE_LOCAL_ONLY.has(key) || !sqliteSessionToken()) {
      const items = this.read(key, []);
      if (!Array.isArray(items)) return false;
      if (!items.some(item => item?.id && item.id === entry?.id)) items.push(entry);
      return this.write(key, items);
    }
    try {
      const request = new XMLHttpRequest();
      request.open('POST', `/api/storage/${encodeURIComponent(key)}/append`, false);
      request.setRequestHeader('Content-Type', 'application/json');
      request.setRequestHeader('Authorization', `Bearer ${sqliteSessionToken()}`);
      request.send(JSON.stringify({ entry }));
      if (request.status === 401) {
        invalidateSqliteSession();
        storageNotify('Your server session expired. Redirecting to sign in.', 'error');
        if (typeof window !== 'undefined') setTimeout(()=>window.location.replace('index.html'),0);
        return false;
      }
      if (request.status < 200 || request.status >= 300) {
        let reason = '';
        try { reason = JSON.parse(request.responseText || '{}').error || ''; } catch (_) {}
        throw new Error(reason || `SQLite returned ${request.status}.`);
      }
      const response = JSON.parse(request.responseText || '{}');
      localStorage.setItem(key, JSON.stringify(response.value || []));
      return true;
    } catch (error) {
      storageNotify(`SQLite could not append "${key}": ${error.message || 'the server rejected the event'}`, 'error');
      console.error('[storage] SQLite append failed', key, error);
      return false;
    }
  },

  remove(key) {
    try {
      if (!writeSqliteSync('DELETE', key)) return false;
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('[storage] remove failed', key, e);
      return false;
    }
  },

  /* True when this browser will actually persist anything. */
  available() {
    try {
      const probe = '__probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  },

  backend() { return SQLITE_BACKEND_ACTIVE ? 'sqlite' : 'browser'; },

  async importCsv(collection, file) {
    if (!SQLITE_BACKEND_ACTIVE) throw new Error('CSV server import requires npm start.');
    const text = typeof file === 'string' ? file : await file.text();
    const token=sqliteSessionToken();if(!token)throw new Error('Sign in again before importing CSV data.');
    const response = await fetch(`/api/csv/${encodeURIComponent(collection)}/import`, {method:'POST',headers:{'Content-Type':'text/csv; charset=utf-8','Authorization':`Bearer ${token}`},body:text});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'CSV import failed.');
    const stored = await fetch(`/api/storage/${encodeURIComponent(collection)}`,{headers:{'Authorization':`Bearer ${token}`}}).then(item => item.json());
    localStorage.setItem(collection, JSON.stringify(stored.value || []));
    return result;
  },

  exportCsvUrl(collection) {
    if (!SQLITE_BACKEND_ACTIVE) return null;
    return `/api/csv/${encodeURIComponent(collection)}/export`;
  }
};
