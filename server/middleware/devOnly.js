'use strict';

function devOnly(req, res, next) {
  if (!req.user || req.user.role !== 'dev') {
    return res.status(403).json({ error: 'Dev access required' });
  }
  next();
}

module.exports = devOnly;
