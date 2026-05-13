'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { hashPin } = require('../services/auth');
const tenantGuard = require('../middleware/tenantGuard');
const router = express.Router();

// GET /api/users
router.get('/', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const tenantId = req.user.tenantId;
  const users = await db.prepare(`SELECT id, username, role, display_name, is_active, created_at FROM users WHERE tenant_id = ?`).all(tenantId);
  res.json(users);
});

// POST /api/users
router.post('/', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const { username, pin, displayName, role, email } = req.body || {};
  if (!username || !pin) return res.status(400).json({ error: 'username and pin required' });
  if (!/^\d{4}$/.test(String(pin))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

  const tenantId = req.user.tenantId;
  const safeRole = ['csr', 'admin'].includes(role) ? role : 'csr';
  const pinHash = await hashPin(pin);

  try {
    const result = await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name, email) VALUES (?, ?, ?, ?, ?, ?)`).run(tenantId, username, safeRole, pinHash, displayName || '', email || '');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username already exists' });
    throw e;
  }
});

// PATCH /api/users/:id
router.patch('/:id', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const { displayName, isActive, email } = req.body || {};
  const tenantId = req.user.tenantId;
  const user = await db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, tenantId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  try {
    await db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), is_active = COALESCE(?, is_active), email = COALESCE(?, email) WHERE id = ?')
      .run(displayName ?? null, isActive !== undefined ? (isActive ? 1 : 0) : null, email ?? null, req.params.id);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already in use' });
    throw e;
  }
  res.json({ ok: true });
});

// DELETE /api/users/:id — deactivate only
router.delete('/:id', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (Number(req.params.id) === req.user.userId) return res.status(400).json({ error: 'Cannot deactivate yourself' });
  const user = await db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').get(req.params.id, tenantId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
