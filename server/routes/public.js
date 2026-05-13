'use strict';
const express = require('express');
const db = require('../db');
const { scoreAnswers } = require('../services/scoring');
const router = express.Router();

const RECORD_LIMIT = 1000;

function generateId() {
  return 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

router.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

router.post('/contact', async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  await db.prepare('INSERT INTO contact_submissions (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
  res.json({ ok: true });
});

// GET /api/public/tenant?code=ACCOUNT_CODE
router.get('/public/tenant', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'code required' });

  const tenant = await db.prepare(
    `SELECT name, welcome_msg, primary_color, accent_color, logo_url
     FROM tenants WHERE account_code = ? AND status = 'active'`
  ).get(code);

  if (!tenant) return res.status(404).json({ error: 'Store not found' });

  res.json({
    name: tenant.name,
    welcomeMsg: tenant.welcome_msg,
    primaryColor: tenant.primary_color,
    accentColor: tenant.accent_color,
    logoUrl: tenant.logo_url,
  });
});

// POST /api/public/intake
router.post('/public/intake', async (req, res) => {
  const { accountCode, isNewPatient, contact, answers } = req.body || {};
  if (!accountCode || !answers) {
    return res.status(400).json({ error: 'accountCode and answers required' });
  }

  const tenant = await db.prepare(
    `SELECT * FROM tenants WHERE account_code = ? AND status = 'active'`
  ).get(accountCode);
  if (!tenant) return res.status(404).json({ error: 'Store not found' });

  const count = await db.prepare(
    'SELECT COUNT(*) as c FROM sessions WHERE tenant_id = ? AND deleted_at IS NULL'
  ).get(tenant.id);
  if (count.c >= RECORD_LIMIT) {
    return res.status(429).json({ error: 'Record limit reached. Please speak to a staff member.' });
  }

  const score = scoreAnswers(answers);
  const id = generateId();
  const now = Math.floor(Date.now() / 1000);

  await db.prepare(`INSERT INTO sessions (
    id, tenant_id, timestamp, is_new_patient,
    contact_name, contact_phone, contact_email,
    answers, purchase_readiness, urgency, budget_tier,
    frame_style, face_shape, color_pref, usage_env, lens_flags,
    created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, tenant.id, now, isNewPatient ? 1 : 0,
    contact?.name || '', contact?.phone || '', contact?.email || '',
    JSON.stringify(answers),
    score.purchaseReadiness, score.urgency, score.budgetTier,
    score.frameStyle, score.faceShape, score.colorPref, score.usageEnv,
    JSON.stringify(score.lensFlags || []),
    now, now
  );

  res.json({ ok: true, score });
});

module.exports = router;
