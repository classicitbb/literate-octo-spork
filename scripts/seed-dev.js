#!/usr/bin/env node
'use strict';
require('dotenv').config();
const db = require('../server/db');
const { hashPin } = require('../server/services/auth');
const { scoreAnswers } = require('../server/services/scoring');

const TENANTS = [
  { code: 'trinidad-main', name: 'PriceSmart Optical — Port of Spain', address: '12 Frederick St, Port of Spain', adminPin: '9999', csrPin: '1234' },
  { code: 'trinidad-south', name: 'PriceSmart Optical — San Fernando', address: '45 High St, San Fernando', adminPin: '9999', csrPin: '1234' },
  { code: 'dev-demo', name: 'Dev Demo Store', address: '1 Test Lane', adminPin: '0000', csrPin: '1111' },
];

const SAMPLE_ANSWERS = [
  { q1:'a', q2:'a', q3:'d', q4:'a', q5:'b', q6:'d', q7:'a', q8:'c', q9:'b', q10:'a', q11:'c', q12:'a' },
  { q1:'b', q2:'b', q3:'c', q4:'b', q5:'a', q6:'c', q7:'b', q8:'b', q9:'c', q10:'b', q11:'b', q12:'b' },
  { q1:'c', q2:'c', q3:'b', q4:'c', q5:'c', q6:'b', q7:'c', q8:'a', q9:'a', q10:'c', q11:'a', q12:'c' },
  { q1:'a', q2:'d', q3:'a', q4:'d', q5:'d', q6:'a', q7:'d', q8:'d', q9:'d', q10:'d', q11:'d', q12:'d' },
  { q1:'b', q2:'a', q3:'c', q4:'a', q5:'b', q6:'d', q7:'a', q8:'c', q9:'b', q10:'a', q11:'c', q12:'a' },
];

const CONTACTS = [
  { name: 'Maria Thompson', phone: '868-555-0101', email: 'maria@example.com' },
  { name: 'James Henry', phone: '868-555-0202', email: '' },
  { name: 'Sandra Ali', phone: '868-555-0303', email: 'sandra@example.com' },
  { name: 'Derek Williams', phone: '', email: '' },
  { name: 'Keisha Joseph', phone: '868-555-0505', email: 'keisha@example.com' },
  { name: 'Andre Baptiste', phone: '868-555-0606', email: '' },
  { name: 'Tricia Mohammed', phone: '868-555-0707', email: 'tricia@example.com' },
  { name: '', phone: '', email: '' },
];

const OUTCOMES = [
  { outcome: 'purchased', purchaseAmount: 450, invoiceNumber: 'INV-001', purchaseType: 'Frames + blue light lenses', csrName: 'James' },
  { outcome: 'purchased', purchaseAmount: 280, invoiceNumber: 'INV-002', purchaseType: 'Frames + standard lenses', csrName: 'Sandra' },
  { outcome: 'no-sale', noSaleReason: 'Price / budget concern', csrName: 'James' },
  { outcome: 'followup', followupNote: 'Call next week — needs to check with optometrist', csrName: 'Sandra' },
  null,
];

function randomId() {
  return 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

async function seed() {
  console.log('Seeding dev database...');

  const devExists = await db.prepare(`SELECT id FROM users WHERE role='dev' AND username='dev'`).get();
  if (!devExists) {
    const devHash = await hashPin('0000');
    await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (NULL, 'dev', 'dev', ?, 'Dev Admin')`).run(devHash);
    console.log('Created dev user: code=dev PIN=0000');
  }

  for (const t of TENANTS) {
    const existing = await db.prepare('SELECT id FROM tenants WHERE account_code = ?').get(t.code);
    if (existing) { console.log(`Skipping existing tenant: ${t.code}`); continue; }

    const result = await db.prepare('INSERT INTO tenants (account_code, name, address) VALUES (?, ?, ?)').run(t.code, t.name, t.address);
    const tenantId = result.lastInsertRowid;

    const adminHash = await hashPin(t.adminPin);
    const csrHash = await hashPin(t.csrPin);
    await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (?, ?, 'admin', ?, 'Admin')`).run(tenantId, t.code + '-admin', adminHash);
    await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (?, ?, 'csr', ?, 'CSR')`).run(tenantId, t.code + '-csr', csrHash);

    const base = Math.floor(Date.now() / 1000) - 3600 * 6;
    for (let i = 0; i < 20; i++) {
      const answers = SAMPLE_ANSWERS[i % SAMPLE_ANSWERS.length];
      const score = scoreAnswers(answers);
      const contact = CONTACTS[i % CONTACTS.length];
      const id = randomId();
      const ts = base + i * 900;
      const isNew = i % 4 === 0 ? 1 : 0;

      await db.prepare(`INSERT INTO sessions (id, tenant_id, timestamp, is_new_patient,
        contact_name, contact_phone, contact_email, answers,
        purchase_readiness, urgency, budget_tier, frame_style, face_shape, color_pref, usage_env, lens_flags,
        created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
        id, tenantId, ts, isNew,
        contact.name, contact.phone, contact.email, JSON.stringify(answers),
        score.purchaseReadiness, score.urgency, score.budgetTier,
        score.frameStyle, score.faceShape, score.colorPref, score.usageEnv,
        JSON.stringify(score.lensFlags), ts, ts
      );

      const outcomeData = OUTCOMES[i % OUTCOMES.length];
      if (outcomeData) {
        await db.prepare(`UPDATE sessions SET csr_outcome=?, csr_purchase_amount=?, csr_invoice_number=?,
          csr_purchase_type=?, csr_no_sale_reason=?, csr_followup_note=?, csr_name=?,
          csr_skills=?, csr_assessed_at=unixepoch()
          WHERE id=?`).run(
          outcomeData.outcome, outcomeData.purchaseAmount || 0, outcomeData.invoiceNumber || '',
          outcomeData.purchaseType || '', outcomeData.noSaleReason || '', outcomeData.followupNote || '',
          outcomeData.csrName || '',
          JSON.stringify({ rapport: 4, discovery: 4, presentation: 4, lensUpsell: 3, close: 4 }),
          id
        );
      }
    }

    console.log(`Created tenant: ${t.name} (${t.code}) with 20 demo sessions`);
  }

  console.log('\nSeed complete. Login credentials:');
  console.log('  Dev:          code=dev  PIN=0000');
  TENANTS.forEach(t => {
    console.log(`  ${t.name}:`);
    console.log(`    Account code: ${t.code}`);
    console.log(`    Admin PIN: ${t.adminPin}  |  CSR PIN: ${t.csrPin}`);
  });
}

seed().catch(e => { console.error(e); process.exit(1); });
