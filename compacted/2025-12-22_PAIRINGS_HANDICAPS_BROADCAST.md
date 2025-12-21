# Pairings Current Handicaps & Broadcast Message System

**Date:** December 22, 2025
**Session:** Fix stale handicaps in pairings + add broadcast messaging for organizers

---

## Problem Statement

1. **Stale Handicaps:** Pairings showed handicaps captured at registration time, not current handicaps from `society_handicaps` table. Critical for golfers who need accurate playing handicaps.

2. **No Event Info in Notifications:** Pairings LINE notifications only showed the pairings list, missing event details like date, course, tee time, departure.

3. **No Broadcast Feature:** Organizers had no way to send group messages to all registered players for announcements like departure time changes, venue changes, etc.

---

## Solution Overview

### 1. Current Handicaps in Pairings

**New Function: `fetchCurrentHandicaps()`** - Lines ~73023-73107

```javascript
async fetchCurrentHandicaps() {
    // Collect player IDs from pairings AND registrations
    const playerIds = [];

    // From pairings groups
    if (this.pairingsData?.groups) {
        this.pairingsData.groups.forEach(group => {
            (group.players || []).forEach(p => {
                if (p.playerId?.startsWith('U')) playerIds.push(p.playerId);
            });
        });
    }

    // From registrations (for unassigned players)
    if (this.registrations) {
        this.registrations.forEach(r => {
            const pid = r.lineUserId || r.player_id || r.playerId;
            if (pid?.startsWith('U')) playerIds.push(pid);
        });
    }

    // Determine society from event title OR AppState.selectedSociety
    const eventTitle = event?.title || event?.name || '';
    const selectedSociety = window.AppState?.selectedSociety;

    if (eventTitle.includes('trgg') || selectedSociety?.name?.includes('travellers rest')) {
        societyId = '7c0e4b72-d925-44bc-afda-38259a7ba346'; // TRGG
    } else if (eventTitle.includes('joa') || selectedSociety?.name?.includes('joa')) {
        societyId = '72d8444a-56bf-4441-86f2-22087f0e6b27'; // JOA
    }

    // Query society_handicaps table
    const { data } = await window.SupabaseDB.client
        .from('society_handicaps')
        .select('golfer_id, society_id, handicap_index')
        .in('golfer_id', playerIds);

    // Priority: society-specific > universal > registration value
    playerIds.forEach(pid => {
        const societyRecord = playerRecords.find(r => r.society_id === societyId);
        const universalRecord = playerRecords.find(r => r.society_id === null);

        if (societyRecord) {
            handicapMap[pid] = societyRecord.handicap_index; // ✅ SOCIETY
        } else if (universalRecord) {
            handicapMap[pid] = universalRecord.handicap_index; // ⚠️ Universal fallback
        }
    });

    return handicapMap;
}
```

**Integration Points:**

1. **loadEventData()** - Pre-fetches handicaps when event is selected:
   ```javascript
   this.currentHandicaps = await this.fetchCurrentHandicaps();
   ```

2. **renderPairings()** - Uses cached handicaps for UI display:
   ```javascript
   const hcp = this.currentHandicaps?.[p.playerId] || p.handicap;
   ```

3. **generatePairingSheetText()** - Now async, fetches fresh handicaps:
   ```javascript
   async generatePairingSheetText() {
       const currentHandicaps = await this.fetchCurrentHandicaps();
       // Uses currentHandicaps[p.playerId] for each player
   }
   ```

4. **printPairingSheet()** - Now async, uses current handicaps

---

### 2. Event Info in Pairings Notifications

**Updated `sharePairingsToLine()`** - Lines ~73288-73350

Now includes event header before pairings:

```
📋 PAIRINGS ANNOUNCED

🏌️ TRGG - December Monthly Medal
📅 Saturday, 28 December
⛳ Treasure Hill Golf & Country Club
🚐 Departure: 06:30
⏰ Tee Time: 08:00
──────────────────────────────

Group 1 ⏰ 07:00
  • Pete Park (2.8)
  • Alan Thomas (11.9)
  • Tristan Gilbert (11.0)
  • Billy Shepley (7.8)
```

---

### 3. Broadcast Message System

**New Functions:**

| Function | Description |
|----------|-------------|
| `openBroadcastModal()` | Opens modal with quick templates |
| `closeBroadcastModal()` | Closes the modal |
| `applyBroadcastTemplate(type)` | Fills textarea with template |
| `sendBroadcastMessage()` | Sends message to all registered players |

**Quick Templates Available:**

| Template | Icon | Use Case |
|----------|------|----------|
| `departure` | 🚐 | Departure time change |
| `teetime` | ⏰ | Tee time change |
| `venue` | ⛳ | Venue/course change |
| `cancel` | ❌ | Event cancelled |
| `reminder` | 📌 | Day-before reminder |
| `weather` | 🌧️ | Weather update |

