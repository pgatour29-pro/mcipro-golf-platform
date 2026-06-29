# LINE Login Loop — Incident & Fix (2026-06-29)

**Status:** Fix deployed & verified end-to-end on the server side. Awaiting a real-account login confirmation from Derek (he can't retry until the morning of 2026-06-30).
**Severity:** High — login is the most basic, must-always-work component.
**Area:** Authentication / LINE OAuth.

---

## Symptom
Derek (TRGG organizer) on **desktop Chrome** could not log in with LINE — it kept bouncing in a "login loop": he'd go through LINE, come back, and land on the MyCaddiPro login screen still logged out, repeatedly.

## Impact
Any user who reached the site on the **`www.`** hostname could not complete a LINE login. They would loop indefinitely.

---

## Root Cause
The platform was reachable on **two different origins** and login only completed on one of them:

- The site answered `200 OK` on **both** `https://www.mycaddipro.com` and `https://mycaddipro.com` (no redirect between them).
- The LINE OAuth flow hardcodes its `redirect_uri` to the **non-www** origin: `https://mycaddipro.com/` (this is also the only redirect URI registered in the LINE Login console).

So when a user started on `www.mycaddipro.com`:
1. They tapped **Sign in with LINE**; the OAuth `state` was saved in `localStorage`/`sessionStorage`/cookie **on the `www` origin**.
2. LINE authenticated them and redirected to **`https://mycaddipro.com/`** (non-www, per the redirect URI).
3. The login completed and the session was established **on the non-www origin**.
4. Their original tab / bookmark / saved app was still **`www`**, which never received the session → still logged out → they tried again → **loop**.

Browser storage (localStorage/sessionStorage and host-only cookies) is **per-origin**, so `www` and the apex are effectively two separate sessions.

## What was NOT the cause (ruled out)
- **Backend token exchange** — the `line-oauth-exchange` Edge Function is healthy and correctly deployed with `--no-verify-jwt`. A direct `POST` with a dummy code (no auth header, exactly like the app sends) returns LINE's `invalid_grant` / "invalid authorization code" (`HTTP 400`), proving the function runs and reaches LINE. (A `401`/"missing authorization header" would have meant it lost `--no-verify-jwt`.)
- **iOS LINE-app handoff** — Derek is on desktop Chrome, not iOS, so the known iOS app→Safari handoff issue does not apply.
- **App login code** — the OAuth return handler is robust; it cleans the URL on every failure path, so a true infinite auto-loop from the JS was unlikely. The loop was the origin split, not the handler.

---

## The Fix
Force a single canonical origin: **`www.mycaddipro.com` → 308 → `https://mycaddipro.com/...`** via a Vercel redirect.

`vercel.json`:
```json
"redirects": [
  { "source": "/(.*)", "has": [{ "type": "host", "value": "www.mycaddipro.com" }], "destination": "https://mycaddipro.com/$1", "permanent": true }
]
```

Commit: `99d0e807` — "Force www -> non-www (canonical) to stop LINE login loop".

Now everyone is on one origin, so a login can never complete on a different origin than the user's tab.

## Verification (done from the server/browser side)
- `curl -I https://www.mycaddipro.com/` → **308** → `https://mycaddipro.com/` ✅
- In a real browser, opening `https://www.mycaddipro.com/` lands on `https://mycaddipro.com/` ✅
- `loginWithLINE()` correctly redirects to `https://access.line.me/oauth2/v2.1/...` with `redirect_uri=https://mycaddipro.com/` ✅
- `line-oauth-exchange` Edge Function reaches LINE and responds correctly ✅
- **Cannot** be fully confirmed without a real LINE account completing the round trip → Derek to test tomorrow.

---

## For Derek (test on 2026-06-30 AM)
1. Open a **new Incognito window** (Ctrl+Shift+N) → go to **mycaddipro.com** → **Sign in with LINE**.
2. If it logs in → resolved.
3. If it still loops → press **F12 → Console**, try again, and **screenshot** the console. The login logs every step (`[OAuth]` / `[AUTH]`): state match, edge-function status, profile/no-profile, and `verifyOtp` result — that pinpoints the exact failing step.

---

## Runbook — diagnosing a LINE login loop
1. **Origin check:** confirm both hosts resolve to ONE origin (`curl -I https://www.<domain>/` should 30x to the canonical). A www/non-www split is the #1 loop cause.
2. **Exchange function:** `curl -X POST https://<ref>.supabase.co/functions/v1/line-oauth-exchange -H "Content-Type: application/json" -d '{"code":"x","state":"x","redirectUri":"https://mycaddipro.com/"}'`
   - `401` / missing-auth ⇒ the function lost `--no-verify-jwt` (redeploy with it).
   - `400` `invalid_grant` ⇒ function is healthy.
3. **Redirect URI:** the app's `redirect_uri` (`https://mycaddipro.com/`) must exactly match a URI registered in the LINE Login console.
4. **User console logs:** DevTools Console `[OAuth]`/`[AUTH]` lines give the exact failing step (state mismatch / exchange error / no profile / verifyOtp failure).
5. **iOS:** if on iPhone, it's the LINE-app → Safari handoff (the app doesn't auto-return) — see the in-app "tap ◀ Safari" hint.

## Relevant code (public/index.html)
- `loginWithLINE()` ~14218 — builds the LINE authorize URL (non-www `redirect_uri`, stores `state`).
- OAuth return handler ~18424 — reads `code`+`state`, validates state, calls `line-oauth-exchange`, `verifyOtp`, then `redirectToDashboard`; cleans the URL on all failure paths.
- Edge Function: `line-oauth-exchange` (Supabase).

## Prevention / follow-ups
- Keep the site on ONE canonical origin permanently (this redirect).
- Consider registering BOTH origins' redirect URIs in LINE as a backstop (defense-in-depth), though the canonical redirect makes it moot.
- If login problems recur, capture the user's Console logs first — do not guess.
