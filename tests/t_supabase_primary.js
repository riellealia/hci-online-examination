'use strict';
// Supabase as the only database: in-memory working copy, failed writes are
// detected per write and reverted to what Supabase holds, CSV history syncs.
const assert = require('assert');
const { createMemoryStore } = require('../server/memory-store');
const { createSupabaseReplicatedStore } = require('../server/supabase-replica');
const { TABLES } = require('../server/supabase-tables');

/* Minimal PostgREST stand-in; `down` makes every write fail like an outage. */
function fakeSupabase() {
  const tables = new Map(), state = { down: false };
  const table = name => { if (!tables.has(name)) tables.set(name, new Map()); return tables.get(name); };
  const ok = (body, status = 200) => ({ ok: true, status, text: async () => body === null ? '' : JSON.stringify(body) });
  async function fetchImpl(url, init = {}) {
    const u = new URL(url), name = u.pathname.split('/').pop(), method = init.method || 'GET', rows = table(name);
    if (method !== 'GET' && state.down) return { ok: false, status: 503, text: async () => 'unavailable' };
    const keyOf = r => r.id ?? r.collection_key;
    if (method === 'POST') { for (const r of JSON.parse(init.body)) rows.set(keyOf(r), { ...(rows.get(keyOf(r)) || {}), ...r }); return ok(null, 201); }
    if (method === 'DELETE') {
      const idIn = u.searchParams.get('id'), ck = u.searchParams.get('collection_key');
      if (idIn && idIn.startsWith('in.(')) decodeURIComponent(idIn.slice(4, -1)).match(/"((?:[^"\\]|\\.)*)"/g).map(s => s.slice(1, -1)).forEach(id => rows.delete(id));
      else if (ck) rows.delete(ck.replace(/^eq\./, ''));
      return ok(null, 204);
    }
    let list = [...rows.values()];
    const ck = u.searchParams.get('collection_key'); if (ck && ck.startsWith('eq.')) list = list.filter(r => r.collection_key === ck.slice(3));
    if ((u.searchParams.get('order') || '').startsWith('position')) list.sort((a, b) => a.position - b.position);
    const offset = Number(u.searchParams.get('offset') || 0), limit = Number(u.searchParams.get('limit') || 1e9);
    return ok(list.slice(offset, offset + limit));
  }
  return { fetchImpl, table, state };
}

(async () => {
  // 1) The memory store behaves like the SQLite store: copies on read, append, migrate.
  const mem = createMemoryStore();
  mem.write('a', [{ id: 1 }]); const copy = mem.read('a'); copy.push({ id: 2 });
  assert.deepEqual(mem.read('a'), [{ id: 1 }], 'reads are copies');
  mem.append('a', { id: 1 }); mem.append('a', { id: 3 });
  assert.deepEqual(mem.read('a').map(x => x.id), [1, 3], 'append skips an existing id');
  mem.migrate({ a: [], b: { x: 1 } }, { missingOnly: true });
  assert.deepEqual(mem.read('a').length, 2); assert.deepEqual(mem.read('b'), { x: 1 });
  assert.equal(mem.read('missing', 'fallback'), 'fallback'); assert.equal(mem.raw, null);
  console.log('✅ in-memory working copy matches the SQLite store interface');

  // 2) Load from Supabase into memory, write back.
  const sb = fakeSupabase();
  const seed = createSupabaseReplicatedStore(createMemoryStore(), { url: 'https://x.supabase.co', serviceKey: 'k', fetchImpl: sb.fetchImpl, relational: true });
  seed.write('students', [{ id: 'S1', first: 'Bianca', last: 'Santos', sections: [] }]);
  seed.write('systemSettings', { maintenance: false });
  assert.ok(await seed.flush());
  const store = createSupabaseReplicatedStore(createMemoryStore(), { url: 'https://x.supabase.co', serviceKey: 'k', fetchImpl: sb.fetchImpl, relational: true });
  const hydration = await store.hydrate();
  assert.ok(hydration.hydrated >= 2);
  assert.equal(store.read('students')[0].first, 'Bianca');
  console.log('✅ the server copy is loaded from Supabase');

  // 3) A failed write is detected even after a later success, and reverted.
  const before = store.failureCount();
  sb.state.down = true;
  store.write('students', [{ id: 'S1', first: 'Changed', last: 'Santos', sections: [] }]);
  store.write('systemSettings', { maintenance: true });
  await store.flush();
  assert.ok(store.failureCount() > before, 'failures are counted per write');
  assert.equal(store.read('students')[0].first, 'Changed', 'memory holds the unsaved change until reverted');
  sb.state.down = false;
  store.write('adminAnnouncements', [{ id: 'N1', title: 'ok' }]);
  assert.ok(await store.flush(), 'a later write succeeds');
  assert.ok(store.failureCount() > before, 'the earlier failure is still visible to the request that made it');
  const reverted = await store.revertFailed();
  assert.deepEqual(reverted.sort(), ['students', 'systemSettings']);
  assert.equal(store.read('students')[0].first, 'Bianca', 'rejected change replaced by the Supabase value');
  assert.deepEqual(store.read('systemSettings'), { maintenance: false });
  assert.equal(sb.table(TABLES.students.table).get('S1').data.first, 'Bianca');
  console.log('✅ a write Supabase rejects is reported and reverted to the Supabase value');

  // 4) CSV import history reaches Supabase instead of a SQLite-only table.
  store.recordImport('students', 12);
  assert.ok(await store.flush());
  const history = sb.table('app_collections').get('csvImportHistory').value_json;
  assert.equal(history.length, 1); assert.equal(history[0].collectionKey, 'students'); assert.equal(history[0].rowCount, 12);
  console.log('✅ CSV import history is stored in Supabase');
})().catch(error => { console.error('❌', error); process.exitCode = 1; });
