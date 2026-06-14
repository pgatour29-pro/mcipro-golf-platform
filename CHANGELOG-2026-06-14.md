# MyCaddiPro — Work Catalog · 14 June 2026

A full record of everything built, fixed, and deployed today. **17 commits** shipped to production (auto-deployed via Vercel), plus the local architecture-map tool and a few live data fixes.

---

## 1. Course scoring — mid-round back-9 change
For multi-nine courses where the back nine isn't decided until the turn.

- **Plutaluang back-9 change** — change the back nine mid-round; the app re-interleaves the stroke indexes (SI 1–18) and rescores every player automatically. `86fe376e`
- **Made it global** — extended from Plutaluang to all multi-nine courses (Khao Kheow, Burapha, Greenwood, Phoenix, Laem Chabang, Siam Plantation) with an in-app dropdown picker instead of typing. `c4eba7cc`
- **Button restyle** — the "⛳ Change Back 9" button now blends into the hole header instead of sticking out. `0b9ed133`

## 2. Ryder Cup module retired
- Removed the finished TRGG Ryder Cup module from the live app, and **archived the full module** to `archive/ryder-cup-module/` as a reusable template for future head-to-head/team events. `8c9f8e36`

## 3. Light version — new overview (the 4 cubes)
A simpler, more intuitive home screen for the Light dashboard.

- **2×2 cube layout** — Handicap, Society Events, Schedule, Play Golf; weather moved out of the overview into the hamburger menu. `f5961e10`
- **Scoped to Light only** — the Full ("Geekout") dashboard is unchanged except for the weather move. `1075de15`
- **Fixed empty cubes** — they were rendering before the user loaded; now they self-retry until data is ready and also populate on login. `aa0d192c`
- Handicap cube taps through to Round History; Play Golf starts a round.

## 4. Light version — Schedule cube & "My Schedule" popup
- **Built the My Schedule popup** — lists your upcoming registered society events (course, big departure time, tee time, caddy). `a25e8e29`
- **Next-event logic** — once an event's tee time passes, it drops off and the next event takes its place (uses your phone's local clock). `a25e8e29`, `8a287922`, `3e9bde9b`
- The Schedule cube shows the course you're playing next + the departure time in big numbers.

## 5. Light version — caddy assignment (from the schedule)
- **Assign caddies to a round** straight from the My Schedule popup, pulling from your My Caddies. `43cc989f`
- **Course-aware picker** — shows only the caddies for the course you're playing next, plus **manual entry** for new/unlisted caddies. `4e8cf99c`
- **Full caddy roster** — pulls from all four sources (course roster, your notebook, your bookings, past event caddies) with exact course matching so no other course's numbers leak in. `512f2cb2`
- **Easy remove/reassign** — the currently-assigned caddy shows at the top with a clear **Remove** button, the assigned caddy is highlighted, and tapping any caddy swaps it. `2f7e9c71`
- **Society shown** — the schedule cube and popup now show which society you're playing with. `2f7e9c71`
- **Scroll fix** — fixed the nested-scroll trap where you couldn't scroll back up in the caddy list. `2d5fa5dc`

## 6. Header — show your golf society
- When "Display Under Name → Golf Society" is selected, the header now correctly shows your **society name** (pulled from your actual membership) instead of falling back to your home course. Works for all users going forward. `f815a522`
- Backfilled your account directly: set your affiliation to "Travellers Rest Golf Group" and marked it your primary society.

## 7. Light version — full translation
- **100% of the Light version is now translated** into all 4 languages (English, Thai, Korean, Japanese) — the 4 cubes, the My Schedule popup, the entire caddy picker (including search box, input fields, buttons, loading/error messages), and the weather labels. Dates display per language. `e41d3fda`
- Golf societies and course names are intentionally left untranslated.

## 8. Architecture map (local-only tool — not deployed)
- Made the interactive codebase map **fully self-contained** — the graph library is now baked into the file, so it works offline and renders on **mobile Chrome** (it was blank before because mobile Chrome blocks the external library load). Sent the file to you privately over Telegram.
- The map covers 233 nodes / 292 edges (entry, client modules, edge functions, DB tables, RPCs, external services) with feature-flow filters, a health/issues overlay, and search.

## 9. Live data fixes (done directly via SQL)
- Restored your real Pattaya CC (Jun 15) caddy to **26** after it was changed during testing.
- Set your society affiliation + primary society (see #6).

---

### Verification & safety
- Scoring test suite (`npm test`) passed (21/21) before every deploy.
- Every change verified visually in a real browser before going live.
- All commits auto-deployed to production via Vercel.
