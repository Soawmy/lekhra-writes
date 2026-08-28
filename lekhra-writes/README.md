# Lekhra Writes — Website

A static site with two serverless functions attached: one emails the contact
form, the other powers a small admin dashboard. Built to deploy on **Vercel**
as-is, with one small piece of setup that's genuinely unavoidable (explained
below, not a Vercel thing).

## What's inside
```
index.html, studio.html, process.html, work.html, contact.html,
services/*.html              The 13-page marketing site (unchanged from before)
admin.html                    Admin dashboard — login, settings, submissions log
css/style.css                 Design system
js/main.js                    Site-wide interactions
js/contact.js                 Multi-select brief form → posts to /api/submit
js/admin.js                   Dashboard login/settings/submissions logic
api/submit.js                 Emails a brief via Resend + logs it for the dashboard
api/login.js, logout.js       Dashboard authentication
api/settings.js               Change destination email + dashboard credentials
api/submissions.js            Returns the stored submission log
lib/kv.js                     Upstash Redis REST client (the persistent store)
lib/auth.js                   Signed-cookie session helpers
vercel.json                   Caching headers for static assets
```

## The one unavoidable setup step: Upstash
You said you don't want to configure anything beyond hosting — genuinely fair,
but here's the honest constraint: Vercel's functions are **stateless**.
Nothing they write to disk survives the next request. So "let the owner change
the destination email" and "log every submission" both need somewhere to
actually store that data — there's no way to do that without *some* external
store. This isn't a Vercel setting, though; it's a separate, free service:

1. Go to **upstash.com** → sign up free (no credit card).
2. Create a Redis database (takes about 30 seconds, default settings are fine).
3. On that database's page, copy the **REST URL** and **REST Token**.
4. Open `lib/kv.js` in this project and paste them in at the top:
   ```js
   const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'PASTE_YOUR_UPSTASH_REST_URL_HERE';
   const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'PASTE_YOUR_UPSTASH_REST_TOKEN_HERE';
   ```
   Replace the two placeholder strings. That's the whole setup — free tier
   covers far more traffic than this site will ever see.

Until you do this, the contact form still emails you fine (that part doesn't
need storage) — only the dashboard's login/settings/submissions log won't work.

## The admin dashboard
Visit **yoursite.com/admin.html**.

- **Default login:** username `admin`, password `admin`. Change this
  immediately after your first login — it's the same login for anyone who
  knows to look for it.
- **Settings panel:** change the email address new briefs get sent to, and
  change the dashboard's username/password. Leave the password field blank
  to keep the current one.
- **Submissions:** every brief anyone has ever submitted, most recent first,
  with a "Show full brief" toggle for the complete set of answers. Stored
  in Upstash, capped at the most recent 200.
- The page isn't linked from the public site's nav (it's just a plain URL),
  and it's marked `noindex` so search engines won't list it.

## About sending "from" itzsoawmy@gmail.com (unchanged limitation)
Resend only allows sending "from" a domain you've verified via DNS — nobody
can verify `gmail.com`, so a literal `from: itzsoawmy@gmail.com` would be
rejected outright. The email currently sends from Resend's sandbox address
with the *client's own email* as reply-to (or itzsoawmy@gmail.com as a
fallback if theirs wasn't valid) — see `api/submit.js` for the full
explanation. Once you own a domain, verify it in Resend and set a
`FROM_EMAIL` environment variable in Vercel for a fully custom sender.

## Deploying to Vercel
1. Push this folder to a GitHub repo, or drag-and-drop it into Vercel's
   dashboard directly — zero build configuration needed.
2. Vercel auto-detects everything under `/api` as serverless functions.
3. That's it for Vercel itself. The only other thing to actually do is the
   Upstash step above.

Optional but recommended once you're comfortable: move the Resend API key
and the session-signing secret out of the source files and into Vercel
environment variables instead (`RESEND_API_KEY`, `SESSION_SECRET`) — they
work as hardcoded fallbacks right now specifically so nothing is blocked on
configuring Vercel, but an env var is safer since it isn't sitting in
visible source code.

## The multi-select brief form (unchanged from before)
Visitors can select more than one service. Step two shows each selected
service's specific questions, but anything that means the same thing across
services — References, Timeline — is asked exactly once, never duplicated.
The email and the dashboard both reflect this.

## Performance + design (unchanged from before)
Fonts load via `<link>` + `preconnect` instead of a CSS `@import`, scripts
load with `defer`, logo images have explicit dimensions to avoid layout
shift, and `vercel.json` sets long-term caching on static assets. None of
this round touched any visual design or animation.

## Still open
1. **Real portfolio.** `work.html` and the Home "Selected Work" section stay
   empty-state until there's a first real project to show.
2. **A real domain**, both for the site itself and for sending email from
   your own address instead of the Resend sandbox.
