'use strict';
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { hashPin } = require('../services/auth');
const tenantGuard = require('../middleware/tenantGuard');
const router = express.Router();

// GET /api/config
router.get('/', requireAuth, tenantGuard, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'No tenant' });
  const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?').get(tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json({
    id: tenant.id,
    accountCode: tenant.account_code,
    name: tenant.name,
    address: tenant.address,
    welcomeMsg: tenant.welcome_msg,
    primaryColor: tenant.primary_color,
    accentColor: tenant.accent_color,
    logoUrl: tenant.logo_url,
    status: tenant.status,
  });
});

// PATCH /api/config
router.patch('/', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'No tenant' });
  const { name, address, welcomeMsg, primaryColor, accentColor } = req.body || {};
  await db.prepare(`UPDATE tenants SET
    name = COALESCE(?, name),
    address = COALESCE(?, address),
    welcome_msg = COALESCE(?, welcome_msg),
    primary_color = COALESCE(?, primary_color),
    accent_color = COALESCE(?, accent_color),
    updated_at = unixepoch()
    WHERE id = ?`).run(name || null, address || null, welcomeMsg || null, primaryColor || null, accentColor || null, tenantId);
  res.json({ ok: true });
});

// PATCH /api/config/pins
router.patch('/pins', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const { userId, newPin } = req.body || {};
  if (!userId || !newPin) return res.status(400).json({ error: 'userId and newPin required' });
  if (!/^\d{4}$/.test(String(newPin))) return res.status(400).json({ error: 'PIN must be exactly 4 digits' });

  const tenantId = req.user.tenantId;
  const user = await db.prepare('SELECT * FROM users WHERE id = ? AND tenant_id = ?').get(userId, tenantId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const pinHash = await hashPin(newPin);
  await db.prepare('UPDATE users SET pin_hash = ? WHERE id = ?').run(pinHash, userId);
  res.json({ ok: true });
});

module.exports = router;
