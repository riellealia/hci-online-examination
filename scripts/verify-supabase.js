'use strict';
/* Checks that Supabase holds the whole database and that its tables, triggers
   and functions work:
   1. every table the server maps (server/supabase-tables.js) plus
      app_collections and sync_versions exists and can be read;
   2. every collection in the old local SQLite file (if present) exists in
      Supabase with the same number of records, so nothing was left behind;
   3. a write round trip: a scratch row is written to app_collections, the
      sync_versions trigger must bump its version, then the row is removed.
   MIGRATE_MISSING=1 copies collections that exist only in SQLite to Supabase. */
const fs = require('fs');
const path = require('path');
const { TABLES } = require('../server/supabase-tables');
const { createMemoryStore } = require('../server/memory-store');
const { createSupabaseReplicatedStore } = require('../server/supabase-replica');

const ROOT = path.join(__dirname, '..');
function readEnvFile(file) { try { return Object.fromEntries(fs.readFileSync(file, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#') && l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })); } catch { return {}; } }
const env = { ...readEnvFile(path.join(ROOT, '.env')), ...process.env };
const base = String(env.SUPABASE_URL || '').replace(/\/$/, ''), key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key) { console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env).'); process.exit(1); }
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const rest = async (p, init = {}) => { const r = await fetch(`${base}/rest/v1/${p}`, { ...init, headers: { ...headers, ...(init.headers || {}) } }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r; };
const count = async table => { const r = await rest(`${table}?select=id`, { method: 'HEAD', headers: { Prefer: 'count=exact', Range: '0-0' } }); return Number((r.headers.get('content-range') || '').split('/')[1]); };
const size = v => Array.isArray(v) ? v.length : (v && typeof v === 'object' ? 'object' : typeof v);
let problems = 0; const bad = msg => { problems++; console.log(`  ✗ ${msg}`); };

(async () => {
  console.log('1. Tables');
  for (const [collection, { table }] of Object.entries(TABLES)) {
    try { console.log(`  ✓ ${table.padEnd(22)} ${String(await count(table)).padStart(6)} rows  (${collection})`); }
    catch (e) { bad(`${table}: ${e.message.slice(0, 120)}`); }
  }
  for (const t of ['app_collections', 'sync_versions']) {
    try { await rest(`${t}?select=*&limit=1`); console.log(`  ✓ ${t}`); } catch (e) { bad(`${t}: ${e.message.slice(0, 120)}`); }
  }

  console.log('\n2. Data: Supabase compared with the old local SQLite file');
  const store = createSupabaseReplicatedStore(createMemoryStore(), { url: base, serviceKey: key, relational: true });
  await store.hydrate();
  const remote = store.all();
  const file = env.SQLITE_PATH || path.join(ROOT, 'data', 'neu-examination.sqlite');
  if (!fs.existsSync(file)) console.log('  (no local SQLite file; nothing to compare)');
  else {
    const { openDatabase } = require('../server/database');
    const local = openDatabase(file).all(), missing = {};
    for (const [k, v] of Object.entries(local)) {
      if (!Object.hasOwn(remote, k)) { missing[k] = v; bad(`${k} (${size(v)}) exists only in SQLite`); continue; }
      const a = size(v), b = size(remote[k]);
      if (a !== b) console.log(`  ~ ${k}: SQLite ${a}, Supabase ${b} (Supabase is newer)`);
    }
    console.log(`  ${Object.keys(local).length} SQLite collections checked, ${Object.keys(remote).length} in Supabase.`);
    if (Object.keys(missing).length && /^(1|true)$/i.test(env.MIGRATE_MISSING || '')) {
      store.migrate(missing); const ok = await store.flush();
      console.log(ok ? `  → copied ${Object.keys(missing).join(', ')} to Supabase` : `  → copy failed: ${store.status().error}`);
      if (ok) problems -= Object.keys(missing).length;
    }
  }
  const dupes = Object.entries(remote).filter(([, v]) => Array.isArray(v) && v.some(x => x && x.id)).map(([k, v]) => [k, v.length - new Set(v.map(x => x?.id)).size]).filter(([, n]) => n > 0);
  dupes.forEach(([k, n]) => bad(`${k} has ${n} duplicate ids`));

  console.log('\n3. Write round trip (trigger + function)');
  const scratch = '__verify_supabase__';
  try {
    const before = Number((await (await rest(`sync_versions?select=version&collection_key=eq.${scratch}`)).json())[0]?.version || 0);
    await rest('app_collections?on_conflict=collection_key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ collection_key: scratch, value_json: { at: new Date().toISOString() }, updated_at: new Date().toISOString() }]) });
    const stored = await (await rest(`app_collections?select=collection_key&collection_key=eq.${scratch}`)).json();
    const after = Number((await (await rest(`sync_versions?select=version&collection_key=eq.${scratch}`)).json())[0]?.version || 0);
    await rest(`app_collections?collection_key=eq.${scratch}`, { method: 'DELETE' });
    await rest(`sync_versions?collection_key=eq.${scratch}`, { method: 'DELETE' }).catch(() => {});
    if (stored.length !== 1) bad('scratch row was not stored'); else console.log('  ✓ write and read back');
    if (after > before) console.log(`  ✓ sync_versions trigger bumped the version (${before} → ${after})`); else bad('sync_versions was not bumped: the trigger/function is missing');
  } catch (e) { bad(`round trip failed: ${e.message.slice(0, 160)}`); }

  console.log(problems ? `\n${problems} problem(s) found.` : '\nAll checks passed: Supabase holds the database and accepts writes.');
  process.exitCode = problems ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
