# Live Scorecard System Audit Report

**Date:** October 18, 2025
**Audit Type:** Round History Posting & Handicap Tracking
**Platform:** MciPro Golf Platform

---

## Executive Summary

✅ **Scorecard Posting:** WORKING - Saves to database
✅ **Handicap Recording:** WORKING - Calculated and updated
✅ **Society Event Posting:** WORKING - Visible to organizers
⚠️ **Golfer History Display:** PARTIAL - Database rounds not shown in UI

---

## 1. Scorecard Posting Analysis

### ✅ WORKING: Database Storage

**File:** `index.html:32265-32294`

**Function:** `saveRoundToHistory(player)`

**What Happens:**
1. Saves round to `rounds` table in Supabase
2. Records all scoring formats (stableford, strokeplay, scramble, etc.)
3. Links to golfer via `golfer_id` (LINE User ID)
4. Links to society event via `society_event_id` (if applicable)
5. Saves hole-by-hole details to `round_holes` table

**Database Schema - `rounds` table:**
```javascript
{
    golfer_id: player.lineUserId,           // Links to golfer
    course_id: courseId,                     // Course identifier
    course_name: courseName,                 // Display name
    type: 'private' or 'society',           // Round type
    society_event_id: eventId,              // NULL for private rounds
    started_at: ISO timestamp,
    completed_at: ISO timestamp,
    status: 'completed',
    total_gross: totalGross,                // Total strokes
    total_stableford: totalStableford,      // Stableford points
    handicap_used: player.handicap,         // Handicap at time of round
    tee_marker: teeMarker,                  // Red/White/Yellow/Blue
    scoring_formats: ['stableford'],        // Array of formats
    format_scores: {                        // Scores per format
        stableford: 36,
        strokeplay: 88,
        nassau: {...}
    }
}
```

**Database Schema - `round_holes` table:**
```javascript
{
    round_id: round.id,
    hole_number: 1-18,
    par: 4,
    stroke_index: 7,
    gross_score: 5,
    net_score: 4,
    stableford_points: 1,
    handicap_strokes: 1,
    drive_player_id: '...',          // For scramble
    drive_player_name: 'John',       // For scramble
    putt_player_id: '...',           // For scramble
    putt_player_name: 'Jane'         // For scramble
}
```

---

## 2. Handicap Recording & Adjustment

### ✅ WORKING: Automatic Handicap Updates

**File:** `index.html:32731-32822`

**Function:** `updatePlayerHandicap(player)`

**Handicap Calculation Logic:**
1. Only updates for complete 18-hole rounds
2. Calculates score differential vs expected score (par + handicap)
3. Adjusts handicap by 0.1 per stroke difference
4. Maximum change: ±2.0 per round
5. Keeps handicap between 0 and 54

**Formula:**
```javascript
expectedScore = coursePar + player.handicap
scoreDiff = totalGross - expectedScore
handicapChange = scoreDiff * 0.1  // Capped at ±2.0
newHandicap = player.handicap + handicapChange
```

**Example:**
- Player handicap: 18
- Course par: 72
- Expected score: 72 + 18 = 90
- Actual score: 85
- Difference: 85 - 90 = -5 (5 strokes better)
- Handicap change: -5 × 0.1 = -0.5
- New handicap: 18 - 0.5 = **17.5**

**Database Update:**
- Updates `user_profiles` table
- Preserves ALL profile sections (prevents data loss)
- Updates both `profile_data.golfInfo.handicap` AND top-level `handicap`

---

## 3. Society Event Score Posting

### ✅ WORKING: Organizer Visibility

**File:** `index.html:32388-32399`

**Process:**
1. When round is completed in Live Scorecard
2. If `society_event_id` is set (not a private round)
3. Round is saved with `society_event_id` in database
4. Organizer can view via **Society Organizer Dashboard** → **Scoring Management**

**Organizer Score Retrieval:**

**File:** `index.html:41937-41961`

**Function:** `refreshScores()`

**Query:**
```javascript
const { data: rounds } = await SupabaseDB.client
    .from('rounds')
    .select('*')
    .eq('society_event_id', eventId)
    .order('total_stableford', { ascending: false });
```

**Features:**
- Auto-refreshes every 30 seconds
- Shows all rounds for the event
- Displays leaderboard with multiple format support
- Shows player names, scores, handicaps, tee markers

---

## 4. Dual Posting (Golfer + Organizer)

### ✅ WORKING: Score Distribution

**File:** `index.html:32352-32406`

**Function:** `distributeRoundScores()`

**What Happens:**
1. Saves round for each player in the group
2. Distributes round to all players via `distribute_round_to_players` RPC
3. If society event: Links to organizer via `society_event_id`
4. All players in the group can see each other's scores

**Distribution Logic:**
```javascript
// Save round for each player
for (const player of this.players) {
    const roundId = await this.saveRoundToHistory(player);

    // Distribute to all players in group
    await SupabaseDB.client.rpc(
        'distribute_round_to_players',
        {
            p_round_id: roundId,
            p_player_ids: [all player LINE IDs]
        }
    );
}

// Society event linking
if (society event) {
    // Round already linked via society_event_id
    // Organizer queries: WHERE society_event_id = ?
}
```

---

## 5. ISSUE IDENTIFIED: Golfer History Display

### ⚠️ PARTIAL FUNCTIONALITY

**Problem:** Golfer's Round History tab shows localStorage data only, not database rounds

