#!/usr/bin/env node
'use strict';
// Runs pending migrations. The db.js module already runs migrations on require,
// so just requiring it is enough. This script exists for explicit CLI invocation.
require('dotenv').config();
require('../server/db');
console.log('Migrations complete.');
