'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const devOnly = require('../middleware/devOnly');
const { hashPin, signToken } = require('../services/auth');
const router = express.Router();

router.use(requireAuth, devOnly);

// GET /api/dev/tenants
router.get('/tenants', async (req, res) => {
  const tenants = await db.prepare(`
    SELECT t.*,
      (SELECT COUNT(*) FROM sessions WHERE tenant_id = t.id AND deleted_at IS NULL) as session_count,
      (SELECT COUNT(*) FROM users WHERE tenant_id = t.id AND is_active = 1) as user_count
    FROM tenants t ORDER BY t.created_at DESC
  `).all();
  res.json(tenants);
});

// POST /api/dev/tenants
router.post('/tenants', async (req, res) => {
  const {
    accountCode, name, address, adminEmail, csrEmail,
    adminPin, csrPin, welcomeMsg, primaryColor, accentColor,
  } = req.body || {};
  if (!accountCode || !name || !adminEmail || !csrEmail || !adminPin || !csrPin) {
    return res.status(400).json({ error: 'accountCode, name, adminEmail, csrEmail, adminPin, and csrPin required' });
  }
  if (!adminEmail.includes('@') || !csrEmail.includes('@')) {
    return res.status(400).json({ error: 'Valid admin and CSR email addresses are required' });
  }
  if (!/^\d{4}$/.test(String(adminPin)) || !/^\d{4}$/.test(String(csrPin))) {
    return res.status(400).json({ error: 'PINs must be exactly 4 digits' });
  }

  try {
    const result = await db.prepare(`INSERT INTO tenants (account_code, name, address, welcome_msg, primary_color, accent_color)
      VALUES (?, ?, ?, ?, ?, ?)`).run(
      accountCode, name, address || '',
      welcomeMsg || 'While you wait, let us get to know your style.',
      primaryColor || '#003087', accentColor || '#CC0000'
    );
    const tenantId = result.lastInsertRowid;

    const adminHash = await hashPin(adminPin);
    const csrHash = await hashPin(csrPin);

    await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name, email) VALUES (?, ?, 'admin', ?, 'Admin', ?)`)
      .run(tenantId, accountCode + '-admin', adminHash, adminEmail.trim().toLowerCase());
    await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name, email) VALUES (?, ?, 'csr', ?, 'CSR', ?)`)
      .run(tenantId, accountCode + '-csr', csrHash, csrEmail.trim().toLowerCase());

    res.status(201).json({ id: tenantId, accountCode });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Account code already exists' });
    throw e;
  }
});

// GET /api/dev/tenants/:id
router.get('/tenants/:id', async (req, res) => {
  const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  const users = await db.prepare('SELECT id, username, role, display_name, is_active FROM users WHERE tenant_id = ?').all(req.params.id);
  res.json({ ...tenant, users });
});

// PATCH /api/dev/tenants/:id
router.patch('/tenants/:id', async (req, res) => {
  const { name, address, welcomeMsg, primaryColor, accentColor } = req.body || {};
  await db.prepare(`UPDATE tenants SET
    name = COALESCE(?, name), address = COALESCE(?, address),
    welcome_msg = COALESCE(?, welcome_msg), primary_color = COALESCE(?, primary_color),
    accent_color = COALESCE(?, accent_color), updated_at = unixepoch()
    WHERE id = ?`).run(name || null, address || null, welcomeMsg || null, primaryColor || null, accentColor || null, req.params.id);
  res.json({ ok: true });
});

// PATCH /api/dev/tenants/:id/status
router.patch('/tenants/:id/status', async (req, res) => {
  const { status } = req.body || {};
  if (!['active', 'suspended', 'disabled'].includes(status)) {
    return res.status(400).json({ error: 'status must be active, suspended, or disabled' });
  }
  await db.prepare('UPDATE tenants SET status = ?, updated_at = unixepoch() WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// POST /api/dev/tenants/:id/emulate
router.post('/tenants/:id/emulate', async (req, res) => {
  const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const logResult = await db.prepare(`INSERT INTO emulation_log (dev_user_id, tenant_id, ip_address) VALUES (?, ?, ?)`)
    .run(req.user.userId, tenant.id, req.ip || '');

  const payload = {
    userId: req.user.userId,
    role: 'admin',
    tenantId: tenant.id,
    displayName: req.user.displayName,
    isEmulation: true,
    originalDevUserId: req.user.userId,
    emulationLogId: logResult.lastInsertRowid,
  };
  const token = signToken(payload, '1h');
  res.json({ token, tenant: {
    id: tenant.id, name: tenant.name,
    primaryColor: tenant.primary_color, accentColor: tenant.accent_color,
    welcomeMsg: tenant.welcome_msg,
  }});
});

// GET /api/dev/tenants/:id/sessions
router.get('/tenants/:id/sessions', async (req, res) => {
  const { date } = req.query;
  let query = 'SELECT * FROM sessions WHERE tenant_id = ?';
  const params = [req.params.id];
  if (date) {
    const [y, m, d] = date.split('-').map(Number);
    const start = Math.floor(new Date(y, m - 1, d).getTime() / 1000);
    params.push(start, start + 86400);
    query += ' AND timestamp >= ? AND timestamp < ?';
  }
  query += ' ORDER BY timestamp DESC LIMIT 200';
  res.json(await db.prepare(query).all(...params));
});

// GET /api/dev/emulation-log
router.get('/emulation-log', async (req, res) => {
  const rows = await db.prepare(`
    SELECT el.*, u.username as dev_username, t.name as tenant_name
    FROM emulation_log el
    JOIN users u ON el.dev_user_id = u.id
    JOIN tenants t ON el.tenant_id = t.id
    ORDER BY el.started_at DESC LIMIT 100
  `).all();
  res.json(rows);
});

// POST /api/dev/users — create a dev user
router.post('/users', async (req, res) => {
  const { username, pin, displayName } = req.body || {};
  if (!username || !pin) return res.status(400).json({ error: 'username and pin required' });
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be 4 digits' });
  const pinHash = await hashPin(pin);
  try {
    const result = await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (NULL, ?, 'dev', ?, ?)`)
      .run(username, pinHash, displayName || username);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username taken' });
    throw e;
  }
});

module.exports = router;
