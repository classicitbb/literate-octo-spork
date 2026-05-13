'use strict';

let app;
let ready = false;
let startupError = null;

const appPromise = (async () => {
  try {
    const db = require('../server/db');
    const createApp = require('../server/app');
    await db._migrate();
    app = createApp();
    ready = true;
  } catch (err) {
    startupError = err;
    console.error('API startup failed:', err);
  }
})();

module.exports = async (req, res) => {
  if (req.url === '/api/health' || req.url === '/health') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = startupError ? 503 : 200;
    res.end(JSON.stringify({
      ok: !startupError,
      env: process.env.NODE_ENV || 'development',
      tursoUrlConfigured: Boolean(process.env.TURSO_URL || process.env.TURSO_DATABASE_URL),
      tursoAuthTokenConfigured: Boolean(process.env.TURSO_AUTH_TOKEN),
      dbReady: ready,
      error: startupError ? 'Database initialization failed' : null,
    }));
    return;
  }

  if (!ready) await appPromise;
  if (startupError) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Database initialization failed' }));
    return;
  }
  app(req, res);
};
