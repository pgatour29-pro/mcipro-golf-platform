# Ryder Cup module (archived 2026-06-14)

The TRGG Ryder Cup 2026 (Pattaya vs Hua Hin, June 9–12) event finished, so the module was
removed from the live app. Kept here as a **reusable template** for future head-to-head /
team society events. Full code is in `ryder-cup-module.html`.

## What it was
A self-contained promo → registration → live-scoreboard / admin flow for a 2-team event:
- **Dashboard promo banner** with a live registrant count badge.
- **Fullscreen page** (`RyderCupPage` object): pick a side (USA/Pattaya vs Europe/Hua Hin),
  pick/create a team, register, view the package, and a 3-day live scoreboard; plus an admin
  mode for managing registrations / day-by-day match setup.
- **Organizer admin card** (gated to the TRGG society) to open the page in admin mode.

## Where each block lived in public/index.html (before removal)
1. Promo banner — ~line 37122 (golfer dashboard home, above the Community Stats ticker).
2. Organizer admin card `#orgAdminRyderCup` — ~line 52243 (organizer dashboard).
3. Admin-card visibility — 2 lines inside the TRGG-tools function (~94697): created `rcEl`
   from `#orgAdminRyderCup` and toggled it with `isTRGG` (same gate as the TRGG sync/paste tools).
4. `const RyderCupPage = {…}` object + `window.RyderCupPage =` + the reg-count badge loader — ~line 95300.

## Integration points to recreate when reused
- **TRGG gating:** `TRGG_IDS = ['7c0e4b72-d925-44bc-afda-38259a7ba346','17451cf3-f499-4aa3-83d7-c206149838c4']`
  (or society name contains "trgg"/"travellers rest"). The admin card showed only when `isTRGG`.
- **Data source:** the event row is found in `society_events` by `title ilike '%Ryder Cup%'`; registrations
  live in `event_registrations` (filtered by that event id). The badge subscribes to realtime
  `event_registrations` changes on channel `ryder-cup-registrations`.
- **Hero image:** `/ryder-cup/hero.jpg` (static asset under public/ryder-cup/ — left in place).
- **i18n:** `rydercup.*` keys (title/huahin/register/registeredplayers) were left in index.html's
  i18n objects (harmless unused strings; `rydercup.registeredplayers` is still used by another label).

## To re-enable / adapt for a new event
Paste blocks 1, 2, 4 back into index.html at the same spots, restore the 2 `rcEl` lines (block 3),
update the title/dates/team names/hero image, and point the data lookups at the new event title.
