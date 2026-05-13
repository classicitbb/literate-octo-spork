#!/usr/bin/env node
'use strict';
require('dotenv').config();
const db = require('../server/db');

async function reset() {
  await db._migrate();

  console.log('Resetting seeded data...');

  await db.exec('DELETE FROM emulation_log');
  await db.exec('DELETE FROM sessions');
  await db.exec('DELETE FROM users WHERE role != \'dev\'');
  await db.exec('DELETE FROM tenants');

  console.log('✓ All tenants, tenant users, and sessions removed.');
  console.log('  Host admin account(s) preserved.\n');
  console.log('Run `npm run seed` to re-seed demo data.');
}

reset().catch(e => { console.error(e); process.exit(1); });
