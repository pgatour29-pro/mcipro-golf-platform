# Compacted Folder Catalog

This index catalogs the contents of `Documents/MciPro/compacted` and records the latest work completed so you can quickly resume.

## Recent Work (This Session)

- Chat reliability and UX
  - Added polling fallback when Supabase Realtime cannot join after max retries.
    - Functions: `startPollingFallback()`, `stopPollingFallback()` appended near end of file.
    - Wired into retry handler; polling backfills messages and updates badges, and periodically attempts to restore realtime.
  - Fixed mojibake in chat UI labels/buttons (group labels, archive/delete buttons, Private folder arrow/label, modal close button, typing indicator).
  - Corrected user mapping for DMs: map `user_profiles.line_user_id` → Supabase `profiles.id` in a single batched query for both initial contact load and live search.
  - Synced updated web chat JS to mobile assets (Android/iOS) so the app versions match the web version.

- Files touched
  - Updated:
    - `Documents/MciPro/www/chat/chat-system-full.js`
      - Polling fallback helpers and integration.
      - Batched profile mapping (search "queryContactsServer" and "initChat" user transform).
      - Label/icon normalizations (group names, Private folder arrow/label, typing indicator, modal close button set to × after insertion).
    - Mobile asset sync:
      - `Documents/MciPro/android/app/src/main/assets/public/chat/chat-system-full.js`
      - `Documents/MciPro/ios/App/App/public/chat/chat-system-full.js`
  - Copied (to keep parity):
      - `Documents/MciPro/www/chat/chat-database-functions.js` → Android/iOS asset folders

## How To Verify

- Open chat on web/mobile, then temporarily break network; you should see messages continue to appear after brief intervals (polling), and realtime restores automatically when network stabilizes.
- Start a DM from search or contacts; it should target the correct user (Supabase UUID), not only the LINE ID.
- Sidebar labels should render cleanly (no garbled glyphs); Private folder arrow toggles ▸/▾.

## Compact Folder Contents (Catalog)

High‑level docs and session logs useful for resuming work:

- 00‑READ‑ME‑FIRST.md — Session continuity guide; how to use this folder.
- README.md — Overview of the compacted docs.
- 02‑roadmap‑all‑tasks.md — Consolidated roadmap of tasks.
- NEXT_SESSION_TASKS.md — Immediate next actions.
- aiagent.txt — Guidance for coding agents in this repo.

Chat System
- 01‑chat‑system‑completed.md — Chat completion summary (DM/group RPCs, RLS, sidebar/backfill, badges).
- 2025‑10‑13_Mobile_Performance_And_Tailwind_Mistake.md — Postmortem: unread badge fix via membership scoping; Tailwind CDN revert and notes.
- 2025‑10‑15_ROOT_FILE_DISCOVERY_SCROLLING_CHAT_FIX.md — Chat container discovery/scroll fixes.
- mobile‑loading‑fix‑attempts‑2025‑10‑15.md — Attempts/results for mobile load time.

Organizer / Bookings / Calendar
- ORGANIZER_EVENTS_SYSTEM_TODO.txt — Organizer backlog.
- FIX_Calendar_Date_Timezone_2025‑10‑10.txt — Timezone normalization.
- FIX_Organizer_Calendar_Clickable_Dates_2025‑10‑10.txt — Calendar click UX fixes.
- FIX_RealTime_Sync_Organizer_Stats_2025‑10‑10.txt — Realtime sync for organizer stats.
- FIX_Registration_Count_Supabase_Column_2025‑10‑10.txt — Registration count correction.

Profiles & Auth
- 2025‑10‑11_Mobile_Header_and_Profile_Data_Fix.md — Mobile header/profile fixes.
- PROFILE_SYNC_FIX_2025‑10‑09.txt — LINE ↔ Supabase profile mapping/sync.

Live Scorecard
- 2025‑10‑11_LiveScorecard_Complete_Overhaul.md — Overhaul: keypad entry, live leaderboards, offline‑first.
- PLAN_Live_Scorecard_Leaderboard_2025‑10‑10.txt — Leaderboard/scoring plan.

Native App Progress
- MciProNative‑Progress‑2025‑10‑14.md — RN app status and integration points.

Session Logs & Summaries
- 2025‑10‑11_SESSION_CATALOG_FAILURES.md — Session reliability issues and mitigations.
- 2025‑10‑11_Session_Tasks_1‑4_Tab_Fixes.md — Tab fixes batch.
- SESSION_Organizer_Phase1_Complete_2025‑10‑10.txt — Phase completion summary.
- SESSION_CONTINUATION_Organizer_System_2025‑10‑10.txt — Organizer follow‑up.
- SESSION_COMPLETE_Tasks_1‑7.txt — Completed tasks checklist.
- 2025‑10‑15_COMPLETE_ERROR_CATALOG_ALL_FUCKUPS.md — Comprehensive error catalog.
- TECHNICAL_SUMMARY.md — System‑wide technical notes.
- QUICK_REFERENCE.md / QUICK_REFERENCE_Current_State.txt — Quick reference sheets.
- Todos.txt — Short to‑do scratchpad.

Media
- Screenshot 2025‑10‑08 133040.jpg — Visual reference used in discussions.

## Suggested Next Steps

- Optional: add organizer notifications (email/LINE) when a scorecard is finalized (Supabase table + function).
- Optional: wire caddie booking demo UI to backend schema.
- Optional: small UI indicator when chat is in polling mode.

—
Generated: 2025‑10‑16
