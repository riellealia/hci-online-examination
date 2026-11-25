'use strict';
/* In-memory working copy with the same interface as server/database.js.

   Used when Supabase is configured: Supabase is then the only database, and
   this store only holds what the server loaded from it (see
   server/supabase-replica.js). Values are kept as JSON text and parsed on
   every read, exactly like the SQLite store, so callers can mutate what they
   read without changing the stored copy. */
function createMemoryStore() {
  const data = new Map();
  const parse = text => JSON.parse(text);
  return {
    raw: null,
    read(key, fallback = null) { return data.has(key) ? parse(data.get(key)) : fallback; },
    all() { return Object.fromEntries([...data.keys()].sort().map(key => [key, parse(data.get(key))])); },
    write(key, value) { data.set(key, JSON.stringify(value)); return true; },
    append(key, value) {
      const items = data.has(key) ? parse(data.get(key)) : [];
      if (!Array.isArray(items)) throw new Error(`${key} is not an appendable collection.`);
      if (!items.some(item => item?.id && item.id === value?.id)) items.push(value);
      data.set(key, JSON.stringify(items));
      return items;
    },
    delete(key) { data.delete(key); return true; },
    migrate(records, options = {}) {
      // Serialise everything first so a bad value leaves the store untouched.
      const next = Object.entries(records)
        .filter(([key]) => !(options.missingOnly && data.has(key)))
        .map(([key, value]) => [key, JSON.stringify(value)]);
      for (const [key, text] of next) data.set(key, text);
    },
    recordImport() {},
    close() { data.clear(); }
  };
}

module.exports = { createMemoryStore };
