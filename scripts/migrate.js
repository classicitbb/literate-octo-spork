#!/usr/bin/env node
'use strict';
require('dotenv').config();

const db = require('../server/db');

(async () => {
  try {
    await db._migrate();
    console.log('Migrations complete.');
    await db.close?.();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    await db.close?.().catch(() => {});
    process.exit(1);
  }
})();
