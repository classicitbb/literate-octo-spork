#!/usr/bin/env node
'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../server/db');
const { hashPin } = require('../server/services/auth');
const { scoreAnswers } = require('../server/services/scoring');

const ADMIN_EMAIL    = 'admin@patientsmart.app';
const ADMIN_PASSWORD = 'Admin1234!';

const TENANT = {
  code:    'demo-clinic',
  name:    'Demo Clinic',
  address: '1 Health Ave, Demo City',
};

const MANAGER_EMAIL = 'manager@democlinic.com';
const MANAGER_PIN   = '1234';
const CSR_EMAIL     = 'csr@democlinic.com';
const CSR_PIN       = '5678';

const SAMPLE_ANSWERS = [
  { q1:'a', q2:'a', q3:'d', q4:'a', q5:'b', q6:'d', q7:'a', q8:'c', q9:'b', q10:'a', q11:'c', q12:'a' },
  { q1:'b', q2:'b', q3:'c', q4:'b', q5:'a', q6:'c', q7:'b', q8:'b', q9:'c', q10:'b', q11:'b', q12:'b' },
  { q1:'c', q2:'c', q3:'b', q4:'c', q5:'c', q6:'b', q7:'c', q8:'a', q9:'a', q10:'c', q11:'a', q12:'c' },
];

const CONTACTS = [
  { name: 'Maria Thompson', phone: '555-0101', email: 'maria@example.com' },
  { name: 'James Henry',    phone: '555-0202', email: '' },
  { name: 'Sandra Ali',     phone: '555-0303', email: 'sandra@example.com' },
  { name: 'Derek Williams', phone: '',         email: '' },
];

const OUTCOMES = [
  { outcome: 'purchased', purchaseAmount: 450, invoiceNumber: 'INV-001', purchaseType: 'Full exam package', csrName: 'James' },
  { outcome: 'no-sale',   noSaleReason: 'Price / budget concern', csrName: 'Sandra' },
  { outcome: 'followup',  followupNote: 'Call next week', csrName: 'James' },
  null,
];

function randomId() {
  return 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

async function seed() {
  await db._migrate();

  console.log('\nSeeding Patient Smart App...\n');

  // ── Host admin ────────────────────────────────────────────────────────────
  const existingAdmin = await db.prepare(`SELECT id FROM users WHERE role='dev' AND lower(email)=lower(?)`).get(ADMIN_EMAIL);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await db.prepare(
      `INSERT INTO users (tenant_id, username, role, pin_hash, password_hash, display_name, email)
       VALUES (NULL, 'host-admin', 'dev', '', ?, 'Host Admin', ?)`
    ).run(passwordHash, ADMIN_EMAIL);
    console.log('✓ Created host admin');
  } else {
    console.log('  Host admin already exists — skipping');
  }

  // ── Demo tenant ───────────────────────────────────────────────────────────
  const existingTenant = await db.prepare('SELECT id FROM tenants WHERE account_code = ?').get(TENANT.code);
  if (existingTenant) {
    console.log('  Demo tenant already exists — skipping sessions\n');
  } else {
    const { lastInsertRowid: tenantId } = await db.prepare(
      `INSERT INTO tenants (account_code, name, address, welcome_msg)
       VALUES (?, ?, ?, 'Welcome! Please complete this short questionnaire while you wait.')`
    ).run(TENANT.code, TENANT.name, TENANT.address);

    const managerHash = await hashPin(MANAGER_PIN);
    const csrHash     = await hashPin(CSR_PIN);

    await db.prepare(
      `INSERT INTO users (tenant_id, username, role, pin_hash, display_name, email) VALUES (?, ?, 'admin', ?, 'Manager', ?)`
    ).run(tenantId, 'demo-manager', managerHash, MANAGER_EMAIL);

    await db.prepare(
      `INSERT INTO users (tenant_id, username, role, pin_hash, display_name, email) VALUES (?, ?, 'csr', ?, 'CSR', ?)`
    ).run(tenantId, 'demo-csr', csrHash, CSR_EMAIL);

    const base = Math.floor(Date.now() / 1000) - 3600 * 4;
    for (let i = 0; i < 10; i++) {
      const answers = SAMPLE_ANSWERS[i % SAMPLE_ANSWERS.length];
      const score   = scoreAnswers(answers);
      const contact = CONTACTS[i % CONTACTS.length];
      const id      = randomId();
      const ts      = base + i * 600;

      await db.prepare(`
        INSERT INTO sessions (id, tenant_id, timestamp, is_new_patient,
          contact_name, contact_phone, contact_email, answers,
          purchase_readiness, urgency, budget_tier, frame_style, face_shape,
          color_pref, usage_env, lens_flags, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        id, tenantId, ts, i % 3 === 0 ? 1 : 0,
        contact.name, contact.phone, contact.email, JSON.stringify(answers),
        score.purchaseReadiness, score.urgency, score.budgetTier,
        score.frameStyle, score.faceShape, score.colorPref, score.usageEnv,
        JSON.stringify(score.lensFlags), ts, ts,
      );

      const outcomeData = OUTCOMES[i % OUTCOMES.length];
      if (outcomeData) {
        await db.prepare(`
          UPDATE sessions SET
            csr_outcome=?, csr_purchase_amount=?, csr_invoice_number=?,
            csr_purchase_type=?, csr_no_sale_reason=?, csr_followup_note=?,
            csr_name=?, csr_skills=?, csr_assessed_at=?
          WHERE id=?`
        ).run(
          outcomeData.outcome, outcomeData.purchaseAmount || 0, outcomeData.invoiceNumber || '',
          outcomeData.purchaseType || '', outcomeData.noSaleReason || '', outcomeData.followupNote || '',
          outcomeData.csrName || '',
          JSON.stringify({ rapport: 4, discovery: 4, presentation: 4, lensUpsell: 3, close: 4 }),
          ts + 900,
          id,
        );
      }
    }

    console.log(`✓ Created tenant: ${TENANT.name} (${TENANT.code}) with 10 demo sessions`);
  }

  console.log('\n──────────────────────────────────────────');
  console.log('  Credentials');
  console.log('──────────────────────────────────────────');
  console.log('  HOST ADMIN (login at #/admin-login)');
  console.log(`    Email:    ${ADMIN_EMAIL}`);
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log('');
  console.log('  DEMO MANAGER (login at #/login)');
  console.log(`    Email:    ${MANAGER_EMAIL}`);
  console.log(`    PIN:      ${MANAGER_PIN}`);
  console.log('');
  console.log('  DEMO CSR (login at #/login)');
  console.log(`    Email:    ${CSR_EMAIL}`);
  console.log(`    PIN:      ${CSR_PIN}`);
  console.log('──────────────────────────────────────────\n');
}

seed().catch(e => { console.error(e); process.exit(1); });
