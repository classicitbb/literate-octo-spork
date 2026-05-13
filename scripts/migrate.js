#!/usr/bin/env node
'use strict';
require('dotenv').config();

// Requiring db.js automatically runs migrations (runMigrations is called on load)
try {
    require('../server/db');
    console.log('Migrations complete.');
    process.exit(0);
} catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
}
