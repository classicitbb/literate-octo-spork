'use strict';
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const { createClient } = require('@libsql/client');

const url = process.env.TURSO_URL || `file:${path.resolve('./server/data/dev.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

// Ensure local data directory exists for file:// URLs
if (url.startsWith('file:')) {
  const filePath = url.replace(/^file:/, '');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const client = createClient({ url, authToken });

async function runMigrations() {
  await client.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);

  // process.cwd() = project root both locally and on Vercel (/var/task)
  const migrationsDir = path.join(process.cwd(), 'server', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace('.sql', '');
    const result = await client.execute({
      sql: 'SELECT 1 FROM schema_migrations WHERE version = ?',
      args: [version],
    });
    if (result.rows.length > 0) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    // Split on semicolons, skip PRAGMA statements (not supported by Turso remote)
    const statements = sql.split(';').map(s => s.trim()).filter(s => s && !s.toUpperCase().startsWith('PRAGMA'));
    for (const stmt of statements) {
      await client.execute(stmt);
    }
    await client.execute({ sql: 'INSERT INTO schema_migrations (version) VALUES (?)', args: [version] });
    console.log(`Migration applied: ${version}`);
  }
}

// Wrap @libsql/client to match the existing db.prepare(sql).get/all/run() API
// so no route code needs to change.
const db = {
  async _migrate() {
    await runMigrations();
  },

  prepare(sql) {
    return {
      async get(...args) {
        const result = await client.execute({ sql, args });
        return result.rows[0] ?? null;
      },
      async all(...args) {
        const result = await client.execute({ sql, args });
        return result.rows;
      },
      async run(...args) {
        const result = await client.execute({ sql, args });
        return {
          lastInsertRowid: Number(result.lastInsertRowid ?? 0),
          changes: result.rowsAffected ?? 0,
        };
      },
    };
  },

  async exec(sql) {
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
  },
};

module.exports = db;
