/* ==========================================================================
   /api/submit — Vercel Serverless Function
   Emails the "Start a Project" brief via Resend every time the form on
   contact.html is submitted, and logs it into the admin dashboard's
   submission list. Zero build step needed — Vercel picks up any file
   under /api automatically as a serverless function.

   READ THIS if emails don't arrive once deployed:
   Resend (like every transactional email service) only lets you send
   "from" an address on a domain YOU'VE verified with them via DNS. Nobody
   can verify gmail.com — it's Google's domain, not yours — so a literal
   `from: itzsoawmy@gmail.com` gets rejected by Resend's API. This function
   sends from Resend's built-in sandbox address instead (works immediately,
   no setup) with itzsoawmy@gmail.com wired in as the reply-to, so it still
   reads as coming from the studio. Once you buy a domain and verify it in
   the Resend dashboard, set the FROM_EMAIL environment variable in Vercel
   to something like "Lekhra Writes <hello@yourdomain.com>" for a fully
   custom sender — no code changes needed, just the env var.

   The destination address is no longer fixed in code — it's read from the
   admin dashboard's stored settings (changeable at /admin.html), falling
   back to the TO_EMAIL below only if that hasn't been set up yet.
   ========================================================================== */

const { redis } = require('../lib/kv');

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_56QYejAu_2CHxYnANyvs1une5avaH1TdX';
const FROM_EMAIL = process.env.FROM_EMAIL || 'Lekhra Writes <onboarding@resend.dev>';
const STUDIO_EMAIL = process.env.STUDIO_EMAIL || 'itzsoawmy@gmail.com';
const DEFAULT_TO_EMAIL = process.env.TO_EMAIL || 'soawmy@gmail.com';

// Every possible field across every service, in the order the email
// should show them. Only fields that were actually filled in get printed —
// a lead who only picked "Website" never shows blank Script/Video rows.
const FIELD_LABELS = {
  services: 'Services requested',
  website_type: 'Type of website',
  website_purpose: 'Purpose',
  website_pages: 'Number of pages',
  website_branding: 'Existing branding',
  content_type: 'Content type',
  content_qty: 'Quantity',
  content_format: 'Format',
  content_audience: 'Target audience',
  script_format: 'Script format',
  script_length: 'Approximate length',
  script_genre: 'Genre',
  script_concept: 'Existing concept',
  video_type: 'Video type',
  video_scope: 'Video scope',
  design_type: 'Design type',
  design_scope: 'Design scope',
  social_type: 'Social content type',
  social_scope: 'Social scope',
  marketing_type: 'Marketing type',
  marketing_scope: 'Marketing scope',
  other_desc: 'What they want to create',
  references: 'References',
  name: 'Name',
  contact: 'Email / phone',
  budget: 'Budget range',
  final_timeline: 'Timeline',
  details: 'Additional details'
};
const FIELD_ORDER = Object.keys(FIELD_LABELS);

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function looksLikeEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildHtml(data) {
  const rows = FIELD_ORDER
    .filter((key) => data[key])
    .map(
      (key) => `
      <tr>
        <td style="padding:12px 18px;border-bottom:1px solid #eee;font-weight:600;color:#8a6a24;width:190px;vertical-align:top;font-size:13px;font-family:Arial,Helvetica,sans-serif;">${esc(FIELD_LABELS[key])}</td>
        <td style="padding:12px 18px;border-bottom:1px solid #eee;color:#141414;font-size:14px;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">${esc(data[key]).replace(/\n/g, '<br>')}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#F1EEE7;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
      <div style="background:#080808;padding:30px 32px;border-radius:8px 8px 0 0;">
        <p style="color:#C8A45D;letter-spacing:2px;font-size:11px;text-transform:uppercase;margin:0 0 8px;font-weight:bold;">Lekhra Writes</p>
        <h1 style="color:#F1EEE7;font-size:22px;margin:0;font-family:Georgia,serif;font-weight:normal;">New project brief</h1>
        <p style="color:#8A8578;font-size:13px;margin:10px 0 0;">${esc(data.name || 'Someone')} wants: ${esc(data.services || 'an unspecified service')}</p>
      </div>
      <div style="background:#ffffff;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>
      <p style="color:#8A8578;font-size:12px;margin-top:20px;font-family:Arial,Helvetica,sans-serif;">
        Submitted via the "Start a Project" form on the Lekhra Writes site.
        ${looksLikeEmail(data.contact) ? 'Just hit reply to respond directly to them.' : ''}
      </p>
    </div>
  </body>
</html>`;
}

function buildText(data) {
  return FIELD_ORDER
    .filter((key) => data[key])
    .map((key) => `${FIELD_LABELS[key]}: ${data[key]}`)
    .join('\n');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    if (!data.name || !data.contact) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // The destination email is changeable from /admin.html — read it fresh
    // on every submission rather than baking it into a constant.
    let toEmail = DEFAULT_TO_EMAIL;
    try {
      const raw = await redis(['GET', 'settings']);
      const settings = raw ? JSON.parse(raw) : null;
      if (settings && settings.toEmail) toEmail = settings.toEmail;
    } catch (err) {
      // Upstash not configured yet, or briefly unreachable — the email
      // still sends, just to the fallback address above.
      console.error('settings lookup failed, using default TO_EMAIL:', err.message);
    }

    // Reply-to the actual lead's email when they gave one, so hitting
    // "Reply" in the inbox goes straight to the client — not back to the
    // studio's own sending address.
    const replyTo = looksLikeEmail(data.contact) ? data.contact : STUDIO_EMAIL;

    const emailPayload = {
      from: FROM_EMAIL,
      to: [toEmail],
      reply_to: replyTo,
      subject: `New project brief — ${data.services || 'Unspecified'} — ${data.name}`,
      html: buildHtml(data),
      text: buildText(data)
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Resend error:', response.status, errText);
      // Even if the email fails, still log the submission below so the
      // lead isn't lost — it'll be visible in the dashboard either way.
    }

    // Log every submission into the dashboard's list, newest first,
    // capped at 200 so it can't grow without bound.
    try {
      const record = Object.assign({}, data, { submittedAt: new Date().toISOString() });
      await redis(['LPUSH', 'submissions', JSON.stringify(record)]);
      await redis(['LTRIM', 'submissions', '0', '199']);
    } catch (err) {
      console.error('failed to log submission to dashboard:', err.message);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit handler error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};
