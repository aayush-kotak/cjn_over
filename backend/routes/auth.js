const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');

// ── Users — 100% from .env file (no passwords in code) ───────
const USERS = [
  {
    username: process.env.ADMIN_USER,
    password: process.env.ADMIN_PASS,
    role:     'admin',
    name:     'Admin'
  },
  {
    username: process.env.FAMILY_USER,
    password: process.env.FAMILY_PASS,
    role:     'viewer',
    name:     'Family'
  },
].filter(u => u.username && u.password); // skip if env vars missing

// ── Active sessions ───────────────────────────────────────────
const sessions      = new Map();

// ── Failed login attempts tracker ────────────────────────────
const loginAttempts = new Map();
const MAX_ATTEMPTS  = 5;
const BLOCK_TIME    = 15 * 60 * 1000; // 15 minutes

// ── Generate token ────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ── Login attempt helpers ─────────────────────────────────────
function isBlocked(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  if (Date.now() - attempts.firstAttempt >= BLOCK_TIME) {
    loginAttempts.delete(ip);
    return false;
  }
  return attempts.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const existing = loginAttempts.get(ip);
  if (!existing) {
    loginAttempts.set(ip, { count: 1, firstAttempt: Date.now() });
  } else {
    existing.count++;
    loginAttempts.set(ip, existing);
  }
}

function getRemainingAttempts(ip) {
  const attempts = loginAttempts.get(ip);
  if (!attempts) return MAX_ATTEMPTS;
  return Math.max(0, MAX_ATTEMPTS - attempts.count);
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

// ── POST /api/auth/login ──────────────────────────────────────
router.post('/login', (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  if (isBlocked(ip)) {
    console.log(`🔴 Blocked login attempt from ${ip}`);
    return res.status(429).json({
      error: 'Too many failed attempts. Please try again in 15 minutes.'
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const user = USERS.find(
    u => u.username === username.trim() && u.password === password.trim()
  );

  if (!user) {
    recordFailedAttempt(ip);
    const remaining = getRemainingAttempts(ip);
    console.log(`❌ Failed login: ${username} from ${ip} — ${remaining} attempts remaining`);

    if (remaining === 0) {
      return res.status(429).json({
        error: 'Too many failed attempts. Please try again in 15 minutes.'
      });
    }

    return res.status(401).json({
      error: `Invalid username or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
    });
  }

  clearAttempts(ip);
  const token   = generateToken();
  const expires = Date.now() + 8 * 60 * 60 * 1000; // 8 hours

  sessions.set(token, {
    username: user.username,
    name:     user.name,
    role:     user.role,
    expires
  });

  console.log(`✅ Login: ${user.name} from ${ip} at ${new Date().toLocaleString('en-IN')}`);

  res.json({
    success:  true,
    token,
    name:     user.name,
    username: user.username,
    role:     user.role,
    expires
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────
router.post('/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) sessions.delete(token);
  res.json({ success: true, message: 'Logged out' });
});

// ── GET /api/auth/verify ──────────────────────────────────────
router.get('/verify', (req, res) => {
  const token   = req.headers.authorization?.replace('Bearer ', '');
  const session = sessions.get(token);

  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please login again.' });
  }

  res.json({
    valid:    true,
    name:     session.name,
    username: session.username,
    role:     session.role
  });
});

// ── Auth middleware ───────────────────────────────────────────
function authMiddleware(req, res, next) {
  if (req.path.startsWith('/auth') || req.path === '/health') {
    return next();
  }

  const token   = req.headers.authorization?.replace('Bearer ', '');
  const session = sessions.get(token);

  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }

  req.user = session;
  next();
}

// ── Cleanup every hour ────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (session.expires < now) sessions.delete(token);
  }
  for (const [ip, attempts] of loginAttempts.entries()) {
    if (now - attempts.firstAttempt >= BLOCK_TIME) loginAttempts.delete(ip);
  }
}, 60 * 60 * 1000);

module.exports = { router, authMiddleware };