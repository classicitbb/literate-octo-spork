'use strict';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_REFRESH_SECRET = () => process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me';

function signToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET(), { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET());
}

async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

async function comparePin(pin, hash) {
  return bcrypt.compare(String(pin), hash);
}

module.exports = { signToken, signRefreshToken, verifyToken, verifyRefreshToken, hashPin, comparePin };
