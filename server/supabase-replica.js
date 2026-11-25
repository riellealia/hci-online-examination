'use strict';
/* Supabase is the database. The server keeps a working copy (in memory when
   Supabase is configured, see server/memory-store.js; SQLite only when it is
   not), loads it from Supabase at start, and sends every change back.
   Two layouts:
   - relational (options.relational = true): collections listed in
     server/supabase-tables.js live in their own tables, one row per record,
     and only changed / removed records are sent. Everything else (settings
     objects, UI state) stays in app_collections.
   - legacy (default): every collection is one JSON row in app_collections. */
const { TABLES, rowsFor } = require('./supabase-tables');

const PAGE = 1000, UPSERT_CHUNK = 500, DELETE_CHUNK = 100;

function createSupabaseReplicatedStore(localStore, options = {}) {
  const baseUrl = String(options.url || '').replace(/\/$/, '');
  const serviceKey = String(options.serviceKey || '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const enabled = Boolean(baseUrl && serviceKey && fetchImpl);
  const relational = Boolean(options.relational);
  let pending = Promise.resolve();
  let lastError = null;
  let lastSyncedAt = null;
  let queued = 0;
  const dirty = new Set(); // collections whose last table sync failed: next sync is a full one
  // Multi-instance sync: writes in flight per collection, local write counters,
  // and the last sync_versions value this instance has applied.
  const pendingByKey = new Map(), writeSeq = new Map(), known = new Map();
  // Every failed write is counted and its collection remembered, so a request
  // can tell whether its own changes reached Supabase (see failureCount and
  // revertFailed) even when a later write succeeds and clears lastError.
  let failures = 0;
  const failedKeys = new Set();
  const follow = { active: false, timer: null, polling: false, lastPollAt: null, reloads: 0, error: null };

  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };

  async function request(pathname, init = {}) {
    const response = await fetchImpl(`${baseUrl}/rest/v1/${pathname}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
    if (!response.ok) throw new Error(`Supabase replication returned ${response.status}: ${await response.text()}`);
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function enqueue(operation, key) {
    if (!enabled) return;
    queued++;
    if (key) { pendingByKey.set(key, (pendingByKey.get(key) || 0) + 1); writeSeq.set(key, (writeSeq.get(key) || 0) + 1); }
    const settle = () => { queued = Math.max(0, queued - 1); if (key) pendingByKey.set(key, Math.max(0, (pendingByKey.get(key) || 0) - 1)); };
    pending = pending.then(operation).then(() => {
      settle();
      lastError = null;
      lastSyncedAt = new Date().toISOString();
    }).catch(error => {
      settle();
      failures++;
      if (key) failedKeys.add(key);
      lastError = error;
      console.error(error.message);
    });
  }

  function upsertRecords(records) {
    const rows = Object.entries(records).map(([collectionKey, value]) => ({
      collection_key: collectionKey,
      value_json: value,
      updated_at: new Date().toISOString()
    }));
    if (!rows.length) return Promise.resolve();
    return request('app_collections?on_conflict=collection_key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    });
  }

  /* ---------- relational tables ---------- */
  const mapped = key => relational && Object.hasOwn(TABLES, key);
  const quote = id => `"${String(id).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

  async function upsertRows(table, rows) {
    const stamp = new Date().toISOString();
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
      await request(`${table}?on_conflict=id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows.slice(i, i + UPSERT_CHUNK).map(row => ({ ...row, updated_at: stamp })))
      });
    }
  }
  async function deleteIds(table, ids) {
    for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
      const list = ids.slice(i, i + DELETE_CHUNK).map(quote).join(',');
      await request(`${table}?id=in.(${encodeURIComponent(list)})`, { method: 'DELETE' });
    }
  }
  async function selectAll(table, columns) {
    const out = [];
    for (let offset = 0; ; offset += PAGE) {
      const page = await request(`${table}?select=${columns}&order=position.asc,id.asc&limit=${PAGE}&offset=${offset}`);
      if (!Array.isArray(page) || !page.length) break;
      out.push(...page);
      if (page.length < PAGE) break;
    }
    return out;
  }
  // Full sync: upsert every record and remove rows the list no longer has.
  async function fullSync(key, value) {
    const { table } = TABLES[key], rows = rowsFor(key, value), keep = new Set(rows.map(r => r.id));
    await upsertRows(table, rows);
    const remote = await selectAll(table, 'id');
    await deleteIds(table, remote.map(r => r.id).filter(id => !keep.has(id)));
  }
  // Incremental sync: only records that changed (content or position) and removed ones.
  async function diffSync(key, previous, value) {
    const { table } = TABLES[key];
    const before = new Map(rowsFor(key, previous).map(r => [r.id, JSON.stringify(r)]));
    const rows = rowsFor(key, value), now = new Set(rows.map(r => r.id));
    await upsertRows(table, rows.filter(r => before.get(r.id) !== JSON.stringify(r)));
    await deleteIds(table, [...before.keys()].filter(id => !now.has(id)));
  }
  function syncCollection(key, previous, value) {
    if (!mapped(key)) return upsertRecords({ [key]: value });
    if (!Array.isArray(value)) return upsertRecords({ [key]: value }); // unexpected shape: keep it, unmapped
    const full = dirty.has(key) || !Array.isArray(previous);
    return (full ? fullSync(key, value) : diffSync(key, previous, value))
      .then(() => { dirty.delete(key); }, error => { dirty.add(key); throw error; });
  }

  /* ---------- following other instances ---------- */
  // Version list (null when the sync_versions table is not installed).
  async function versions() {
    try { const rows = await request('sync_versions?select=collection_key,version'); return Array.isArray(rows) ? rows : null; }
    catch (_) { return null; }
  }
  async function rememberVersions() {
    const rows = await versions();
    if (rows) rows.forEach(r => known.set(r.collection_key, Number(r.version)));
    return rows;
  }
  // Current Supabase value of one collection; undefined when it no longer exists.
  async function remoteValue(key) {
    if (mapped(key)) {
      const rows = await selectAll(TABLES[key].table, 'id,position,data');
      return rows.length || Object.hasOwn(localStore.all(), key) ? rows.map(r => r.data) : undefined;
    }
    const rows = await request(`app_collections?select=value_json&collection_key=eq.${encodeURIComponent(key)}`);
    if (!Array.isArray(rows) || !rows.length) return undefined;
    return typeof rows[0].value_json === 'string' ? JSON.parse(rows[0].value_json) : rows[0].value_json;
  }
  /* One poll: reload every collection whose version moved. A collection with
     writes still on their way to Supabase is left alone this round (so a reload
     can never undo a local change), and a reload is thrown away if a local
     write happened while it was downloading. Own writes also bump the version;
     reloading them is harmless (the value is unchanged and is not rewritten). */
  async function pollOnce() {
    if (!enabled || follow.polling) return { reloaded: [] };
    follow.polling = true;
    const reloaded = [];
    try {
      const rows = await versions();
      follow.lastPollAt = new Date().toISOString();
      if (!rows) { follow.error = 'sync_versions table is not available'; return { reloaded }; }
      follow.error = null;
      for (const { collection_key: key, version } of rows) {
        const v = Number(version);
        if (known.get(key) === v || (pendingByKey.get(key) || 0) > 0) continue;
        const seq = writeSeq.get(key) || 0;
        const value = await remoteValue(key);
        if ((pendingByKey.get(key) || 0) > 0 || (writeSeq.get(key) || 0) !== seq) continue;
        const current = localStore.read(key);
        if (value === undefined) { if (current !== undefined && current !== null) { localStore.delete(key); reloaded.push(key); } }
        else if (JSON.stringify(value) !== JSON.stringify(current)) { localStore.write(key, value); reloaded.push(key); }
        known.set(key, v);
      }
      follow.reloads += reloaded.length;
    } catch (error) {
      follow.error = error.message;
    } finally { follow.polling = false; }
    return { reloaded };
  }
  function startFollowing(intervalMs = 2000) {
    if (!enabled || !relational || follow.timer) return false;
    follow.active = true;
    follow.timer = setInterval(() => { pollOnce(); }, intervalMs);
    if (typeof follow.timer.unref === 'function') follow.timer.unref();
    return true;
  }
  function stopFollowing() { if (follow.timer) clearInterval(follow.timer); follow.timer = null; follow.active = false; }

  const store = {
    raw: localStore.raw,
    read: localStore.read,
    all: localStore.all,
    write(key, value) {
      const previous = relational ? localStore.read(key) : undefined;
      const result = localStore.write(key, value);
      enqueue(() => syncCollection(key, previous, value), key);
      return result;
    },
    append(key, value) {
      const previous = relational ? localStore.read(key) : undefined;
      const items = localStore.append(key, value);
      enqueue(() => syncCollection(key, previous, items), key);
      return items;
    },
    delete(key) {
      const result = localStore.delete(key);
      enqueue(() => mapped(key)
        ? request(`${TABLES[key].table}?id=not.is.null`, { method: 'DELETE' })
        : request(`app_collections?collection_key=eq.${encodeURIComponent(key)}`, { method: 'DELETE' }), key);
      return result;
    },
    migrate(records, options = {}) {
      const before = localStore.all();
      const result = localStore.migrate(records, options);
      const changed = options.missingOnly
        ? Object.fromEntries(Object.entries(records).filter(([key]) => !Object.hasOwn(before, key)))
        : records;
      if (!relational) enqueue(() => upsertRecords(changed));
      else for (const [key, value] of Object.entries(changed)) enqueue(() => syncCollection(key, before[key], value), key);
      return result;
    },
    // CSV import history is a collection like any other, so it reaches Supabase.
    recordImport(key, count) {
      const at = new Date().toISOString();
      return store.append('csvImportHistory', { id: `csv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, collectionKey: key, rowCount: count, importedAt: at });
    },
    async hydrate() {
      if (!enabled) return { enabled: false, hydrated: 0 };
      // Versions first: any change made after this point is picked up by the next poll.
      if (relational) await rememberVersions();
      const records = {};
      if (relational) {
        for (const [key, { table }] of Object.entries(TABLES)) {
          const rows = await selectAll(table, 'id,position,data');
          if (rows.length) records[key] = rows.map(r => r.data);
        }
      }
      const legacy = await request('app_collections?select=collection_key,value_json,updated_at&order=collection_key');
      for (const row of Array.isArray(legacy) ? legacy : []) {
        if (Object.hasOwn(records, row.collection_key)) continue; // the table wins over an old JSON row
        records[row.collection_key] = typeof row.value_json === 'string' ? JSON.parse(row.value_json) : row.value_json;
      }
      if (Object.keys(records).length) {
        localStore.migrate(records);
        lastSyncedAt = new Date().toISOString();
        return { enabled: true, hydrated: Object.keys(records).length };
      }
      const local = localStore.all();
      if (Object.keys(local).length) {
        if (!relational) enqueue(() => upsertRecords(local));
        else for (const [key, value] of Object.entries(local)) enqueue(() => syncCollection(key, undefined, value), key);
        await pending;
      }
      return { enabled: true, hydrated: 0 };
    },
    /* Pushes whole collections from SQLite into their Supabase tables (first
       migration or recovery). Only reads the local store. */
    async resync(keys = Object.keys(TABLES)) {
      if (!enabled || !relational) return { synced: [] };
      const local = localStore.all(), synced = [];
      for (const key of keys) {
        if (!mapped(key) || !Array.isArray(local[key])) continue;
        enqueue(() => fullSync(key, local[key]).then(() => { dirty.delete(key); }), key);
        synced.push(key);
      }
      await pending;
      return { synced, ok: !lastError, error: lastError ? lastError.message : null };
    },
    async flush() { await pending; return !lastError; },
    failureCount() { return failures; },
    /* After a failed write: put the collections that failed back to what
       Supabase holds, so the server never serves a change Supabase rejected.
       A collection that cannot be reloaded stays marked for a full sync. */
    async revertFailed() {
      await pending;
      const keys = [...failedKeys]; failedKeys.clear();
      const reverted = [];
      for (const key of keys) {
        if ((pendingByKey.get(key) || 0) > 0) continue;
        try {
          const value = await remoteValue(key);
          if (value === undefined) localStore.delete(key); else localStore.write(key, value);
          dirty.delete(key); reverted.push(key);
        } catch (error) { failedKeys.add(key); console.error(`Could not reload ${key} from Supabase: ${error.message}`); }
      }
      return reverted;
    },
    startFollowing,
    stopFollowing,
    pollOnce,
    /* Times one small read from Supabase (used by the admin monitoring panel). */
    async ping() {
      if (!enabled) return { enabled: false, ok: false, latencyMs: null, collections: 0, error: null };
      const started = Date.now();
      try {
        const rows = await request('app_collections?select=collection_key');
        const legacy = Array.isArray(rows) ? rows.filter(r => !mapped(r.collection_key)).length : 0;
        return { enabled: true, ok: true, latencyMs: Date.now() - started, collections: legacy + (relational ? Object.keys(TABLES).length : 0), tables: relational ? Object.keys(TABLES).length : 0, error: null };
      } catch (error) {
        return { enabled: true, ok: false, latencyMs: Date.now() - started, collections: 0, error: error.message };
      }
    },
    status() {
      return {
        enabled,
        provider: enabled ? 'supabase' : null,
        lastSyncedAt,
        healthy: !lastError,
        pendingWrites: queued,
        error: lastError ? lastError.message : null,
        following: { active: follow.active, lastPollAt: follow.lastPollAt, reloads: follow.reloads, error: follow.error }
      };
    },
    close() { stopFollowing(); localStore.close(); }
  };
  return store;
}

module.exports = { createSupabaseReplicatedStore };