**Current Implementation:**

**File:** `index.html:26555-26610`

**System:** `GolfScoreSystem` (OLD localStorage-based system)

**Round History Tab:**
- Location: Golfer Dashboard → Round History
- Data Source: `localStorage.getItem('mcipro_golf_scores')`
- Display: Manual round entry only (not Live Scorecard rounds)

**Gap:**
```
Live Scorecard Round
     ↓
Supabase 'rounds' table
     ↓
     ❌ NOT DISPLAYED in Golfer History tab
```

**Current Flow:**
```
Manual Entry (Add Round button)
     ↓
localStorage
     ↓
✅ Displayed in Round History tab
```

---

## 6. Recommendations

### Priority 1: HIGH - Integrate Database Rounds into History

**Action:** Update `GolfScoreSystem.loadRoundHistoryTable()` to query database

**Implementation:**
```javascript
async loadRoundHistoryTable() {
    const userId = AppState.currentUser?.lineUserId;

    // Load from Supabase instead of localStorage
    const { data: rounds, error } = await window.SupabaseDB.client
        .from('rounds')
        .select('*')
        .eq('golfer_id', userId)
        .order('completed_at', { ascending: false });

    if (error) {
        console.error('Error loading rounds:', error);
        return;
    }

    // Display rounds...
}
```

**Files to Modify:**
- `index.html:26555-26610` - Update loadRoundHistoryTable()
- `index.html:26380-26450` - Update statistics calculations
- `index.html:7555` - Initialize with database query

**Expected Result:**
- Golfers see ALL rounds (manual entry + Live Scorecard)
- Proper handicap history
- Ability to view hole-by-hole details

---

### Priority 2: MEDIUM - Add Round Detail View

**Action:** Create modal to show hole-by-hole scores

**Features:**
- Click round → See hole-by-hole breakdown
- Show par, gross, net, stableford per hole
- Display scramble tracking (drive/putt players)
- Show course layout with yardages

---

### Priority 3: LOW - Migrate localStorage to Database

**Action:** One-time migration of old rounds

**Process:**
1. Read `localStorage.getItem('mcipro_golf_scores')`
2. For each round, insert into `rounds` table
3. Mark as `type: 'manual'`
4. Clear localStorage after successful migration

---

## 7. Testing Checklist

### Database Posting
- [x] Round saves to `rounds` table
- [x] Hole-by-hole saves to `round_holes` table
- [x] Correct golfer_id linkage
- [x] Society event linkage (when applicable)

### Handicap System
- [x] Handicap calculates correctly
- [x] Profile updates in database
- [x] Handicap change limited to ±2.0
- [x] Only 18-hole rounds update handicap

### Society Events
- [x] Organizer sees rounds in scoring dashboard
- [x] Real-time updates (30-second refresh)
- [x] Multiple format support
- [x] Leaderboard sorting

### Golfer History (NEEDS FIX)
- [ ] Database rounds appear in history tab
- [ ] Hole-by-hole detail view
- [ ] Handicap graph over time
- [ ] Filter by course/date

---

## 8. Code Locations Reference

| Feature | File | Line | Function |
|---------|------|------|----------|
| Save Round to DB | index.html | 32152-32350 | saveRoundToHistory() |
| Complete Round | index.html | 32115-32150 | completeRound() |
| Update Handicap | index.html | 32731-32822 | updatePlayerHandicap() |
| Distribute Scores | index.html | 32352-32406 | distributeRoundScores() |
| Organizer View | index.html | 41937-41961 | refreshScores() |
| Golfer History (OLD) | index.html | 26555-26610 | loadRoundHistoryTable() |

---

## 9. Database Tables

### rounds
- **Purpose:** Store completed rounds
- **Primary Key:** id (UUID)
- **Foreign Keys:** golfer_id, course_id, society_event_id
- **Key Fields:** total_gross, total_stableford, handicap_used, format_scores

### round_holes
- **Purpose:** Store hole-by-hole details
- **Primary Key:** id (UUID)
- **Foreign Key:** round_id
- **Key Fields:** hole_number, par, gross_score, net_score, stableford_points

### user_profiles
- **Purpose:** Store golfer profiles
- **Primary Key:** line_user_id
- **Handicap Fields:** handicap (top-level), profile_data.golfInfo.handicap

### society_events
- **Purpose:** Store society golf events
- **Primary Key:** id (UUID)
- **Foreign Key:** organizer_id
- **Links to:** rounds.society_event_id

---

## 10. Summary

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| **Scorecard to DB** | ✅ Working | index.html:32152 | Saves all round data |
| **Handicap Update** | ✅ Working | index.html:32731 | Auto-calculates & saves |
| **Society Event Link** | ✅ Working | index.html:32388 | Via society_event_id |
| **Organizer View** | ✅ Working | index.html:41937 | Real-time leaderboard |
| **Score Distribution** | ✅ Working | index.html:32352 | All group players |
| **Golfer History UI** | ⚠️ Needs Fix | index.html:26555 | Uses localStorage only |

---

## 11. Next Steps

1. **Immediate:** Fix golfer history to query database instead of localStorage
2. **Short-term:** Add round detail modal with hole-by-hole view
3. **Long-term:** Migrate old localStorage rounds to database

---

**Report Generated:** October 18, 2025
**Platform Version:** 2.1.0
**Audit Completed By:** Claude Code
