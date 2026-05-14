#!/usr/bin/env node
'use strict';
require('dotenv').config();
const db = require('../server/db');
const { hashPin } = require('../server/services/auth');
const { scoreAnswers } = require('../server/services/scoring');

// PriceSmart Optical — Port of Spain
const TENANT = {
  code: 'pricesmart',
  name: 'PriceSmart Optical — Port of Spain',
  address: '12 Frederick St, Port of Spain, Trinidad',
  welcomeMsg: 'Welcome to PriceSmart Optical! Please complete this short form while you wait — it helps us serve you better.',
  primaryColor: '#003087',
  accentColor: '#CC0000',
  csrStaff: [
    { username: 'pricesmart-james', displayName: 'James Rampersad', pin: '1234' },
    { username: 'pricesmart-sandra', displayName: 'Sandra Ali', pin: '5678' },
    { username: 'pricesmart-keisha', displayName: 'Keisha Joseph', pin: '4321' },
  ],
};

// Answer sets mapped to purchase readiness tiers
// PR = q4 score + q6 score + q8 score
// q4: a=25, b=18, c=8, d=15
// q6: a=5, b=15, c=25, d=35
// q8: a=8, b=18, c=28, d=40

const ANSWER_SETS = [
  // High PR (80-100) — strong purchase signals
  { q1:'a', q2:'a', q3:'c', q4:'a', q5:'b', q6:'d', q7:'a', q8:'d', q9:'b', q10:'a', q11:'c', q12:'a' }, // 25+35+40=100
  { q1:'a', q2:'b', q3:'d', q4:'a', q5:'a', q6:'d', q7:'b', q8:'c', q9:'c', q10:'b', q11:'b', q12:'d' }, // 25+35+28=88
  { q1:'b', q2:'a', q3:'c', q4:'a', q5:'c', q6:'c', q7:'a', q8:'d', q9:'a', q10:'c', q11:'a', q12:'a' }, // 25+25+40=90
  { q1:'a', q2:'c', q3:'d', q4:'b', q5:'b', q6:'d', q7:'c', q8:'c', q9:'d', q10:'d', q11:'c', q12:'c' }, // 18+35+28=81
  { q1:'a', q2:'b', q3:'c', q4:'a', q5:'a', q6:'d', q7:'b', q8:'b', q9:'b', q10:'a', q11:'b', q12:'b' }, // 25+35+18=78
  { q1:'c', q2:'d', q3:'d', q4:'a', q5:'d', q6:'c', q7:'d', q8:'d', q9:'c', q10:'b', q11:'d', q12:'b' }, // 25+25+40=90 backup pair + transitions
  // Medium PR (45-69)
  { q1:'b', q2:'a', q3:'b', q4:'a', q5:'b', q6:'b', q7:'a', q8:'c', q9:'b', q10:'a', q11:'c', q12:'a' }, // 25+15+28=68
  { q1:'a', q2:'b', q3:'c', q4:'b', q5:'a', q6:'c', q7:'b', q8:'b', q9:'c', q10:'b', q11:'b', q12:'b' }, // 18+25+18=61
  { q1:'b', q2:'c', q3:'a', q4:'d', q5:'c', q6:'c', q7:'c', q8:'b', q9:'a', q10:'c', q11:'a', q12:'c' }, // 15+25+18=58
  { q1:'a', q2:'a', q3:'b', q4:'a', q5:'a', q6:'b', q7:'a', q8:'b', q9:'b', q10:'a', q11:'b', q12:'a' }, // 25+15+18=58
  { q1:'d', q2:'b', q3:'c', q4:'b', q5:'b', q6:'b', q7:'b', q8:'c', q9:'d', q10:'b', q11:'c', q12:'d' }, // 18+15+28=61
  // Low PR (21-44)
  { q1:'b', q2:'c', q3:'a', q4:'c', q5:'c', q6:'a', q7:'c', q8:'a', q9:'c', q10:'c', q11:'a', q12:'c' }, // 8+5+8=21
  { q1:'b', q2:'a', q3:'b', q4:'d', q5:'a', q6:'b', q7:'a', q8:'a', q9:'b', q10:'a', q11:'b', q12:'a' }, // 15+15+8=38
  { q1:'a', q2:'c', q3:'a', q4:'c', q5:'b', q6:'b', q7:'c', q8:'a', q9:'a', q10:'d', q11:'c', q12:'b' }, // 8+15+8=31
];

