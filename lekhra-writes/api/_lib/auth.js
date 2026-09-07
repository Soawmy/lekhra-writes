/* ==========================================================================
   Admin session auth. Lives under /api/_lib — see kv.js for why the
   underscore prefix matters.

   Sessions are stateless signed cookies (HMAC-SHA256), not stored in Redis:
   the cookie itself carries the username + an expiry, signed so it can't be
   forged without SESSION_SECRET. That means checking a session costs zero
   extra network calls, and the site keeps working even if Upstash has a
   hiccup — only logging in or changing settings needs the database.
   ========================================================================== */

const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'lekhra-writes-admin-dashboard-secret-please-rotate';
const COOKIE_NAME = 'lw_admin';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(value) {
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
  return `${value}.${sig}`;
}

function verify(signed) {
  if (!signed) return null;
  const idx = signed.lastIndexOf('.');
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const sig = signed.slice(idx + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return value;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((pair) => {
    var idx = pair.indexOf('=');
    if (idx === -1) return;
    var k = pair.slice(0, idx).trim();
    var v = pair.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function setSessionCookie(res, username) {
  const payload = `${username}|${Date.now() + MAX_AGE_SECONDS * 1000}`;
  const token = encodeURIComponent(sign(payload));
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`);
}

function requireAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;
  const payload = verify(decodeURIComponent(raw));
  if (!payload) return null;
  const sep = payload.lastIndexOf('|');
  if (sep === -1) return null;
  const username = payload.slice(0, sep);
  const expiresAt = parseInt(payload.slice(sep + 1), 10);
  if (!username || !expiresAt || Date.now() > expiresAt) return null;
  return { username };
}

module.exports = { setSessionCookie, clearSessionCookie, requireAuth };
