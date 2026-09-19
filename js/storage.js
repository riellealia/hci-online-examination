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

/* The current UI is synchronous, so SQLite data is hydrated into a browser
   cache before page scripts execute. When served by server.js, writes must
   succeed in SQLite before the compatibility cache is changed. */
function sqliteBootstrap() {
  if (!SQLITE_BACKEND_ACTIVE || typeof XMLHttpRequest === 'undefined') return;
  try {
    const request = new XMLHttpRequest();
    request.open('GET', '/api/storage', false);
    request.send();
    if (request.status !== 200) throw new Error(`SQLite bootstrap returned ${request.status}.`);
    const records = JSON.parse(request.responseText || '{}').records || {};
    const keys = Object.keys(records);
    const local = {};
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || SQLITE_LOCAL_ONLY.has(key)) continue;
      try { local[key] = JSON.parse(localStorage.getItem(key)); } catch (_) {}
    }
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
      migration.send(JSON.stringify({ records: migrationRecords, missingOnly: keys.length > 0 }));
      if (migration.status !== 200) throw new Error(`SQLite migration returned ${migration.status}.`);
    }
  } catch (error) {
    console.warn('[storage] SQLite unavailable; continuing with browser cache.', error);
  }
}

function writeSqliteSync(method, key, value) {
  if (!SQLITE_BACKEND_ACTIVE || SQLITE_LOCAL_ONLY.has(key)) return true;
  try {
    const request = new XMLHttpRequest();
    request.open(method, `/api/storage/${encodeURIComponent(key)}`, false);
    if (method === 'PUT') request.setRequestHeader('Content-Type', 'application/json');
    request.send(method === 'PUT' ? JSON.stringify({ value }) : null);
    if (request.status < 200 || request.status >= 300) throw new Error(`SQLite returned ${request.status}.`);
    return true;
  } catch (error) {
    storageNotify(`SQLite could not save "${key}". Nothing was changed.`, 'error');
    console.error('[storage] SQLite write failed', key, error);
    return false;
  }
}

sqliteBootstrap();

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
    const response = await fetch(`/api/csv/${encodeURIComponent(collection)}/import`, {method:'POST',headers:{'Content-Type':'text/csv; charset=utf-8'},body:text});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'CSV import failed.');
    const stored = await fetch(`/api/storage/${encodeURIComponent(collection)}`).then(item => item.json());
    localStorage.setItem(collection, JSON.stringify(stored.value || []));
    return result;
  },

  exportCsvUrl(collection) {
    if (!SQLITE_BACKEND_ACTIVE) return null;
    return `/api/csv/${encodeURIComponent(collection)}/export`;
  }
};
