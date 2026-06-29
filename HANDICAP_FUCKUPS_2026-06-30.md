# TRGG Handicap Saga — Catalog of Fuck-ups (2026-06-30)

Honest record of everything that went wrong: the platform's pre-existing bugs **and** the mistakes I made while fixing them. Symptom that kicked it off: every player on the Bangpakong (2026-06-30) tee sheet showed handicap **24** and only **1 division**.

---

## A. Pre-existing system bugs (the real root causes)

### A1. Tee-sheet typed-add defaults handicap to 24
- **What:** Typing a name into the Tee Sheet "Add" box created a throwaway player id (`manual_<ts>_<n>`) with **no handicap**. Auto-register then stored a hard-coded default of **24** for any blank handicap (`registerPlayer(... handicap: p.handicap != null ? p.handicap : 24)`).
- **Impact:** A whole field typed in this way → everyone 24 → no handicap spread → divisions collapse to 1.
- **Fix:** `addManual` now resolves the typed name against the directory and uses the real player + handicap; auto-register resolves a missing handicap from the directory before any fallback; tee sheet/sheet/print display the handicap from the registration (`_hcpOf`). Commit `60038e4f`.

### A2. The handicap-file upload was silently dropping names
- **What:** "Update TRGG Handicaps" (`TRGGHandicapPaste.process`) relied on an edge function (`fix-course-data`) that **skipped any name without an existing profile** and mishandled reversed names. So names in the master file never made it into the database (e.g. Davies, Ian 6.0; Lawrence, Luke 22.0 were in the file but absent from the system).
- **Impact:** Pete uploaded the file "all the time" but it was never fully loading. Players showed as non-members / wrong handicaps.
- **Fix:** Rewrote `process()` fully client-side — parse every distinct name, order-independent 1:1 match to profiles, update handicap everywhere it's read (`handicap_index` + `trgg_handicap` + `profile_data.handicap` + `society_handicaps`), and **create a profile for anyone not found**. Commit `e92c1e61`.

### A3. Dual-id player fragmentation (background cause)
- The same person exists under multiple ids (`TRGG-GUEST-*`, `MANUAL-*`, `manual_*`, real LINE ids), often with names in different orders. This is why typed adds didn't connect to existing handicaps and why matching is hard. Not fully solved — see Outstanding.

---

## B. Mistakes I made during the fix (my fuck-ups)

### B1. Kept insisting players "weren't in the directory" before checking the source
- I told Pete repeatedly that 6 players had no handicap on record, based on the app's directory search. I should have asked for / checked the **master handicap file** first. Two of those six (Davies, Ian; Lawrence, Luke) **were** in his file — they were just never loaded (bug A2). Wasted his time and made it look like I was dismissing his data.

### B2. Created 1,177 duplicate profiles on the first bulk load
- My first load SQL computed the name-match key by stripping `[^a-z0-9]` **before** lowercasing, which deleted every uppercase letter. Result: **0 matches**, so it created 1,177 brand-new duplicate profiles instead of updating existing ones.
- **Recovery:** caught it immediately (matched=0), deleted all 1,177 (`line_user_id LIKE 'TRGG-HCP-%'`), fixed the key (lowercase first), re-ran.

### B3. Loaded 1,182 as 1,177 — merged reversed-name pairs
- My corrected load deduped by an order-independent key, which **merged 5 reversed-name pairs** into one entry each (e.g. "Komatsu, Takashi" 36.0 and "Takashi, Komatsu" 24.3 → one), so the loaded count (1,177) was smaller than the file (1,182) and 5 players got the wrong/last handicap.
- **Fix:** reloaded keeping every distinct name with a **per-key 1:1 rank** so each name maps to its own profile and its own handicap. Verified the pairs land separately and correctly.

### B4. General
- Too much diagnosing out loud and not enough checking the authoritative source (the file) up front. The fix took several passes that should have been one.

---

## C. Final state (verified)
- **Full file loaded:** 1,182 players, every name, each with its own correct handicap (1,142 matched + ~40 created). Count matches the file exactly.
- **Reversed pairs correct:** Komatsu/Takashi 36.0/24.3, Lee W G/W.G. Lee 15.5/13.3, Jun/Kwan 11.0/14.0, etc.
- **Upload tool fixed & live** — future pastes load every name, create anyone new, never drop.
- **Bangpakong tee sheet:** real handicaps restored → 2 divisions.

## D. Still outstanding
- **4 names not in the master file at all** (so no handicap to load): Dollard, Dave · Howell, Mike · Mochizuki, Mr · Takatoshi, Ono. Likely typos/guests on that tee sheet — need correct names/handicaps.
- **Dual-id cleanup (A3):** merge duplicate player records so one person = one id. Not done.

---

## Commits
- `60038e4f` — tee sheet resolves handicaps from the directory (stop the 24 default)
- `e92c1e61` — TRGG handicap upload loads every name (no drops, 1:1 match)
- Data load + Bangpakong correction applied directly via SQL (no migration file kept).
