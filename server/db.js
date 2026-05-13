'use strict';
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const { DatabaseSync } = require('node:sqlite');

const dbPath = process.env.DB_PATH || './server/data/pricesmart.db';

// Ensure data directory exists
const dataDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.resolve(dbPath));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

function runMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  db.prepare(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`).run();

  for (const file of files) {
    const version = file.replace('.sql', '');
    const already = db.prepare('SELECT 1 FROM schema_migrations WHERE version = ?').get(version);
    if (already) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(version);
    console.log(`Migration applied: ${version}`);
  }
}

runMigrations();

module.exports = db;
