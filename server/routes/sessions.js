'use strict';
const express = require('express');
const db = require('../db');
const { scoreAnswers } = require('../services/scoring');
const { requireAuth, requireRole } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const router = express.Router();

const RECORD_LIMIT = 1000;

function generateId() {
  return 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

function sessionToClient(row) {
  return {
    id: row.id,
    timestamp: row.timestamp * 1000,
    isNewPatient: !!row.is_new_patient,
    contact: { name: row.contact_name, phone: row.contact_phone, email: row.contact_email },
    answers: JSON.parse(row.answers || '{}'),
    score: {
      purchaseReadiness: row.purchase_readiness,
      urgency: row.urgency,
      budgetTier: row.budget_tier,
      frameStyle: row.frame_style,
      faceShape: row.face_shape,
      colorPref: row.color_pref,
      usageEnv: row.usage_env,
      lensFlags: JSON.parse(row.lens_flags || '[]'),
    },
    csrAssessment: row.csr_outcome ? {
      outcome: row.csr_outcome,
      purchaseAmount: row.csr_purchase_amount,
      invoiceNumber: row.csr_invoice_number,
      purchaseType: row.csr_purchase_type,
      noSaleReason: row.csr_no_sale_reason,
      followupNote: row.csr_followup_note,
      notes: row.csr_notes,
      csrName: row.csr_name,
      skills: JSON.parse(row.csr_skills || 'null'),
    } : null,
    deletedAt: row.deleted_at ? row.deleted_at * 1000 : null,
  };
}

// GET /api/sessions
router.get('/', requireAuth, tenantGuard, async (req, res) => {
  const tenantId = req.user.role === 'dev' ? req.query.tenantId : req.user.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'tenantId required for dev role' });

  const { date, includeDeleted } = req.query;
  let query = 'SELECT * FROM sessions WHERE tenant_id = ?';
  const params = [tenantId];

  if (date) {
    const [y, m, d] = date.split('-').map(Number);
    const start = Math.floor(new Date(y, m - 1, d).getTime() / 1000);
    const end = start + 86400;
    query += ' AND timestamp >= ? AND timestamp < ?';
    params.push(start, end);
  }

  const canSeeDeleted = includeDeleted === 'true' && ['admin','dev'].includes(req.user.role);
  if (!canSeeDeleted) query += ' AND deleted_at IS NULL';

  query += ' ORDER BY timestamp DESC';
  const rows = await db.prepare(query).all(...params);
  res.json(rows.map(sessionToClient));
});

// POST /api/sessions
router.post('/', requireAuth, tenantGuard, async (req, res) => {
  const tenantId = req.user.tenantId;
  if (!tenantId) return res.status(400).json({ error: 'Not a tenant user' });

  const count = await db.prepare('SELECT COUNT(*) as c FROM sessions WHERE tenant_id = ? AND deleted_at IS NULL').get(tenantId);
  if (count.c >= RECORD_LIMIT) {
    return res.status(429).json({ error: 'Record limit reached. Ask your admin to archive old records.' });
  }

  const { isNewPatient, contact, answers } = req.body || {};
  if (!answers) return res.status(400).json({ error: 'answers required' });

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
    id, tenantId, now, isNewPatient ? 1 : 0,
    contact?.name || '', contact?.phone || '', contact?.email || '',
    JSON.stringify(answers),
    score.purchaseReadiness, score.urgency, score.budgetTier,
    score.frameStyle, score.faceShape, score.colorPref, score.usageEnv,
    JSON.stringify(score.lensFlags),
    now, now
  );

  res.status(201).json({ id, score });
});

// PATCH /api/sessions/:id/contact
router.patch('/:id/contact', requireAuth, tenantGuard, async (req, res) => {
  const { name, phone, email } = req.body || {};
  const tenantId = req.user.role === 'dev' ? undefined : req.user.tenantId;
  const where = tenantId ? 'id = ? AND tenant_id = ?' : 'id = ?';
  const params = tenantId ? [req.params.id, tenantId] : [req.params.id];

  const row = await db.prepare(`SELECT id FROM sessions WHERE ${where} AND deleted_at IS NULL`).get(...params);
  if (!row) return res.status(404).json({ error: 'Session not found' });

  await db.prepare(`UPDATE sessions SET contact_name=?, contact_phone=?, contact_email=?, updated_at=unixepoch() WHERE id=?`)
    .run(name || '', phone || '', email || '', req.params.id);
  res.json({ ok: true });
});

// PATCH /api/sessions/:id/assessment
router.patch('/:id/assessment', requireAuth, tenantGuard, async (req, res) => {
  const { outcome, purchaseAmount, invoiceNumber, purchaseType, noSaleReason, followupNote, notes, csrName, skills } = req.body || {};
  const tenantId = req.user.role === 'dev' ? undefined : req.user.tenantId;
  const where = tenantId ? 'id = ? AND tenant_id = ?' : 'id = ?';
  const params = tenantId ? [req.params.id, tenantId] : [req.params.id];

  const row = await db.prepare(`SELECT id FROM sessions WHERE ${where} AND deleted_at IS NULL`).get(...params);
  if (!row) return res.status(404).json({ error: 'Session not found' });

  await db.prepare(`UPDATE sessions SET
    csr_outcome=?, csr_purchase_amount=?, csr_invoice_number=?, csr_purchase_type=?,
    csr_no_sale_reason=?, csr_followup_note=?, csr_notes=?, csr_name=?,
    csr_skills=?, csr_assessed_at=unixepoch(), csr_user_id=?, updated_at=unixepoch()
    WHERE id=?`).run(
    outcome || null, purchaseAmount || 0, invoiceNumber || '', purchaseType || '',
    noSaleReason || '', followupNote || '', notes || '', csrName || '',
    skills ? JSON.stringify(skills) : null, req.user.userId, req.params.id
  );
  res.json({ ok: true });
});

// DELETE /api/sessions/:id — soft delete, admin only
router.delete('/:id', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  const tenantId = req.user.role === 'dev' ? undefined : req.user.tenantId;
  const where = tenantId ? 'id = ? AND tenant_id = ?' : 'id = ?';
  const params = tenantId ? [req.params.id, tenantId] : [req.params.id];

  const row = await db.prepare(`SELECT id FROM sessions WHERE ${where}`).get(...params);
  if (!row) return res.status(404).json({ error: 'Session not found' });

  await db.prepare(`UPDATE sessions SET deleted_at=unixepoch(), deleted_by=?, updated_at=unixepoch() WHERE id=?`)
    .run(req.user.userId, req.params.id);
  res.json({ ok: true });
});

// PATCH /api/sessions/:id/restore — admin only
router.patch('/:id/restore', requireAuth, requireRole('admin', 'dev'), tenantGuard, async (req, res) => {
  await db.prepare(`UPDATE sessions SET deleted_at=NULL, deleted_by=NULL, updated_at=unixepoch() WHERE id=?`)
    .run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
