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
    if (!ready && !startupError) await appPromise;
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = startupError ? 503 : 200;
    res.end(JSON.stringify({
      ok: !startupError,
      env: process.env.NODE_ENV || 'development',
      postgresUrlConfigured: Boolean(
        process.env.DATABASE_URL ||
        process.env.POSTGRES_URL_NON_POOLING ||
        process.env.POSTGRES_PRISMA_URL ||
        process.env.POSTGRES_URL ||
        process.env.SUPABASE_DB_URL
      ),
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
