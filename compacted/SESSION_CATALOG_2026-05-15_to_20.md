# Session Catalog: 2026-05-15 to 2026-05-20

## Summary
Major sprint covering handicap fixes, Korean language system, society infrastructure, live scorecard improvements, and membership system.

---

## Features Delivered

### 1. Handicap System Fixes
- **GPR bug fix**: GPR was applying cuts to ALL society handicaps instead of only the recalculated one, causing handicaps to drift wildly (e.g., 0.3 → -3.8)
- **WHS adjustment table**: Added standard WHS low-rounds adjustments to `calculate_society_handicap_index` DB function (-2.0 for 3 rounds, -1.0 for 4/6 rounds)
- **Universal changed to WHS 8-of-20**: Was using best 3-of-5, now matches society calculation method
- **Scorecard handicap display fix**: `player-scorecard-viewer.js` was showing raw negative values instead of using `formatHandicapDisplay()`
- **Named society handicap badges**: Profile viewer now shows actual society names (e.g., "JOA Golf Pattaya: +0.6") instead of generic "Society"

### 2. Korean Language System (JOA Golf)
- **Event cards**: All labels in Korean (오늘, 모집 중, 마감, 상세보기, etc.)
- **Date/time formatting**: Korean locale (2026년 5월 18일 월요일, 오전 11:00)
- **Detail modal**: Section headers, fees, spots, notes all Korean
- **Registration form**: Labels, placeholders, buttons, cost calculator in Korean
- **Notifications**: 새 등록 / 등록 수정 for JOA events
- **Notes content**: Auto-translates keywords (Departure→출발, Tee-off→티오프, etc.)
- **Translate toggle**: 🌐 button on cards and detail modal to switch Korean↔English
- **Full plan cataloged**: `compacted/PLAN_MULTILANG_SOCIETY_SYSTEM.md`

### 3. Society Infrastructure
- **JOA Golf setup**: Jason Kang (Pattaya JOA LINE account) configured as organizer with PIN access
- **JGTS setup**: Erik Lundman configured as JGTS organizer with society profile, access PIN, logo
- **Per-society default fees**: `default_transport_fee` and `default_competition_fee` columns on `society_profiles`, "Save as Default" button in event creation form
- **Generic society tools**: Schedule upload + handicap import buttons show automatically for any society organizer in mobile menu
- **JGTS logo**: Saved and integrated into event card rendering

### 4. Society Casual Rounds
- **Society dropdown in scorecard**: Players can select their society for ANY round type (practice/private/society)
- **Societies in event dropdown**: JGTS, JOA, TRGG appear at top AND bottom of the event type dropdown
- **Auto-loads society handicap**: Selecting society loads that society's HCP for scoring
- **Post-round recalculation**: Adjusts selected society HCP + universal, does NOT affect other societies
- **Helper guide**: Green message with arrow when selecting casual society round
- **Cataloged**: `compacted/FEATURE_SOCIETY_CASUAL_ROUNDS.md`

### 5. Society Membership System
- **My Societies in Profile**: Dynamic section replacing static Club Affiliation dropdown
- **Browse & Join**: Modal showing all available societies with logos, descriptions, join buttons
- **Leave society**: Preserves handicap history, sets membership to inactive
- **New user registration**: "Join a Golf Society" step after profile creation with name matching
- **Initial handicap**: Set to 18.0 (or universal) when joining

### 6. Live Scorecard Improvements
- **END button**: Bright red with white text and glow for visibility
- **Active player card**: Brighter green background, thicker border, stronger glow
- **Player name above keypad**: 0.7rem → 1.1rem, bright green, bold for outdoor readability
- **Dark theme restored**: White theme attempt reverted — dark theme kept per Pete's preference

### 7. Event System Fixes
- **Duplicate prevention**: Save button disables on tap + DB check for same name+date+course
- **Recurring event cap**: Default reduced from 52 to 12 instances
- **364 duplicate "Hermes golf" events deleted**
- **Leaderboard grouping**: Now groups by course within each day (no mixing Hermes + Phoenix)
- **TRGG schedule sync fixed**: Updated parser for new website HTML format (missing `</tr>` tags, dot times, `<h3>` month headers), fixed wrong society ID

### 8. Other Fixes
- **TRGG/Admin buttons hidden by default**: Only show for Pete (were visible to all users)
- **Mobile menu scroll fix**: Changed drawer from 100dvh to top:0/bottom:0, added overscroll-behavior
- **App install prompt**: Shows for LINE in-app browser users, biometric offer for external browser
- **Admin dashboard header**: Revamped with compact red gradient bar and back button
- **Jason Kang profile**: Fixed name (was "Pattaya JOA"), role (was "organizer" → "golfer"), handicap (was null → 5.0)
- **Erik Lundman profile**: Set up with correct name, role, handicap 3.0

---

## Database Changes

| Change | Table | Details |
|--------|-------|---------|
| Added columns | `society_profiles` | `default_transport_fee DECIMAL DEFAULT 300`, `default_competition_fee DECIMAL DEFAULT 250` |
| Updated function | `calculate_society_handicap_index` | Added WHS low-rounds adjustments, universal now uses 8-of-20 |
| Updated data | `society_profiles` | JOA organizer_id → Jason's LINE ID, JGTS created |
| New rows | `society_organizer_access` | Jason (JOA), Erik (JGTS) with PINs |
| New rows | `societies` | JGTS society created |
| New rows | `society_profiles` | JGTS profile created with logo |
| Deleted rows | `society_events` | 364+6 duplicate "Hermes golf" events |
| Updated data | `scorecards` | Bangpra scorecard handicap corrected (-3.8 → 0.3) |
| Updated data | `scores` | Bangpra hole scores fixed (4 holes with wrong handicap_strokes) |

## Edge Functions Deployed

| Function | Change |
|----------|--------|
| `sync-trgg-schedule` | Fixed HTML parser for new TRGG website format, corrected society ID |

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Korean labels, society dropdown, membership system, scorecard fixes, event duplicate prevention, leaderboard grouping, menu fixes |
| `public/player-scorecard-viewer.js` | Handicap display fix, named society badges |
| `public/societylogos/jgts.jpg` | JGTS logo added |
| `sql/fix_society_handicap_adjustments.sql` | WHS 8-of-20 for universal + adjustment table |
| `supabase/functions/sync-trgg-schedule/index.ts` | Parser rewrite for new HTML format |
| `compacted/PLAN_MULTILANG_SOCIETY_SYSTEM.md` | Multi-language architecture plan |
| `compacted/FEATURE_SOCIETY_CASUAL_ROUNDS.md` | Society casual rounds feature doc |

---

## Known Issues / TODO
- Korean polish: "DATE"/"SELECT EVENT" labels in detail modal still show English data-i18n keys
- "Stableford" format name not translated to Korean
- Duplicate events in dropdown (same event showing twice with different name lengths)
- JOA events in `society_events` have `society_id: null` — not linked to societies table
- Dark theme scorecard: Pete wants white/outdoor theme but attempt was reverted — needs proper implementation with Gemini or careful incremental approach
- JGTS society_handicaps used wrong ID (societies vs society_profiles mismatch)
