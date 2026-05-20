# Society Casual Rounds — Play Society Rounds Without Scheduled Events

**Status:** DEPLOYED — 2026-05-20
**Requested by:** Pete Park

---

## What It Does

Players can select their society from the dropdown when starting ANY round type (practice, private, or society event). Previously, the society dropdown only worked with pre-scheduled society events.

### Flow
1. Player opens Live Scorecard → picks "Practice Round" or "Private Round"
2. Society dropdown shows all societies with their handicaps: "TRGG (HCP: 0.3)", "JGTS (HCP: 3.0)", etc.
3. Player picks their society + picks the golf course
4. System loads that society's handicap for scoring
5. After the round, it recalculates:
   - **Selected society HCP** (e.g., JGTS) → WHS 8-of-20 from JGTS rounds only
   - **Universal HCP** → WHS 8-of-20 from ALL rounds
   - **Other society HCPs** → NOT affected
6. Round is saved with `primary_society_id` set to the selected society

### What Changed
- `onEventChanged()` no longer resets the society dropdown when practice/private is selected
- `startRound()` auto-upgrades round type to 'society' when a society is selected
- `societyForHandicap` now uses the selected society regardless of round type
- `adjustHandicapAfterRound()` receives the correct `primarySocietyId` from `roundSocietySelect`

### Files Modified
- `public/index.html`: Lines ~65335 (onEventChanged), ~69785 (startRound), ~69827 (societyForHandicap)

### Key IDs
- `#scorecardEventSelect` — Practice/Private/Event dropdown
- `#roundSocietySelect` — Society dropdown (populated from `society_profiles`)
- `primary_society_id` in `rounds` table — links round to society

### Handicap Recalculation Rules
- Universal: auto WHS 8-of-20 (ALL rounds)
- Selected society: auto WHS 8-of-20 (society rounds only)
- TRGG: MANUAL only (from TRGG import, never auto-calculated)
- Other societies: untouched
