# PWA Install Gate — 2026-07-16

**Commit:** `9e0fd2de` — *Force PWA install gate for first-time users (LINE-aware)*
**Ships in:** SW `mcipro-cache-v590`
**Files:** `public/index.html`, `public/sw.js`
**Deploy:** push `master` → Vercel (~60–90s); verified live on `mycaddipro.com` (non-www).

---

## The complaint
> "New registers who log in for the first time still can't get MyCaddiPro onto
> their phone's home screen — make it easier, almost a force before anything else."

## Root cause — you CANNOT install a PWA from inside LINE
Most new users sign up **inside LINE's in-app browser**, and that webview
**never fires `beforeinstallprompt`** and has **no "Add to Home Screen"**. The
only way to install is to leave LINE for the system browser (Safari/Chrome) and
install there. The old flow didn't accept that reality:

| Old behaviour | Why it failed |
|---|---|
| Post-signup: `if (hasPrompt()) trigger(); else if (isIOS){…}` | LINE/Android → `hasPrompt()` false, not iOS → **silent no-op**. The most common new user saw nothing. |
| iOS "Share → Add to Home Screen" steps shown **inside LINE** | LINE's iOS share sheet has no A2HS — impossible to follow. |
| "Open in Browser" escape → `https://mycaddipro.com` (no params) | Landed logged-out with zero guidance; high drop-off. |
| 3-second nag, auto-removed after 15s, buried behind the society picker | Not "before anything else"; easy to miss/dismiss; no persistence. |
| Three separate install surfaces (login modal, LINE modal, post-create sheet) | Fragmented, inconsistent, none owned the outcome. |

## The fix — one authoritative `PWAInstallGate`
`window.PWAInstallGate` (public/index.html ~15,341). Near-forced, full-screen,
honest about LINE. Three branches:

| Context | Behaviour |
|---|---|
| **Inside LINE** (any OS) | "LINE can't install apps" → big **Open in Safari/Chrome** → `liff.openWindow({url:'https://mycaddipro.com/?install=1', external:true})` |
| **Lands in system browser** (`?install=1`) | `checkDeepLink()` auto-resumes straight to the install step |
| **Android / Chrome** | one-tap **Install App** via `installNative()` (`window.__deferredInstallPrompt` / `MciProInstall.trigger()`); `_watchPrompt()` reveals the button if the event arrives late; Chrome-menu steps as fallback |
| **iOS Safari** | Share → Add to Home Screen steps + bouncing ⬇️ arrow pointing at the Share button; non-Safari iOS (CriOS/FxiOS/EdgiOS/OPiOS) told to open in Safari |
| **Installed / standalone** | gate skipped forever; biometric enrollment offered instead |

## Wiring (the non-obvious bits)
- **Early `<head>` capture** (~line 48): registers `beforeinstallprompt` →
  `window.__deferredInstallPrompt` **and** stashes `window.__pwaInstallIntent`
  from the first URL — *before* the app strips `?install=1`. `checkDeepLink()`
  reads that flag, not `location.search` (the app clears the query on boot; this
  was a real bug caught in testing).
- **Fired centrally from `redirectToDashboard()`** (~19,487) — the universal
  login funnel for **new + returning + restore**. New users reach it via
  `loginWithCustomProfile` → `redirectToDashboard`. Do **NOT** add per-path
  install calls — they stack the gate on top of the society picker. (The old
  post-signup call was removed for exactly this reason.)
- **Persistence:** `appinstalled` → `localStorage.mcipro_pwa_installed='1'`
  (skip forever). "Maybe later" → `sessionStorage.mcipro_install_snooze`
  (re-nags next login until installed). The older LINE-path trigger (~19,331)
  now only does biometrics for installed users, so it can't override the snooze.
- **Reuses** `window.MciProInstall` in `public/sw-register.js` (native prompt
  capture) — kept, not duplicated. The login-screen manual "Install App"
  `#installAppModal` (with QR) is untouched as a fallback.
- **i18n:** en / th / ko / ja inline in `_strings()`.

## Verification (all screenshotted via agent-browser)
- ✅ iOS Safari — Share steps + bouncing arrow
- ✅ Android (Pixel emu) — one-tap **Install App** (`hasNativePrompt()` true, button shown)
- ✅ LINE (stubbed `liff`) — "Open in Chrome/Safari"; confirmed `liff.openWindow` fires with `?install=1`
- ✅ Deep-link auto-resume (`?install=1` → gate opens, intent consumed, URL cleaned)
- ✅ Scoring tests 21/21; no new console errors; live HTML carries the markers; gate opens on production

## Known limitation
The **actual** OS-level install (native prompt accept, real iOS A2HS) can only be
completed on a physical phone — emulators can't finish it. UI, branching, and the
LINE handoff are all confirmed; the install completion itself is device-only.

## Related
- Memory: `project_pwa_install_gate`
- [`project_desktop_login_quickpath`] — biometric/passkey enrollment (offered once installed)
- `public/sw-register.js` — `MciProInstall` native-prompt API
