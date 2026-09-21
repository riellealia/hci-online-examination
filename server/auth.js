'use strict';
const crypto = require('crypto');

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function createAuth(store, options = {}) {
  const sessions = new Map();
  const attempts = new Map();
  const now = options.now || (() => Date.now());
  const normalizeRole = value => String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
    .replace('administrator', 'admin').replace('collegedean', 'dean')
    .replace('facultycoordinator', 'coordinator').replace('professor', 'faculty');
  const equal = (left, right) => {
    const a = Buffer.from(String(left || '')), b = Buffer.from(String(right || ''));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };
  function active(user) {
    const status = String(user?.status || 'active').toLowerCase();
    return !!user && user.disabled !== true && !['deactivated', 'archived', 'graduated', 'transferred'].includes(status);
  }
  function attemptKey(username, address) { return `${address || 'local'}:${String(username || '').toLowerCase()}`; }
  function rateState(key) {
    const current = attempts.get(key);
    if (!current || now() - current.startedAt >= ATTEMPT_WINDOW_MS) return { count: 0, startedAt: now() };
    return current;
  }
  function login(username, password, address = '') {
    const key = attemptKey(username, address), state = rateState(key);
    if (state.count >= MAX_ATTEMPTS) {
      const error = new Error('Too many sign-in attempts. Try again in a few minutes.'); error.status = 429; error.code = 'RATE_LIMITED'; throw error;
    }
    const user = store.read('users', []).find(item => item.username === username);
    if (!user || !equal(user.password, password) || !active(user)) {
      attempts.set(key, { count: state.count + 1, startedAt: state.startedAt });
      const error = new Error('Those details do not match an active account.'); error.status = 401; error.code = 'INVALID_CREDENTIALS'; throw error;
    }
    attempts.delete(key);
    const token = crypto.randomBytes(32).toString('base64url'), issuedAt = now();
    const session = { username: user.username, role: normalizeRole(user.role), issuedAt, expiresAt: issuedAt + SESSION_TTL_MS };
    sessions.set(token, session);
    return { token, session: { ...session } };
  }
  function tokenFrom(req) {
    const header = String(req.headers.authorization || '');
    return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  }
  function resolve(token) {
    const session = sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= now()) { sessions.delete(token); return null; }
    const user = store.read('users', []).find(item => item.username === session.username && normalizeRole(item.role) === session.role);
    if (!active(user)) { sessions.delete(token); return null; }
    return { ...session };
  }
  function requireSession(req, roles = []) {
    const session = resolve(tokenFrom(req));
    if (!session) { const error = new Error('Authentication is required.'); error.status = 401; error.code = 'AUTH_REQUIRED'; throw error; }
    if (roles.length && !roles.includes(session.role)) { const error = new Error('This account is not authorized for that action.'); error.status = 403; error.code = 'FORBIDDEN'; throw error; }
    return session;
  }
  function logout(token) { return sessions.delete(token); }
  function prune() { for (const [token, session] of sessions) if (session.expiresAt <= now()) sessions.delete(token); }
  return { login, logout, resolve, requireSession, tokenFrom, prune, normalizeRole, active };
}

module.exports = { createAuth, SESSION_TTL_MS };
