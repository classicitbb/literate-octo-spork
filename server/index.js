'use strict';
require('dotenv').config();
const db = require('./db');
const createApp = require('./app');

const PORT = process.env.PORT || 3000;

db._migrate()
  .then(() => {
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`Patient Smart App server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
  })
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
