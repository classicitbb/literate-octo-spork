'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const sessionsRoutes = require('./routes/sessions');
const configRoutes = require('./routes/config');
const usersRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const devRoutes = require('./routes/dev');

function createApp() {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // API routes
  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/config', configRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/dev', devRoutes);

  // Serve built frontend in production
  const publicDir = path.join(__dirname, 'public');
  app.use(express.static(publicDir));
  app.get('*', (req, res) => {
    const indexPath = path.join(publicDir, 'index.html');
    const fs = require('fs');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Frontend not built. Run: npm run build');
    }
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
