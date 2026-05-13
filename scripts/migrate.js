#!/usr/bin/env node
'use strict';
require('dotenv').config();
const db = require('../server/db');

db.init()
  .then(() => {
    console.log('Migrations complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
