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
  const findUsername = arg('--find-username');
  const findRole = arg('--find-role');
  const newUsername = arg('--username');
  const email = arg('--email');
  const pin = arg('--pin');

  if (!findUsername && !findRole) {
    console.error('Usage: node scripts/set-user-email.js [--find-username <current>] [--find-role <role>] [--username <new>] [--email <email>] [--pin <pin>]');
    process.exit(1);
  }

  let user;
  if (findUsername) {
    user = await db.prepare('SELECT id, username, role, email FROM users WHERE username = ?').get(findUsername);
  } else {
    user = await db.prepare('SELECT id, username, role, email FROM users WHERE role = ?').get(findRole);
  }

  if (!user) {
    console.error(`User not found`);
    process.exit(1);
  }

  const updates = [];
  const params = [];

  if (newUsername) { updates.push('username = ?'); params.push(newUsername); }
  if (email !== null) { updates.push('email = ?'); params.push(email); }
  if (pin) {
    const hash = await hashPin(pin);
    updates.push('pin_hash = ?');
    params.push(hash);
  }

  if (!updates.length) { console.log('Nothing to update.'); return; }

  params.push(user.id);
  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  console.log(`Updated user id=${user.id} (was: username=${user.username}, role=${user.role})`);
  if (newUsername) console.log(`  username → ${newUsername}`);
  if (email !== null) console.log(`  email    → ${email}`);
  if (pin) console.log(`  pin      → [hashed]`);
}

main().catch(e => { console.error(e); process.exit(1); });
