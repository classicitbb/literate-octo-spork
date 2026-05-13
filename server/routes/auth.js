'use strict';
const express = require('express');
const db = require('../db');
const { signToken, signRefreshToken, verifyRefreshToken, comparePin } = require('../services/auth');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { accountCode, pin } = req.body || {};
  if (!accountCode || !pin) return res.status(400).json({ error: 'accountCode and pin required' });

  // Dev login — account_code 'dev' or matching a dev user
  const devUser = db.prepare(
    `SELECT * FROM users WHERE role = 'dev' AND username = ? AND is_active = 1`
  ).get(accountCode);

  if (devUser) {
    const ok = await comparePin(pin, devUser.pin_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid PIN' });

    const payload = { userId: devUser.id, role: 'dev', tenantId: null, displayName: devUser.display_name || 'Dev' };
    const token = signToken(payload);
    const refreshToken = signRefreshToken({ userId: devUser.id });
    res.cookie('ps_refresh', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 86400 * 1000, sameSite: 'lax' });
    return res.json({ token, user: payload, tenant: null });
  }

  // Tenant login
  const tenant = db.prepare(`SELECT * FROM tenants WHERE account_code = ?`).get(accountCode);
  if (!tenant) return res.status(401).json({ error: 'Invalid account code' });
  if (tenant.status !== 'active') return res.status(403).json({ error: 'Account is ' + tenant.status });

  const users = db.prepare(
    `SELECT * FROM users WHERE tenant_id = ? AND is_active = 1 AND role IN ('csr','admin')`
  ).all(tenant.id);

  let matchedUser = null;
  for (const u of users) {
    const ok = await comparePin(pin, u.pin_hash);
    if (ok) { matchedUser = u; break; }
  }

  if (!matchedUser) return res.status(401).json({ error: 'Invalid PIN' });

  const payload = {
    userId: matchedUser.id,
    role: matchedUser.role,
    tenantId: tenant.id,
    displayName: matchedUser.display_name || matchedUser.username,
  };
  const token = signToken(payload);
  const refreshToken = signRefreshToken({ userId: matchedUser.id });
  res.cookie('ps_refresh', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 30 * 86400 * 1000, sameSite: 'lax' });

  res.json({
    token,
    user: payload,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      address: tenant.address,
      welcomeMsg: tenant.welcome_msg,
      primaryColor: tenant.primary_color,
      accentColor: tenant.accent_color,
      logoUrl: tenant.logo_url,
    },
  });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.ps_refresh;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tenant = user.tenant_id
      ? db.prepare('SELECT * FROM tenants WHERE id = ?').get(user.tenant_id)
      : null;

    const tokenPayload = {
      userId: user.id,
      role: user.role,
      tenantId: user.tenant_id || null,
      displayName: user.display_name || user.username,
    };
    res.json({ token: signToken(tokenPayload), tenant: tenant ? {
      id: tenant.id, name: tenant.name, primaryColor: tenant.primary_color,
      accentColor: tenant.accent_color, welcomeMsg: tenant.welcome_msg,
    } : null });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  res.clearCookie('ps_refresh');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/emulate-end — client calls this to log emulation end
router.post('/emulate-end', requireAuth, (req, res) => {
  if (req.user.isEmulation && req.user.emulationLogId) {
    db.prepare('UPDATE emulation_log SET ended_at = unixepoch() WHERE id = ?').run(req.user.emulationLogId);
  }
  res.json({ ok: true });
});

module.exports = router;
