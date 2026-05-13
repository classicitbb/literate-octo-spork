'use strict';
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });
const { createClient } = require('@libsql/client');

const isRemote = !!process.env.TURSO_DATABASE_URL;

const url = isRemote
  ? process.env.TURSO_DATABASE_URL
  : `file:${path.resolve(process.env.DB_PATH || './server/data/pricesmart.db')}`;

const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

function rowToObj(row, columns) {
  const obj = {};
  for (const col of columns) obj[col] = row[col];
  return obj;
}

async function execSql(sql) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !/^pragma\s+journal_mode/i.test(s));
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

async function runMigrations() {
  await client.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace('.sql', '');
    const check = await client.execute({
      sql: 'SELECT 1 FROM schema_migrations WHERE version = ?',
      args: [version],
    });
    if (check.rows.length) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await execSql(sql);
    await client.execute({ sql: 'INSERT INTO schema_migrations (version) VALUES (?)', args: [version] });
    console.log(`Migration applied: ${version}`);
  }
}

let initPromise = null;

async function initialize() {
  if (!isRemote) {
    const dbPath = process.env.DB_PATH || './server/data/pricesmart.db';
    const dataDir = path.dirname(path.resolve(dbPath));
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  }
  await client.execute('PRAGMA foreign_keys = ON');
  await runMigrations();
}

const db = {
  prepare(sql) {
    return {
      async get(...args) {
        await db.init();
        const r = await client.execute({ sql, args });
        return r.rows[0] ? rowToObj(r.rows[0], r.columns) : null;
      },
      async all(...args) {
        await db.init();
        const r = await client.execute({ sql, args });
        return r.rows.map(row => rowToObj(row, r.columns));
      },
      async run(...args) {
        await db.init();
        const r = await client.execute({ sql, args });
        return { lastInsertRowid: Number(r.lastInsertRowid) };
      },
    };
  },
  async exec(sql) {
    await db.init();
    await execSql(sql);
  },
  init() {
    if (!initPromise) initPromise = initialize();
    return initPromise;
  },
};

module.exports = db;
