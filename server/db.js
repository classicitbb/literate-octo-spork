'use strict';
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });
const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH || './server/data/pricesmart.db';
const dataDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new DatabaseSync(path.resolve(dbPath));
sqlite.exec('PRAGMA journal_mode = WAL');
sqlite.exec('PRAGMA foreign_keys = ON');

function runMigrations() {
  sqlite.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace('.sql', '');
    const already = sqlite.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version);
    if (already) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    sqlite.exec(sql);
    sqlite.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    console.log(`Migration applied: ${version}`);
  }
}

runMigrations();

// Async-compatible wrapper so routes can use await db.prepare(...).get/all/run
const db = {
  prepare(sql) {
    const stmt = sqlite.prepare(sql);
    return {
      get(...args) { return Promise.resolve(stmt.get(...args) ?? null); },
      all(...args) { return Promise.resolve(stmt.all(...args)); },
      run(...args) {
        const r = stmt.run(...args);
        return Promise.resolve({ lastInsertRowid: r.lastInsertRowid, changes: r.changes });
      },
    };
  },
  exec(sql) {
    sqlite.exec(sql);
    return Promise.resolve();
  },
};

module.exports = db;
