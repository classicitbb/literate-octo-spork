'use strict';
const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

router.post('/contact', (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  db.prepare('INSERT INTO contact_submissions (name, email, message) VALUES (?, ?, ?)').run(name, email, message);
  res.json({ ok: true });
});

module.exports = router;
