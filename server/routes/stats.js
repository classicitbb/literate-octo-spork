'use strict';
const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const tenantGuard = require('../middleware/tenantGuard');
const { getOverview, getCsrPerformance, getFocusAreas } = require('../services/stats');
const router = express.Router();

router.get('/overview', requireAuth, requireRole('admin', 'dev'), tenantGuard, (req, res) => {
  const tenantId = req.user.role === 'dev' ? req.query.tenantId : req.user.tenantId;
  res.json(getOverview(tenantId, req.query.date));
});

router.get('/csr-performance', requireAuth, requireRole('admin', 'dev'), tenantGuard, (req, res) => {
  const tenantId = req.user.role === 'dev' ? req.query.tenantId : req.user.tenantId;
  res.json(getCsrPerformance(tenantId, req.query.date));
});

router.get('/focus-areas', requireAuth, requireRole('admin', 'dev'), tenantGuard, (req, res) => {
  const tenantId = req.user.role === 'dev' ? req.query.tenantId : req.user.tenantId;
  res.json(getFocusAreas(tenantId, req.query.date));
});

module.exports = router;