// Full day patient roster with realistic TT names
const PATIENTS = [
  // --- Morning rush 9:00–10:30 ---
  { contact: { name: 'Maria Chen', phone: '868-555-0101', email: 'mchen@gmail.com' }, isNew: 0, answerIdx: 0, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 420, invoiceNumber: 'INV-2601', purchaseType: 'Frames + blue light lenses', skills: { rapport:5, discovery:5, presentation:4, lensUpsell:5, close:5 } } },
  { contact: { name: 'David Williams', phone: '868-555-0202', email: '' }, isNew: 0, answerIdx: 6, csrIdx: 1,
    outcome: { outcome: 'no-sale', noSaleReason: 'Price / budget concern', skills: { rapport:4, discovery:3, presentation:3, lensUpsell:2, close:3 } } },
  { contact: { name: 'Keisha Baptiste', phone: '868-555-0303', email: 'keisha.b@yahoo.com' }, isNew: 1, answerIdx: 1, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 680, invoiceNumber: 'INV-2602', purchaseType: 'Frames + lenses + upgrades (blue light, AR, etc.)', skills: { rapport:5, discovery:5, presentation:5, lensUpsell:5, close:5 } } },
  { contact: { name: 'Andre Joseph', phone: '', email: '' }, isNew: 0, answerIdx: 11, csrIdx: 2,
    outcome: { outcome: 'no-sale', noSaleReason: 'Just browsing', skills: { rapport:3, discovery:2, presentation:3, lensUpsell:1, close:2 } } },

  // --- Mid-morning 10:30–12:00 ---
  { contact: { name: 'Sandra Mohammed', phone: '868-555-0505', email: 'smohammed@hotmail.com' }, isNew: 0, answerIdx: 7, csrIdx: 1,
    outcome: { outcome: 'followup', followupNote: 'Needs new prescription from Dr. Ramchand — call when ready, interested in progressives.', skills: { rapport:4, discovery:5, presentation:4, lensUpsell:4, close:3 } } },
  { contact: { name: 'James Thompson', phone: '868-555-0606', email: '' }, isNew: 0, answerIdx: 2, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 285, invoiceNumber: 'INV-2603', purchaseType: 'Frames + standard lenses', skills: { rapport:4, discovery:4, presentation:4, lensUpsell:3, close:4 } } },
  { contact: { name: 'Tricia Ali', phone: '868-555-0707', email: 'tricia.ali@gmail.com' }, isNew: 1, answerIdx: 3, csrIdx: 2,
    outcome: { outcome: 'purchased', purchaseAmount: 520, invoiceNumber: 'INV-2604', purchaseType: 'Frames + lenses + upgrades (blue light, AR, etc.)', skills: { rapport:5, discovery:4, presentation:5, lensUpsell:4, close:5 } } },
  { contact: { name: 'Derek Henry', phone: '868-555-0808', email: '' }, isNew: 0, answerIdx: 9, csrIdx: 1,
    outcome: { outcome: 'followup', followupNote: 'Wants to bring wife to choose together — will come back Saturday.', skills: { rapport:4, discovery:4, presentation:3, lensUpsell:3, close:3 } } },

  // --- Lunch hour 12:00–13:30 ---
  { contact: { name: 'Melissa Charles', phone: '868-555-0909', email: '' }, isNew: 0, answerIdx: 12, csrIdx: 2,
    outcome: { outcome: 'no-sale', noSaleReason: "Didn't find a style they liked", skills: { rapport:3, discovery:3, presentation:2, lensUpsell:2, close:2 } } },
  { contact: { name: 'Carlos Garcia', phone: '868-555-1010', email: 'cgarcia@work.tt' }, isNew: 0, answerIdx: 5, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 780, invoiceNumber: 'INV-2605', purchaseType: 'Frames + lenses + upgrades (blue light, AR, etc.)', skills: { rapport:5, discovery:5, presentation:5, lensUpsell:5, close:5 } } },
  { contact: { name: 'Anika Singh', phone: '868-555-1111', email: 'anika.singh@gmail.com' }, isNew: 1, answerIdx: 8, csrIdx: 1,
    outcome: null }, // still pending assessment
  { contact: { name: 'Marcus Brown', phone: '868-555-1212', email: '' }, isNew: 0, answerIdx: 4, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 365, invoiceNumber: 'INV-2606', purchaseType: 'Frames + blue light lenses', skills: { rapport:4, discovery:4, presentation:5, lensUpsell:4, close:4 } } },

  // --- Afternoon 13:30–15:00 ---
  { contact: { name: 'Diana Rampersad', phone: '868-555-1313', email: '' }, isNew: 0, answerIdx: 13, csrIdx: 2,
    outcome: null }, // still pending
  { contact: { name: 'Kevin Clarke', phone: '868-555-1414', email: 'kclarke@gmail.com' }, isNew: 0, answerIdx: 10, csrIdx: 1,
    outcome: { outcome: 'no-sale', noSaleReason: 'Wants to think about it', notes: 'Has existing frames from another store — mentioned he may come back next month after payday.', skills: { rapport:4, discovery:4, presentation:4, lensUpsell:3, close:3 } } },
  { contact: { name: 'Nicole Peters', phone: '868-555-1515', email: 'npeters@yahoo.com' }, isNew: 1, answerIdx: 0, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 890, invoiceNumber: 'INV-2607', purchaseType: 'Prescription sunglasses', notes: 'Patient also interested in transitions — upsold AR coating. Very satisfied.', skills: { rapport:5, discovery:5, presentation:5, lensUpsell:5, close:5 } } },
  { contact: { name: 'Robert Ramkhelawan', phone: '868-555-1616', email: '' }, isNew: 0, answerIdx: 7, csrIdx: 2,
    outcome: { outcome: 'followup', followupNote: 'Checking with insurance provider on coverage. Will call by Friday.', skills: { rapport:4, discovery:4, presentation:4, lensUpsell:4, close:3 } } },

  // --- Late afternoon 15:00–17:00 ---
  { contact: { name: 'Jasmine Thomas', phone: '868-555-1717', email: 'jasmine.t@gmail.com' }, isNew: 1, answerIdx: 6, csrIdx: 1,
    outcome: null }, // pending
  { contact: { name: 'Miguel Hernandez', phone: '868-555-1818', email: '' }, isNew: 0, answerIdx: 2, csrIdx: 0,
    outcome: { outcome: 'purchased', purchaseAmount: 450, invoiceNumber: 'INV-2608', purchaseType: 'Frames + blue light lenses', skills: { rapport:4, discovery:5, presentation:4, lensUpsell:5, close:4 } } },
  { contact: { name: 'Patricia Nkosi', phone: '868-555-1919', email: '' }, isNew: 0, answerIdx: 13, csrIdx: 2,
    outcome: { outcome: 'no-sale', noSaleReason: 'Needs prescription first', notes: 'First time getting glasses — referred to Dr. Maraj for eye exam. High potential return visit.', skills: { rapport:5, discovery:4, presentation:3, lensUpsell:3, close:2 } } },
  { contact: { name: 'Anthony Phillip', phone: '868-555-2020', email: 'aphillip@work.tt' }, isNew: 0, answerIdx: 3, csrIdx: 1,
    outcome: { outcome: 'purchased', purchaseAmount: 610, invoiceNumber: 'INV-2609', purchaseType: 'Frames + lenses + upgrades (blue light, AR, etc.)', skills: { rapport:5, discovery:5, presentation:5, lensUpsell:4, close:5 } } },
  { contact: { name: 'Grace Marcelle', phone: '', email: '' }, isNew: 0, answerIdx: 8, csrIdx: 2,
    outcome: null }, // end of day, no assessment yet
];

