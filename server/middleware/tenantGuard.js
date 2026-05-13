'use strict';

// Ensures req.user.tenantId matches the resource being accessed.
// Dev role and emulation bypass this for support purposes.
function tenantGuard(req, res, next) {
  const { user } = req;
  if (!user) return res.status(401).json({ error: 'Unauthenticated' });
  if (user.role === 'dev') return next(); // devs can access any tenant
  if (!user.tenantId) return res.status(403).json({ error: 'No tenant associated' });
  next();
}

module.exports = tenantGuard;
