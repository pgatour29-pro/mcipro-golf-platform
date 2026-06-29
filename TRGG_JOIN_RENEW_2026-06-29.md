# TRGG Directory — Join / Renew Membership (2026-06-29)

**Status:** Built, verified end-to-end, deployed & live.
**Area:** TRGG membership management (organizer side).
**Commits:** `7b0ec7b2` (Join/Renew core) · `ebb6a228` (handicap + players-directory sync).

---

## What it does
A **"Join / Renew"** button (top-right of the TRGG Directory) opens a **search-driven** modal:

- **Search a name or member #** → matching members each show **Renew ฿1,000**.
- **Join as new member · ฿2,000** → form for anyone not already a member.

### Join (new member)
- Fields: First name, Last name, **Handicap (optional)**, Country (optional). Name required; handicap optional everywhere.
- Gets the **next member number** = highest numeric `trgg_members.member_id` + 1 (sequential; e.g. 1002 → 1003).
- `date_joined` = today, `expire_date` = today + 1 year, `status` = active.
- **Also auto-added to the Players Directory** (so they're event-ready) — see below.

### Renew (existing member)
- Tapping Renew → a confirm step showing the member + current expiry, with an **optional Handicap** field (blank = keep).
- **Keeps their existing member number.** New expiry = current expiry + 1 year (renew early and you keep the remaining days); if the membership is long-lapsed (old + 1yr is still in the past), a fresh year from today.
- `last_renewed_on` = today, `status` = active.
- If a handicap is entered, it's updated in the Players Directory.

---

## Data model — what gets written
On **Join** (and **Renew**), the person is synced into all of these so they're a usable, event-ready player:

| Table | What | Notes |
|---|---|---|
| `trgg_members` | Membership record | `member_id` sequential; `id` is an IDENTITY column (omit on insert); `matched_user_id` linked to the created player |
| `user_profiles` | Player profile | `line_user_id = MANUAL-<ts>-<rand>`, `name = "Last, First"`, `profile_data.handicap` |
| `society_members` | Players-directory entry | `society_id` = TRGG, `member_number = TRGG-<id>`, `status = active` |
| `society_handicaps` | Authoritative handicap | upsert on `(golfer_id, society_id)`, `handicap_index` |

The directory sync **mirrors the proven `SocietyOrganizerSystem.addManualPlayer` flow** (`SocietyGolfDB.createOrFindManualPlayer` + `addSocietyMember`), so it behaves exactly like manually adding a player.

**Renew avoids duplicate profiles:** it passes the member's existing `matched_user_id` (when present) instead of re-finding by name — because `createOrFindManualPlayer` matches on `"Last, First"`, which often misses an existing profile stored in a different name format. Brand-new joins have no match, so a fresh profile is created.

**Resilience:** the directory sync is wrapped in try/catch — if it fails, the membership is still created and the success modal says so.

---

## Code (public/index.html, `window.TRGGDirectory`)
- Header button → `openJoinRenew()` (search modal).
- `_jrSearch(v)` — filters `this._all`; each result → `renewConfirm(memberId)`.
- `showJoinForm()` → `submitJoin()` — creates `trgg_members` + `_syncToDirectory(...)` + links `matched_user_id`.
- `renewConfirm(memberId)` → `doRenew(memberId)` — extends expiry + `_syncToDirectory(...)`.
- `_syncToDirectory(fullName, handicap, memberNumberId, existingPlayerId)` — the directory writer.
- Helpers: `_nextMemberId` (max numeric member_id + 1), `_isoToday`, `_addYear`, `_renewExpiry`, `_fmtDate`, `_jrModal`, `_jrClose`.

## Database setup (one-time, already applied)
- `GRANT INSERT, UPDATE ON public.trgg_members TO anon, authenticated;` (RLS is OFF on `trgg_members`; it was read-only before).
- `trgg_members.id` is an IDENTITY column → inserts omit `id`.

## Context
- TRGG society: `id 7c0e4b72-d925-44bc-afda-38259a7ba346`, name `"Travellers Rest Golf Group"`, organizer_id `"trgg-pattaya"`. Resolution uses `AppState.selectedSociety`.

---

## Verification
Ran a real end-to-end test join (name + handicap 14.5). Confirmed all four tables were written **and linked** — `trgg_members #1003` ↔ `MANUAL-…` profile ↔ `society_members` (TRGG) ↔ `society_handicaps 14.5` — then deleted every test record (0 left, no production pollution). UI verified via screenshots.

## Follow-ups / not built
- Recording the **cash paid** (฿2,000 / ฿1,000) on join/renew — currently the amounts are button labels only.
- Directory actions still pending elsewhere: tap member → edit, export.
