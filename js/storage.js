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
  }
};