**Template Example (Departure):**
```
🚐 DEPARTURE TIME UPDATE

The departure time has been changed.

New Departure: [NEW TIME]
Previous: 06:30

Please be at the meeting point 10 minutes early.
```

**Message Format Sent:**
```
📢 EVENT UPDATE

🏌️ TRGG - December Monthly Medal
📅 Saturday, 28 December
──────────────────────────────

[User's message content]
```

**UI Button Added:**

Location: Registrations tab header, next to Add/Export buttons

```html
<button onclick="RegistrationsManager.openBroadcastModal()"
        class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg">
    <span class="material-symbols-outlined">campaign</span>
    Broadcast
</button>
```

---

## Society Detection Logic

The system now uses multiple sources to determine which society's handicaps to use:

```javascript
// Priority order:
1. Event title contains "TRGG" or "Travellers Rest"
2. Event title contains "JOA" or "Japan Open"
3. AppState.selectedSociety.name contains society name
4. Fallback to universal handicaps
```

**Society IDs:**

| Society | UUID |
|---------|------|
| TRGG (Travellers Rest) | `7c0e4b72-d925-44bc-afda-38259a7ba346` |
| JOA (Japan Open Amateur) | `72d8444a-56bf-4441-86f2-22087f0e6b27` |

---

## Console Debug Logging

Added detailed logging to diagnose handicap issues:

```
[Pairings] Fetching handicaps for 4 players
[Pairings] Event: "TRGG - Monthly Medal", Selected Society: "Travellers Rest Golf Group", Society ID: 7c0e4b72-...
[Pairings] Player IDs: ["U2b6d976f...", "U533f2301...", ...]
[Pairings] Fetched 7 handicap records from database
[Pairings] Player U2b6d976f... has 2 records: [{society_id: "7c0e4b72-...", hcp: 2.8}, {society_id: null, hcp: 3.2}]
[Pairings] ✅ U2b6d976f...: Using SOCIETY handicap: 2.8
[Pairings] Final handicap map: {U2b6d976f...: "2.8", ...}
```

---

## Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | fetchCurrentHandicaps(), async generatePairingSheetText(), async printPairingSheet(), renderPairings() with currentHandicaps, sharePairingsToLine() with event header, broadcast modal + functions, Broadcast button |

---

## Git Commits

```
ae30961f fix: Pairings now show current handicaps from society_handicaps table
6a3acabd fix: Pairings panel UI now shows current handicaps from database
4db26777 feat: Broadcast message + event info in pairings LINE notifications
e6d73537 fix: Use AppState.selectedSociety to determine society handicaps
```

---

## Testing Checklist

### Handicaps
- [ ] Pairings panel shows current handicaps (not registration-time)
- [ ] Print pairing sheet shows current handicaps
- [ ] LINE notifications show current handicaps
- [ ] TRGG events use TRGG-specific handicaps
- [ ] JOA events use JOA-specific handicaps
- [ ] Falls back to universal if no society record exists

### Broadcast Messages
- [ ] Broadcast button visible in Registrations header
- [ ] Modal opens with event info and player count
- [ ] Quick templates populate correctly with event details
- [ ] Custom message can be typed
- [ ] Confirmation dialog shows message preview
- [ ] Messages sent to all registered players via LINE
- [ ] Success/failure count displayed

### Pairings Notifications
- [ ] LINE notification includes event name
- [ ] Includes event date
- [ ] Includes course name
- [ ] Includes departure time (if set)
- [ ] Includes tee time (if set)
- [ ] Pairings list follows header

---

## Known Issues / Edge Cases

1. **Players without society handicap record:** Falls back to universal handicap. Console shows `⚠️ No society record, using universal`.

2. **Empty event title:** Now uses `AppState.selectedSociety` as backup detection method.

3. **Players without LINE accounts:** Broadcast skips them, shows count in success message.

---

## Architecture Flow

```
User clicks Registrations tab
    ↓
loadEventData(eventId)
    ↓
fetchCurrentHandicaps() ← Queries society_handicaps table
    ↓
this.currentHandicaps = {playerId: handicap, ...}
    ↓
renderPairings() uses this.currentHandicaps[p.playerId]
    ↓
User clicks Print/LINE
    ↓
generatePairingSheetText() fetches fresh handicaps
    ↓
Output uses currentHandicaps[p.playerId] || p.handicap
```

---

## Broadcast Flow

```
User clicks Broadcast button
    ↓
openBroadcastModal() creates modal with templates
    ↓
User selects template or types custom message
    ↓
User clicks Send
    ↓
sendBroadcastMessage()
    ↓
Builds message with event header
    ↓
Loops through registrations
    ↓
Calls line-push-notification Edge Function for each player
    ↓
Shows success/failure counts
```
