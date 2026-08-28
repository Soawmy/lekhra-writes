/* ==========================================================================
   lib/auth.js — signed-cookie sessions for the admin dashboard
   No session-store needed: the cookie itself carries a signed, expiring
   payload (HMAC-SHA256), verified fresh on every request. Simple and
   sufficient for a single-admin dashboard.
   ========================================================================== */

const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'lekhra-writes-admin-session-secret-change-me';
const SESSION_COOKIE = 'lw_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(data) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
}

function signSession(payload) {
  const data = base64url(JSON.stringify(payload));
  return `${data}.${sign(data)}`;
}

function verifySession(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  if (sig !== sign(data)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  });
  return out;
}

function requireAuth(req) {
  const cookies = parseCookies(req.headers.cookie);
  return verifySession(cookies[SESSION_COOKIE]);
}

function setSessionCookie(res, username) {
  const token = signSession({ u: username, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 });
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

module.exports = { requireAuth, setSessionCookie, clearSessionCookie, verifySession, signSession };
