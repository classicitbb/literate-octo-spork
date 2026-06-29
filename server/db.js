'use strict';
require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const bcrypt = require('bcryptjs');
const { Pool, types } = require('pg');

types.setTypeParser(20, Number);
types.setTypeParser(1700, (value) => (value === null ? null : Number(value)));

const LOCAL_SUPABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL ||
  (isProduction ? null : LOCAL_SUPABASE_URL);

if (!connectionString) {
  throw new Error(
    'Postgres is not configured. Set DATABASE_URL or POSTGRES_URL in the deployment environment.'
  );
}

function sanitizeConnectionString(value) {
  try {
    const url = new URL(value);
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    url.searchParams.delete('sslrootcert');
    return url.toString();
  } catch {
    return value;
  }
}

const isLocalConnection = /(?:localhost|127\.0\.0\.1|\[::1\])/.test(connectionString);
const pool = new Pool({
  connectionString: sanitizeConnectionString(connectionString),
  ssl: isLocalConnection ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 5),
});

// APPEND ONLY: never edit existing entries in production; add new migrations at the end.
const MIGRATIONS = [
  {
    version: '001_initial',
    statements: [
      `CREATE TABLE IF NOT EXISTS tenants (
        id            BIGSERIAL PRIMARY KEY,
        account_code  TEXT NOT NULL UNIQUE,
        name          TEXT NOT NULL,
        address       TEXT DEFAULT '',
        welcome_msg   TEXT DEFAULT 'While you wait, let us get to know your style.',
        primary_color TEXT DEFAULT '#003087',
        accent_color  TEXT DEFAULT '#CC0000',
        logo_url      TEXT DEFAULT '',
        status        TEXT NOT NULL DEFAULT 'active',
        created_at    INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
        updated_at    INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
      )`,
      `CREATE TABLE IF NOT EXISTS users (
        id           BIGSERIAL PRIMARY KEY,
        tenant_id    BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
        username     TEXT NOT NULL,
        role         TEXT NOT NULL DEFAULT 'csr',
        pin_hash     TEXT NOT NULL,
        display_name TEXT DEFAULT '',
        is_active    INTEGER NOT NULL DEFAULT 1,
        created_at   INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
        UNIQUE(tenant_id, username)
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id                  TEXT PRIMARY KEY,
        tenant_id           BIGINT NOT NULL REFERENCES tenants(id),
        timestamp           INTEGER NOT NULL,
        is_new_patient      INTEGER NOT NULL DEFAULT 0,
        contact_name        TEXT DEFAULT '',
        contact_phone       TEXT DEFAULT '',
        contact_email       TEXT DEFAULT '',
        answers             TEXT NOT NULL DEFAULT '{}',
        purchase_readiness  INTEGER DEFAULT 0,
        urgency             TEXT DEFAULT 'medium',
        budget_tier         TEXT DEFAULT 'mid',
        frame_style         TEXT DEFAULT '',
        face_shape          TEXT DEFAULT '',
        color_pref          TEXT DEFAULT '',
        usage_env           TEXT DEFAULT '',
        lens_flags          TEXT DEFAULT '[]',
        csr_outcome         TEXT DEFAULT NULL,
        csr_purchase_amount NUMERIC DEFAULT 0,
        csr_invoice_number  TEXT DEFAULT '',
        csr_purchase_type   TEXT DEFAULT '',
        csr_no_sale_reason  TEXT DEFAULT '',
        csr_followup_note   TEXT DEFAULT '',
        csr_notes           TEXT DEFAULT '',
        csr_name            TEXT DEFAULT '',
        csr_skills          TEXT DEFAULT NULL,
        csr_assessed_at     INTEGER DEFAULT NULL,
        csr_user_id         BIGINT REFERENCES users(id),
        deleted_at          INTEGER DEFAULT NULL,
        deleted_by          BIGINT REFERENCES users(id),
        created_at          INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
        updated_at          INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_deleted ON sessions(deleted_at)`,
      `CREATE TABLE IF NOT EXISTS contact_submissions (
        id         BIGSERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        email      TEXT NOT NULL,
        message    TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
      )`,
      `CREATE TABLE IF NOT EXISTS emulation_log (
        id           BIGSERIAL PRIMARY KEY,
        dev_user_id  BIGINT NOT NULL REFERENCES users(id),
        tenant_id    BIGINT NOT NULL REFERENCES tenants(id),
        started_at   INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
        ended_at     INTEGER DEFAULT NULL,
        ip_address   TEXT DEFAULT ''
      )`,
    ],
  },
  {
    version: '002_user_email',
    statements: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT ''`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email != ''`,
    ],
  },
  {
    version: '003_admin_password',
    statements: [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL`,
    ],
  },
];

function normalizeSql(sql, params = []) {
  let index = 0;
  let normalized = sql
    .replace(/unixepoch\(\)/gi, 'FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER')
    .replace(/\?/g, () => `$${++index}`);

  if (
    /^\s*insert\s+into\s+(tenants|users|contact_submissions|emulation_log)\b/i.test(normalized) &&
    !/\breturning\b/i.test(normalized)
  ) {
    normalized = normalized.replace(/;?\s*$/, ' RETURNING id');
  }

  return { text: normalized, values: params };
}

async function runMigrations() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
    )`
  );

  for (const migration of MIGRATIONS) {
    const applied = await pool.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [migration.version]
    );
    if (applied.rowCount > 0) continue;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of migration.statements) {
        await client.query(statement);
      }
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [migration.version]);
      await client.query('COMMIT');
      console.log(`Migration applied: ${migration.version}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

async function bootstrapHostAdmin() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email && !password) return;
  if (!email || !password) {
    throw new Error('Both BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD are required to bootstrap a host admin.');
  }
  if (!email.includes('@')) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
  }
  if (password.length < 8) {
    throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.');
  }

  const existing = await pool.query(
    "SELECT id FROM users WHERE role = 'dev' AND lower(email) = lower($1)",
    [email]
  );
  if (existing.rowCount > 0) return;

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (tenant_id, username, role, pin_hash, password_hash, display_name, email)
     VALUES (NULL, 'host-admin', 'dev', '', $1, 'Host Admin', $2)`,
    [passwordHash, email]
  );
  console.log(`Bootstrapped host admin: ${email}`);
}

async function query(sql, params = []) {
  const statement = normalizeSql(sql, params);
  return pool.query(statement);
}

const db = {
  async _migrate() {
    await runMigrations();
    await bootstrapHostAdmin();
  },

  prepare(sql) {
    return {
      async get(...args) {
        const result = await query(sql, args);
        return result.rows[0] ?? null;
      },
      async all(...args) {
        const result = await query(sql, args);
        return result.rows;
      },
      async run(...args) {
        const result = await query(sql, args);
        return {
          lastInsertRowid: Number(result.rows[0]?.id ?? 0),
          changes: result.rowCount ?? 0,
        };
      },
    };
  },

  async exec(sql) {
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const statement of statements) {
        await client.query(normalizeSql(statement));
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async close() {
    await pool.end();
  },
};

module.exports = db;
