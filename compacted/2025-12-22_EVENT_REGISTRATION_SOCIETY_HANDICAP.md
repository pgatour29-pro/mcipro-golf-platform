# Event Registration Society Handicap Fix

**Date:** December 22, 2025
**Issue:** Event registration was using universal handicap instead of society-specific handicap

---

## Problem

When golfers registered for society events (e.g., TRGG), the registration form was pre-filled with their **universal handicap** from `user_profiles.profile_data.golfInfo.handicap` instead of their **society-specific handicap** from `society_handicaps`.

Example:
| Player | Universal HCP | TRGG Society HCP | Was Using |
|--------|---------------|------------------|-----------|
| Pete Park | 3.2 | 2.8 | 3.2 (wrong) |

---

## Root Cause

Two locations were reading handicaps from the wrong source:

### 1. Golfer Registration Form (`openEventDetail`)
```javascript
// BEFORE (broken) - Line 68754
const handicap = AppState.currentUser?.profile_data?.golfInfo?.handicap ||
                AppState.currentUser?.handicap;
```

### 2. Organizer Player Search (`searchPlayers`)
```javascript
// BEFORE (broken) - Line 42940
const hcpValue = p.handicap || golfInfo.handicap;
```

Both were reading from `user_profiles` (universal) instead of `society_handicaps` table.

---

## Fixes Applied

### Fix 1: Golfer Registration Form (lines 68796-68848)

**File:** `public/index.html`

```javascript
// Get SOCIETY-SPECIFIC handicap for this event's society
let handicap = null;
const golferId = AppState.currentUser?.lineUserId;

if (golferId && this.currentEvent) {
    // Determine society name from event - check multiple sources
    let eventSociety = this.currentEvent.societyName || this.currentEvent.organizerName || '';

    // If no society found, check event title for known prefixes
    if (!eventSociety && this.currentEvent.name) {
        const eventTitle = this.currentEvent.name;
        if (eventTitle.startsWith('TRGG') || eventTitle.includes('Travellers Rest')) {
            eventSociety = 'Travellers Rest Golf Group';
        } else if (eventTitle.startsWith('JOA') || eventTitle.includes('JOA Golf')) {
            eventSociety = 'JOA Golf Pattaya';
        }
    }

    // Get society ID if this is a society event
    if (eventSociety) {
        const { data: societyData } = await window.SupabaseDB.client
            .from('society_profiles')
            .select('id')
            .eq('society_name', eventSociety)
            .single();

        if (societyData?.id) {
            // Fetch society-specific handicap
            const { data: societyHcp } = await window.SupabaseDB.client
                .from('society_handicaps')
                .select('handicap_index')
                .eq('golfer_id', golferId)
                .eq('society_id', societyData.id)
                .order('last_calculated_at', { ascending: false })
                .limit(1)
                .single();

            if (societyHcp?.handicap_index !== undefined) {
                handicap = societyHcp.handicap_index;
            }
        }
    }

    // Fall back to universal handicap if no society handicap
    if (handicap === null) {
        handicap = AppState.currentUser?.profile_data?.golfInfo?.handicap ||
                  AppState.currentUser?.handicap;
    }
}
```

### Fix 2: Organizer Player Search (lines 42928-43017)

**File:** `public/index.html`

```javascript
// 1. Get society ID if societyName provided (for society-specific handicaps)
let societyId = null;
if (societyName) {
    const { data: societyData } = await window.SupabaseDB.client
        .from('society_profiles')
        .select('id')
        .eq('society_name', societyName)
        .single();
    societyId = societyData?.id || null;
}

// 2. Search ALL user_profiles globally
const { data, error } = await query.limit(50);

if (!error && data) {
    // Fetch society-specific handicaps for all found players in one query
    let societyHandicapsMap = {};
    if (societyId && data.length > 0) {
        const playerIds = data.map(p => p.line_user_id);
        const { data: societyHcps } = await window.SupabaseDB.client
            .from('society_handicaps')
            .select('golfer_id, handicap_index')
            .eq('society_id', societyId)
            .in('golfer_id', playerIds)
            .order('last_calculated_at', { ascending: false });

        if (societyHcps) {
            societyHcps.forEach(h => {
                if (!societyHandicapsMap[h.golfer_id]) {
                    societyHandicapsMap[h.golfer_id] = h.handicap_index;
                }
            });
        }
    }

    data.forEach(p => {
        // PRIORITY: Society handicap > Universal handicap > Fallback
        let handicap = 36;
        const societyHcp = societyHandicapsMap[p.line_user_id];
        if (societyHcp !== undefined) {
            handicap = societyHcp;
        } else {
            // Fall back to universal handicap
            const hcpValue = p.handicap || golfInfo.handicap;
            if (hcpValue !== undefined) {
                handicap = parseFloat(hcpValue) || 36;
            }
        }
        // ... rest of player mapping
    });
}
```

---

## Handicap Priority Order

1. **Society handicap** from `society_handicaps` table (e.g., TRGG-specific)
2. **Universal handicap** from `user_profiles.profile_data.golfInfo.handicap`
3. **Fallback** (36)

---

## Society Detection Logic

Events may not always have `societyName` or `organizerName` populated. Added fallback detection from event title:

```javascript
if (!eventSociety && this.currentEvent.name) {
    const eventTitle = this.currentEvent.name;
    if (eventTitle.startsWith('TRGG') || eventTitle.includes('Travellers Rest')) {
        eventSociety = 'Travellers Rest Golf Group';
    } else if (eventTitle.startsWith('JOA') || eventTitle.includes('JOA Golf')) {
        eventSociety = 'JOA Golf Pattaya';
    }
}
```

---

## Data Status

| Metric | Count |
|--------|-------|
| TRGG Active Members | 1,074 |
| Members with TRGG Society Handicap | 4 |

**Players with society handicaps:**
- Pete Park: 2.8 (universal: 3.2)
- Alan Thomas: 11.6 (universal: 12.2)
- Tristan Gilbert: 11.1 (universal: 13.2)
- Billy Shepley: 7.8 (universal: 7.8)

**For other members:** Falls back to universal handicap. Society handicaps are created when organizers manually adjust them or as the system naturally builds them over time.

---

## Git Commits

```
e205b4d8 fix: Event registration now uses society-specific handicaps
4d04409e fix: Detect society from event title when societyName/organizerName empty
```

---

## Console Logging

When opening registration:
```
[GolferEventsSystem] Registration - Event society: Travellers Rest Golf Group | Event name: TRGG Monthly Medal
[GolferEventsSystem] Using SOCIETY handicap: 2.8 for Travellers Rest Golf Group
```

When searching players (organizer):
```
[SocietyGolf] Society ID for handicap lookup: 7c0e4b72-d925-44bc-afda-38259a7ba346
[SocietyGolf] Loaded society handicaps for 4 players
[SocietyGolf] Using SOCIETY handicap for Pete Park : 2.8
```

---

## Related Files

- `compacted/2025-12-22_PLAYER_DIRECTORY_HANDICAP_FIX.md` - Similar fix for Player Directory
- `compacted/2025-12-22_HANDICAP_DISASTER.md` - Root cause of handicap data issues

---

## Testing Checklist

- [x] Golfer registration form pre-fills with society handicap
- [x] Falls back to universal if no society handicap exists
- [x] Organizer player search returns society handicaps
- [x] Event title detection works for TRGG/JOA events
- [x] Console logs show correct handicap source
