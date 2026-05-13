#!/usr/bin/env node
'use strict';
require('dotenv').config();
const db = require('../server/db');

const args = process.argv.slice(2);
function arg(flag) {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
}

async function main() {
  const username = arg('--username');
  const email = arg('--email');

  if (!username || !email) {
    console.error('Usage: node scripts/set-user-email.js --username <username> --email <email>');
    process.exit(1);
  }

  const user = await db.prepare('SELECT id, username, role, email FROM users WHERE username = ?').get(username);
  if (!user) {
    console.error(`User not found: ${username}`);
    process.exit(1);
  }

  await db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, user.id);
  console.log(`Updated user "${username}" (id=${user.id}, role=${user.role}) → email=${email}`);
}

main().catch(e => { console.error(e); process.exit(1); });
