'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS app_collections (
      collection_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS csv_import_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_key TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      imported_at TEXT NOT NULL
    );`);
  const readOne = db.prepare('SELECT value_json FROM app_collections WHERE collection_key = ?');
  const readAll = db.prepare('SELECT collection_key, value_json FROM app_collections ORDER BY collection_key');
  const upsert = db.prepare(`INSERT INTO app_collections(collection_key,value_json,updated_at) VALUES(?,?,?)
    ON CONFLICT(collection_key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`);
  const insertMissing = db.prepare('INSERT OR IGNORE INTO app_collections(collection_key,value_json,updated_at) VALUES(?,?,?)');
  const remove = db.prepare('DELETE FROM app_collections WHERE collection_key = ?');
  const history = db.prepare('INSERT INTO csv_import_history(collection_key,row_count,imported_at) VALUES(?,?,?)');
  return {
    raw: db,
    read(key, fallback = null) { const row = readOne.get(key); return row ? JSON.parse(row.value_json) : fallback; },
    all() { return Object.fromEntries(readAll.all().map(row => [row.collection_key, JSON.parse(row.value_json)])); },
    write(key, value) { upsert.run(key, JSON.stringify(value), new Date().toISOString()); return true; },
    append(key, value) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const row=readOne.get(key),items=row?JSON.parse(row.value_json):[];
        if(!Array.isArray(items))throw new Error(`${key} is not an appendable collection.`);
        if(!items.some(item=>item?.id&&item.id===value?.id))items.push(value);
        upsert.run(key,JSON.stringify(items),new Date().toISOString());
        db.exec('COMMIT');
        return items;
      } catch(error) { db.exec('ROLLBACK'); throw error; }
    },
    delete(key) { remove.run(key); return true; },
    migrate(records, options = {}) {
      db.exec('BEGIN IMMEDIATE');
      try { for (const [key, value] of Object.entries(records)) (options.missingOnly ? insertMissing : upsert).run(key, JSON.stringify(value), new Date().toISOString()); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    recordImport(key, count) { history.run(key, count, new Date().toISOString()); },
    close() { db.close(); }
  };
}

module.exports = { openDatabase };
