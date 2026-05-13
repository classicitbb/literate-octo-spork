PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS tenants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  account_code  TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  address       TEXT DEFAULT '',
  welcome_msg   TEXT DEFAULT 'While you wait, let us get to know your style.',
  primary_color TEXT DEFAULT '#003087',
  accent_color  TEXT DEFAULT '#CC0000',
  logo_url      TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id    INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
  username     TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'csr',
  pin_hash     TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, username)
);

CREATE TABLE IF NOT EXISTS sessions (
  id                  TEXT PRIMARY KEY,
  tenant_id           INTEGER NOT NULL REFERENCES tenants(id),
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
  csr_purchase_amount REAL DEFAULT 0,
  csr_invoice_number  TEXT DEFAULT '',
  csr_purchase_type   TEXT DEFAULT '',
  csr_no_sale_reason  TEXT DEFAULT '',
  csr_followup_note   TEXT DEFAULT '',
  csr_notes           TEXT DEFAULT '',
  csr_name            TEXT DEFAULT '',
  csr_skills          TEXT DEFAULT NULL,
  csr_assessed_at     INTEGER DEFAULT NULL,
  csr_user_id         INTEGER REFERENCES users(id),
  deleted_at          INTEGER DEFAULT NULL,
  deleted_by          INTEGER REFERENCES users(id),
  created_at          INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at          INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant    ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON sessions(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted   ON sessions(deleted_at);

CREATE TABLE IF NOT EXISTS contact_submissions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS emulation_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  dev_user_id  INTEGER NOT NULL REFERENCES users(id),
  tenant_id    INTEGER NOT NULL REFERENCES tenants(id),
  started_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  ended_at     INTEGER DEFAULT NULL,
  ip_address   TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (unixepoch())
);