function randomId() {
  return 'ps-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

async function seed() {
  console.log('Seeding PriceSmart tenant...');

  // Check / create tenant
  let existing = await db.prepare('SELECT id FROM tenants WHERE account_code = ?').get(TENANT.code);
  let tenantId;

  if (existing) {
    tenantId = existing.id;
    console.log(`Tenant '${TENANT.code}' already exists (id=${tenantId}). Skipping tenant + user creation.`);
  } else {
    const result = await db.prepare(
      `INSERT INTO tenants (account_code, name, address, welcome_msg, primary_color, accent_color)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(TENANT.code, TENANT.name, TENANT.address, TENANT.welcomeMsg, TENANT.primaryColor, TENANT.accentColor);
    tenantId = result.lastInsertRowid;

    // CSR staff only — no store admin created here; manage host access via BOOTSTRAP_ADMIN_EMAIL
    for (const csr of TENANT.csrStaff) {
      const csrHash = await hashPin(csr.pin);
      await db.prepare(
        `INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (?, ?, 'csr', ?, ?)`
      ).run(tenantId, csr.username, csrHash, csr.displayName);
    }

    console.log(`Created tenant: ${TENANT.name} (${TENANT.code})`);
  }

  // Seed today's sessions — spread over a 9am–5pm business day
  const todayStart = new Date();
  todayStart.setHours(9, 0, 0, 0);
  const dayStartTs = Math.floor(todayStart.getTime() / 1000);
  const intervalSecs = Math.floor((8 * 3600) / PATIENTS.length); // spread evenly over 8 hrs

  let created = 0;
  for (let i = 0; i < PATIENTS.length; i++) {
    const p = PATIENTS[i];
    const answers = ANSWER_SETS[p.answerIdx];
    const score = scoreAnswers(answers);
    const ts = dayStartTs + i * intervalSecs + Math.floor(Math.random() * 120); // slight jitter
    const id = randomId();
    const csrUser = TENANT.csrStaff[p.csrIdx];

    await db.prepare(
      `INSERT INTO sessions
         (id, tenant_id, timestamp, is_new_patient,
          contact_name, contact_phone, contact_email, answers,
          purchase_readiness, urgency, budget_tier, frame_style,
          face_shape, color_pref, usage_env, lens_flags,
          created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(
      id, tenantId, ts, p.isNew ? 1 : 0,
      p.contact.name, p.contact.phone, p.contact.email,
      JSON.stringify(answers),
      score.purchaseReadiness, score.urgency, score.budgetTier,
      score.frameStyle, score.faceShape, score.colorPref, score.usageEnv,
      JSON.stringify(score.lensFlags), ts, ts
    );

    if (p.outcome) {
      const o = p.outcome;
      await db.prepare(
        `UPDATE sessions SET
           csr_outcome=?, csr_purchase_amount=?, csr_invoice_number=?,
           csr_purchase_type=?, csr_no_sale_reason=?, csr_followup_note=?,
           csr_name=?, csr_notes=?, csr_skills=?, csr_assessed_at=?
         WHERE id=?`
      ).run(
        o.outcome,
        o.purchaseAmount || 0,
        o.invoiceNumber || '',
        o.purchaseType || '',
        o.noSaleReason || '',
        o.followupNote || '',
        csrUser.displayName,
        o.notes || '',
        JSON.stringify(o.skills || { rapport:4, discovery:4, presentation:4, lensUpsell:3, close:4 }),
        ts + 600,
        id
      );
    }

    created++;
  }

  console.log(`Created ${created} sessions for today's business day.`);
  console.log('\nPriceSmart CSR login credentials:');
  console.log(`  Tenant code : ${TENANT.code}`);
  TENANT.csrStaff.forEach(c => {
    console.log(`  ${c.displayName.padEnd(20)}: PIN ${c.pin}`);
  });
  console.log('  (Host admin access via BOOTSTRAP_ADMIN_EMAIL — no store-level admin created)');
}

seed().catch(e => { console.error(e); process.exit(1); });
