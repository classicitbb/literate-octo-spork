CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version    TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
);

CREATE TABLE IF NOT EXISTS public.tenants (
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
);

CREATE TABLE IF NOT EXISTS public.users (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT REFERENCES public.tenants(id) ON DELETE CASCADE,
  username     TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'csr',
  pin_hash     TEXT NOT NULL,
  display_name TEXT DEFAULT '',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
  email        TEXT DEFAULT '',
  password_hash TEXT DEFAULT NULL,
  UNIQUE(tenant_id, username)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON public.users(email)
  WHERE email != '';

CREATE TABLE IF NOT EXISTS public.sessions (
  id                  TEXT PRIMARY KEY,
  tenant_id           BIGINT NOT NULL REFERENCES public.tenants(id),
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
  csr_user_id         BIGINT REFERENCES public.users(id),
  deleted_at          INTEGER DEFAULT NULL,
  deleted_by          BIGINT REFERENCES public.users(id),
  created_at          INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
  updated_at          INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON public.sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_timestamp ON public.sessions(timestamp);
CREATE INDEX IF NOT EXISTS idx_sessions_deleted ON public.sessions(deleted_at);

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  message    TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER)
);

CREATE TABLE IF NOT EXISTS public.emulation_log (
  id           BIGSERIAL PRIMARY KEY,
  dev_user_id  BIGINT NOT NULL REFERENCES public.users(id),
  tenant_id    BIGINT NOT NULL REFERENCES public.tenants(id),
  started_at   INTEGER NOT NULL DEFAULT (FLOOR(EXTRACT(EPOCH FROM NOW()))::INTEGER),
  ended_at     INTEGER DEFAULT NULL,
  ip_address   TEXT DEFAULT ''
);
