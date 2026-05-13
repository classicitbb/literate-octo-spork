#!/usr/bin/env node
'use strict';
require('dotenv').config();
const db = require('../server/db');
const { hashPin } = require('../server/services/auth');

const args = process.argv.slice(2);
function arg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

async function main() {
  const name = arg('--name');
  const code = arg('--code');
  const adminPin = arg('--admin-pin') || '9999';
  const csrPin = arg('--csr-pin') || '1234';
  const address = arg('--address') || '';

  if (!name || !code) {
    console.error('Usage: node scripts/create-tenant.js --name "Branch Name" --code "branch-code" [--admin-pin 9999] [--csr-pin 1234] [--address "123 Main St"]');
    process.exit(1);
  }

  const existing = await db.prepare('SELECT id FROM tenants WHERE account_code = ?').get(code);
  if (existing) {
    console.error(`Account code "${code}" already exists.`);
    process.exit(1);
  }

  const result = await db.prepare('INSERT INTO tenants (account_code, name, address) VALUES (?, ?, ?)').run(code, name, address);
  const tenantId = result.lastInsertRowid;

  const adminHash = await hashPin(adminPin);
  const csrHash = await hashPin(csrPin);

  await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (?, ?, 'admin', ?, 'Admin')`).run(tenantId, code + '-admin', adminHash);
  await db.prepare(`INSERT INTO users (tenant_id, username, role, pin_hash, display_name) VALUES (?, ?, 'csr', ?, 'CSR')`).run(tenantId, code + '-csr', csrHash);

  console.log(`Tenant created:`);
  console.log(`   Name:         ${name}`);
  console.log(`   Account code: ${code}`);
  console.log(`   Admin PIN:    ${adminPin}`);
  console.log(`   CSR PIN:      ${csrPin}`);
  console.log(`   Tenant ID:    ${tenantId}`);
}

main().catch(e => { console.error(e); process.exit(1); });
