# Session 2025-10-18: Member Fees, Pairings & Print System
## Complete Implementation Documentation

---

## DEPLOYMENT INFO

**Session Date**: October 18, 2025 (Part 3)
**Live URL**: https://mycaddipro.com
**Final Deploy ID**: 68f333a36870f1da918e448d
**Cache Version**: mcipro-v2025-10-18-print-realtime-pairings

**Git Commits**:
- fa838cec - Add member/non-member fee structure and auto-calculation
- 7498d6af - Fix critical bug: Total fees not displaying in roster
- 1145db71 - Fix Mark Paid button and add Super Admin permission
- 4ce4a987 - Fix event editing + Add drag-and-drop 2-man scramble grouping
- 8027ff99 - Add print tee sheet + real-time pairing display for golfers

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Feature 1: Member/Non-Member Fee Structure](#feature-1-membernon-member-fee-structure)
3. [Feature 2: Bug Fixes](#feature-2-bug-fixes)
4. [Feature 3: Drag-and-Drop 2-Man Scramble Grouping](#feature-3-drag-and-drop-2-man-scramble-grouping)
5. [Feature 4: Print Tee Sheet](#feature-4-print-tee-sheet)
6. [Feature 5: Real-Time Golfer Pairing View](#feature-5-real-time-golfer-pairing-view)
7. [Database Changes](#database-changes)
8. [Code Changes](#code-changes)
9. [Testing Guide](#testing-guide)
10. [Known Issues & Future Enhancements](#known-issues--future-enhancements)

---

## OVERVIEW

### What Was Completed

This session implemented a complete payment and pairing system for society golf events:

**Payment System**:
- ✅ Member vs non-member pricing structure
- ✅ Auto fee calculation at registration
- ✅ Editable fees in roster
- ✅ Fee recalculation utility for existing events
- ✅ Payment tracking with Super Admin controls

**Pairing System**:
- ✅ Drag-and-drop interface for 2-man scramble
- ✅ 4-ball grouping for tee times
- ✅ Print-friendly tee sheets
- ✅ Real-time pairing display for golfers

### User Problem Solved

**Original Issue**:
> "When I click on the registration, why is there no total fee? The total fee is what's been set in the events creation. Also members pay that fee, but non-members pay an extra ฿1000. And that needs to be factored into the event creation too."

**Additional Request**:
> "In that pairing modal I need a print button, most societies still want a hard copy of the final tee sheet to take to the golf course. And as the pairings are being set up in real-time the golfers need to see this on their events page."

---

## FEATURE 1: MEMBER/NON-MEMBER FEE STRUCTURE

### 1.1 Problem Statement

**Before**:
- Events had 5 separate fee fields (green fee, cart fee, caddy fee, transport, competition)
- No distinction between member and non-member pricing
- Total fees were NOT calculated or saved to registrations
- Revenue tracking showed ฿0.00

**User Need**:
- Members pay base fee (e.g., ฿2,250)
- Non-members pay base fee + additional charge (e.g., +฿1,000 = ฿3,250)
- Fees should calculate automatically at registration
- Organizers should be able to edit fees before marking as paid

### 1.2 Solution Implemented

#### Event Creation Form Redesign

**Old Structure**:
```
Green Fee:      ฿2,250
Cart Fee:       ฿0
Caddy Fee:      ฿0
Transport Fee:  ฿0
Competition:    ฿0
```

**New Structure**:
```
┌─────────────────────────────────────┐
│ Member Fee (All-Inclusive): ฿2,250 │
│ Non-Member Additional Fee:  ฿1,000 │
├─────────────────────────────────────┤
│ Optional Add-Ons:                   │
│ - Transport Fee:     ฿0            │
│ - Competition Fee:   ฿0            │
│ - Other Fee:         ฿0            │
└─────────────────────────────────────┘
```

**Benefits**:
- Clearer for organizers
- Easier to understand pricing
- Reduces confusion about "included" fees

#### Auto Fee Calculation

**When**: Player registers for an event

**Process**:
1. Get event details (member_fee, non_member_fee, optional fees)
2. Check if player is a society member
3. Calculate total:
   - **Member**: member_fee + optional fees selected
   - **Non-Member**: member_fee + non_member_fee + optional fees selected
4. Save total_fee to database automatically

**Code Location**: `index.html:29116-29190` (`registerPlayer()`)

**Example Calculation**:
```javascript
// Event: member_fee = ฿2,250, non_member_fee = ฿1,000
// Player: Society member, wants competition (฿500)

const isMember = await checkSocietyMembership(playerId, societyName);
// isMember = true

let totalFee = isMember ? 2250 : (2250 + 1000);  // ฿2,250
if (wantCompetition) totalFee += 500;            // ฿2,750

// Saved to event_registrations.total_fee = 2750
```

#### Editable Fees in Roster

**Location**: Society Organizer → Events → View Roster

**How It Works**:
1. Total fee is displayed as clickable button
2. Click to edit → Prompt appears
3. Enter new amount → Saves to database
4. Revenue calculations update automatically

**Code**: `index.html:36440` (clickable fee), `index.html:35699-35738` (`editPlayerFee()`)

**Use Cases**:
- Adjust for special discounts
- Add extra fees (e.g., late registration)
- Correct calculation errors
- Handle special arrangements

#### Fee Recalculation Utility

**Purpose**: Update existing events that have ฿0.00 fees

**Method 1: Browser Console**
```javascript
// Find event ID
const events = await SocietyGolfDB.getEvents(AppState.currentUser.lineUserId);
console.table(events.map(e => ({ Name: e.name, Date: e.date, ID: e.id })));

// Recalculate fees for specific event
await SocietyGolfDB.recalculateEventFees('EVENT_ID_HERE');
```

**Method 2: Batch All Events**
```javascript
const events = await SocietyGolfDB.getEvents(AppState.currentUser.lineUserId);
for (const event of events) {
    await SocietyGolfDB.recalculateEventFees(event.id);
}
```

**What It Does**:
- Fetches event fees (member_fee, non_member_fee)
- Checks each player's membership status
- Calculates correct fee for each player
- Updates database
- Returns detailed report

**Output Example**:
```
[FeeRecalculation] Event: Burapha
[FeeRecalculation] Member Fee: ฿2250
[FeeRecalculation] Non-Member Fee: ฿1000
[FeeRecalculation] Found 4 registrations
[FeeRecalculation] Pete Park: MEMBER → ฿2250.00
[FeeRecalculation] Billy Shepley: NON-MEMBER → ฿3250.00
[FeeRecalculation] Tristan Gilbert: NON-MEMBER → ฿3250.00
[FeeRecalculation] Brett Jones: NON-MEMBER → ฿3250.00
[FeeRecalculation] ✅ Complete! Updated: 4, Skipped: 0
```

**Code**: `index.html:29942-30047` (`recalculateEventFees()`)

### 1.3 Database Schema Changes

**SQL File**: `sql/add-member-nonmember-fees.sql`

**Changes**:
```sql
ALTER TABLE society_events
    ADD COLUMN IF NOT EXISTS member_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS non_member_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS other_fee DECIMAL(10,2) DEFAULT 0.00;

-- Migrate existing data
UPDATE society_events
SET member_fee = COALESCE(base_fee, 0)
WHERE member_fee = 0 AND base_fee > 0;
```

**Backwards Compatibility**:
- Old fee fields kept (base_fee, cart_fee, caddy_fee)
- Events created before update continue to work
- Migration auto-converts base_fee → member_fee

### 1.4 Files Modified

**index.html**:
- Lines 24278-24312: Event creation form (new fee fields)
- Lines 35761-35781: `saveEvent()` collects new fee fields
- Lines 28850-28885: `createEvent()` saves to database
- Lines 28903-28918: `updateEvent()` updates fees
- Lines 29116-29190: `registerPlayer()` auto-calculates fees
- Lines 29174-29190: `checkSocietyMembership()` checks member status
- Lines 28772-28807: `getEvents()` includes new fee fields
- Lines 28823-28855: `getEvent()` includes new fee fields
- Lines 29922-29940: `updateRegistrationFee()` updates individual fees
- Lines 29942-30047: `recalculateEventFees()` batch fee calculation

**sw.js**:
- Line 4: Cache version updated

**sql/add-member-nonmember-fees.sql**: New file
**sql/recalculate-event-fees.md**: New documentation file

---

## FEATURE 2: BUG FIXES

### 2.1 Critical Bug: Fees Not Displaying in Roster

**Problem**:
- Fees were saved to database (confirmed via console)
- Roster showed ฿0.00 for all players
- Payment tracking non-functional

**Root Cause**:
```javascript
// getRegistrations() function (index.html:29096-29107)
return (data || []).map(r => ({
    id: r.id,
    playerName: r.player_name,
    handicap: r.handicap,
    // ❌ Missing payment fields!
}));
```

**Fix**:
```javascript
return (data || []).map(r => ({
    id: r.id,
    playerName: r.player_name,
    handicap: r.handicap,
    // ✅ Added payment tracking fields
    total_fee: r.total_fee || 0,
    payment_status: r.payment_status || 'unpaid',
    amount_paid: r.amount_paid || 0,
    paid_at: r.paid_at,
    paid_by: r.paid_by
}));
```

**Impact**: Roster now correctly displays all fee and payment information

**Code**: `index.html:29096-29113`

### 2.2 Bug: "Mark Paid" Button Not Working

**Problem**:
- Button appeared but clicking did nothing
- No console errors
- No visual feedback

**Root Causes**:
1. **Field name mismatch**: Used `reg.player_id` (database field) but data was mapped to `reg.playerId` (camelCase)
2. **Scope issue**: `this.currentRosterEvent?.id` was undefined in template context

**Fix**:
```javascript
// Before
onclick="SocietyOrganizerSystem.togglePayment('${this.currentRosterEvent?.id}', '${reg.player_id}', true)"

// After
const eventId = this.currentRosterEvent?.id;  // Store in variable
onclick="SocietyOrganizerSystem.togglePayment('${eventId}', '${reg.playerId}', true)"
```

**Code**: `index.html:36414-36472` (`renderConfirmedPlayers()`)

### 2.3 Feature: Super Admin Permission for Unmarking

**User Requirement**:
> "Only individual that can remove the Mark Paid is the Super Admin if it needs to be unmarked"

**Implementation**:
```javascript
// Check if current user is event organizer (Super Admin)
const isSuperAdmin = AppState.currentUser?.lineUserId === this.currentRosterEvent?.organizerId;

// Only show unmark button for Super Admin
${isPaid ? `
    <span class="px-2 py-1 bg-green-100 text-green-700">PAID</span>
    ${isSuperAdmin ? `
        <button onclick="...togglePayment(..., false)">×</button>
    ` : ''}
` : `
    <button onclick="...togglePayment(..., true)">Mark Paid</button>
`}
```

**Permission Logic**:
- **Everyone**: Can mark as paid
- **Super Admin (Event Organizer)**: Can mark as paid AND unmark
- **Regular Organizers**: Can mark as paid only

**Code**: `index.html:36425` (permission check), `index.html:36451-36456` (conditional button)

### 2.4 Bug: Event Editing Broken

**Problem**:
- After implementing new fee structure, event editing stopped working
- Clicking "Edit Event" showed empty form or errors
- Event data not populating

**Root Cause**:
```javascript
// showEventForm() tried to populate old fields
document.getElementById('eventBaseFee').value = event.baseFee || 0;
document.getElementById('eventCartFee').value = event.cartFee || 0;
// ❌ These fields don't exist anymore!
```

**Fix**:
```javascript
// Populate new fee fields (with backwards compatibility)
document.getElementById('eventMemberFee').value = event.memberFee || event.baseFee || 0;
document.getElementById('eventNonMemberFee').value = event.nonMemberFee || 0;
document.getElementById('eventTransportFee').value = event.transportFee || 0;
document.getElementById('eventCompetitionFee').value = event.competitionFee || 0;
document.getElementById('eventOtherFee').value = event.otherFee || 0;
```

**Also Fixed**:
- `getEvents()` mapping to include new fee fields
- `getEvent()` mapping to include new fee fields
- Create mode clearing to use new fields

**Code**:
- `index.html:35926-35943`: Edit mode population
- `index.html:35965-35982`: Create mode clearing
- `index.html:28772-28807`: `getEvents()` mapping
- `index.html:28823-28855`: `getEvent()` mapping

---

## FEATURE 3: DRAG-AND-DROP 2-MAN SCRAMBLE GROUPING

### 3.1 Problem Statement

**User Need**:
> "Managing pairings for 2-man scramble but a group consist of 4 players in a group, so while creating the 2-man team it still needs to put other teams into a single group. Create a drag and drop for the block with a team and put it into one block to make a 4 ball group and label it Group 1."

**Golf Context**:
- **2-Man Scramble**: Players form teams of 2
- **Tee Times**: Golf courses use 4-ball groups (4 players per tee time)
- **Challenge**: Need to organize 2-man teams into 4-ball groups

**Example**:
```
8 Players → 4 Teams → 2 Groups (for tee times)

Team 1: Pete + Donald
Team 2: Billy + Brett      } → Group 1 (4 players)

Team 3: John + Tom
Team 4: Mark + Steve       } → Group 2 (4 players)
```

### 3.2 Solution: Drag-and-Drop Interface

#### Visual Layout

```
┌─────────────────────────────────────────────────────┐
│  4-Ball Groups (Tee Times)          [Add Group]     │
├─────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │  Group 1     [×] │  │  Group 2     [×] │         │
│  ├──────────────────┤  ├──────────────────┤         │
│  │ Team A  Avg:16.5 │  │ ┌──────────────┐ │         │
│  │ Pete Park   18   │  │ │Drop Team A   │ │         │
│  │ Donald Duck 15   │  │ │here          │ │         │
│  ├──────────────────┤  │ └──────────────┘ │         │
│  │ Team B  Avg:14.0 │  │ ┌──────────────┐ │         │
│  │ Billy Shepley 12 │  │ │Drop Team B   │ │         │
│  │ Brett Jones  16  │  │ │here          │ │         │
│  └──────────────────┘  └──────────────────┘         │
├─────────────────────────────────────────────────────┤
│  Teams (2-Man Scramble) - Drag to assign to groups  │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐       │
│  │ Team 3  ←  │ │ Team 4  ←  │ │ Team 5  ←  │  Drag │
│  │ Avg: 15.0  │ │ Avg: 18.5  │ │ Avg: 12.0  │       │
│  │ John   14  │ │ Mark   19  │ │ Tom    10  │       │
│  │ Tom    16  │ │ Steve  18  │ │ Jerry  14  │       │
│  └────────────┘ └────────────┘ └────────────┘       │
└─────────────────────────────────────────────────────┘
```

#### How It Works

**Step 1: Create Teams**
1. Select "2-Man Scramble" format
2. Click "Auto-Pair" → Creates teams of 2

**Step 2: Create Groups**
1. Click "Add Group" button
2. Empty group appears with 2 slots (Team A, Team B)
3. Repeat for each tee time needed

**Step 3: Assign Teams**
1. Drag team card from bottom section
2. Hover over group → Green highlight
3. Drop into Team A or Team B slot
4. Team appears in group

**Step 4: Manage**
- **Remove team**: Click × next to team name
- **Remove group**: Click Remove button on group
- Teams return to unassigned pool

**Step 5: Save**
- Click "Save Pairings"
- 4-ball groups saved to database
- Persists across sessions

### 3.3 Data Structure

**Database Storage**:
```javascript
{
  groupSize: 2,
  groups: [                    // Teams (2-player pairs)
    [player1, player2],        // Team 0
    [player3, player4],        // Team 1
    [player5, player6],        // Team 2
    [player7, player8]         // Team 3
  ],
  fourBallGroups: [            // 4-ball tee time groups
    {
      teamIndices: [0, 1]      // Group 1: Team 0 + Team 1
    },
    {
      teamIndices: [2, 3]      // Group 2: Team 2 + Team 3
    }
  ]
}
```

**Why This Structure**:
- `groups` = Teams (preserve team pairings)
- `fourBallGroups` = Reference to teams by index
- Allows teams to be reused/reassigned
- Compact storage

### 3.4 Implementation Details

#### New Functions

**`render2ManScramblePairings()`** - `index.html:37382-37429`
- Detects 2-man scramble format
- Renders 4-ball groups at top
- Renders unassigned teams at bottom
- Handles empty states

**`render4BallGroup()`** - `index.html:37432-37498`
- Renders single group container
- Shows 2 team slots (Team A, Team B)
- Displays players in each team
- Handles empty slots (dashed borders)

**`renderDraggableTeam()`** - `index.html:37501-37524`
- Renders team card
- Sets draggable attribute
- Shows average handicap
- Player names and handicaps

**Drag-and-Drop Handlers**:
- `handleTeamDragStart()` - `index.html:37527-37530`
- `handleTeamDragEnd()` - `index.html:37532-37534`
- `allowDrop()` - `index.html:37536-37539`
- `handleDragLeave()` - `index.html:37541-37543`
- `handleTeamDrop()` - `index.html:37545-37558`

**Group Management**:
- `add4BallGroup()` - `index.html:37560-37567`
- `remove4BallGroup()` - `index.html:37569-37574`
- `removeTeamFromGroup()` - `index.html:37576-37583`

#### Visual Feedback

**During Drag**:
```javascript
ondragstart: team.style.opacity = '0.5'  // Semi-transparent
ondragover: group.classList.add('bg-green-50')  // Green highlight
ondragleave: group.classList.remove('bg-green-50')  // Remove highlight
ondragend: team.style.opacity = '1'  // Restore opacity
```

**States**:
- **Dragging**: Team becomes translucent
- **Over Drop Zone**: Group highlights green
- **Dropped**: Team appears in slot
- **Full Group**: Warning message (2 teams max)

### 3.5 Persistence

**Save**:
```javascript
await SocietyGolfDB.savePairings(eventId, {
    groupSize: 2,
    groups: [...teams],
    fourBallGroups: [...groupAssignments]
});
```

**Load**:
```javascript
const pairings = await SocietyGolfDB.getPairings(eventId);
this.currentPairings.groups = pairings.groups;
this.currentPairings.fourBallGroups = pairings.fourBallGroups;
```

**Auto-Load**: When opening pairings modal, existing 4-ball groups restore automatically

---

## FEATURE 4: PRINT TEE SHEET

### 4.1 Purpose

**User Need**:
> "I need a print button, most societies still want a hard copy of the final tee sheet to take to the golf course."

**Use Case**:
- Organizer creates pairings on website
- Prints tee sheet at home
- Brings hard copy to golf course
- Gives to pro shop or keeps for reference

### 4.2 Implementation

#### Button Location
- **Pairings Modal** → Bottom action buttons
- Changed "Export PDF" → "Print Tee Sheet"
- Code: `index.html:25547-25550`

#### Print Process

**User Action**:
1. Click "Print Tee Sheet" button
2. New window opens with formatted document
3. Print dialog appears automatically
4. User prints or saves as PDF

**Code Flow**:
```javascript
printTeeSheet() {
    // 1. Generate HTML with embedded CSS
    const printHTML = `<!DOCTYPE html>...</html>`;

    // 2. Open new window
    const printWindow = window.open('', '_blank');

    // 3. Write HTML
    printWindow.document.write(printHTML);
    printWindow.document.close();

    // 4. Auto-trigger print
    setTimeout(() => printWindow.print(), 250);
}
```

**Code**: `index.html:37641-37851` (`printTeeSheet()`)

### 4.3 Print Layout

#### Header Section
```
┌────────────────────────────────────────────┐
│         Burapha Two-Man Scramble           │
│────────────────────────────────────────────│
│  Date: Friday, October 24, 2025           │
│  Course: Burapha Golf Club                │
│  Start Time: 07:00                        │
│  Format: 2-Man Scramble                   │
└────────────────────────────────────────────┘
```

#### Regular Groups (Strokeplay)
```
┌────────────────────────────────┐
│  Group 1      Avg HCP: 16.5    │
├────────────────────────────────┤
│  Pete Park              HCP 18 │
│  Donald Duck            HCP 15 │
│  Billy Shepley          HCP 12 │
│  Brett Jones            HCP 21 │
└────────────────────────────────┘

┌────────────────────────────────┐
│  Group 2      Avg HCP: 14.2    │
├────────────────────────────────┤
│  John Smith             HCP 16 │
│  Tom Brown              HCP 12 │
│  Mark Wilson            HCP 15 │
│  Steve Davis            HCP 14 │
└────────────────────────────────┘
```

#### 2-Man Scramble with 4-Ball Groups
```
┌─────────────────────────────────────┐
│  Group 1                            │
├─────────────────────────────────────┤
│  Team A           Avg HCP: 16.5     │
│  Pete Park                   HCP 18 │
│  Donald Duck                 HCP 15 │
├─────────────────────────────────────┤
│  Team B           Avg HCP: 14.0     │
│  Billy Shepley               HCP 12 │
│  Brett Jones                 HCP 16 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Group 2                            │
├─────────────────────────────────────┤
│  Team A           Avg HCP: 15.0     │
│  John Smith                  HCP 16 │
│  Tom Brown                   HCP 14 │
├─────────────────────────────────────┤
│  Team B           Avg HCP: 13.5     │
│  Mark Wilson                 HCP 15 │
│  Steve Davis                 HCP 12 │
└─────────────────────────────────────┘
```

#### Footer
```
Generated by MyCaddy Pro - 10/18/2025, 2:45:30 PM
```

### 4.4 CSS Styling

**Print-Specific Rules**:
```css
@media print {
    body { margin: 0; }
    @page { margin: 1cm; }
}
```

**Features**:
- **page-break-inside: avoid** - Groups won't split across pages
- **Professional typography** - Arial, proper sizing
- **Color coding** - Green headers, purple teams
- **Border styling** - Rounded corners, clean lines
- **Responsive layout** - Works on any paper size

**Code**: `index.html:37657-37746` (embedded styles)

### 4.5 Print Content Generation

**Regular Format**:
```javascript
this.currentPairings.groups.forEach((group, groupIndex) => {
    const avgHandicap = group.reduce((sum, p) => sum + p.handicap, 0) / group.length;
    printHTML += `<div class="group">
        <div class="group-header">Group ${groupIndex + 1} <span>Avg HCP: ${avgHandicap.toFixed(1)}</span></div>
        ${group.map(player => `
            <div class="player">
                <span>${player.playerName}</span>
                <span>HCP ${Math.round(player.handicap)}</span>
            </div>
        `).join('')}
    </div>`;
});
```

**2-Man Scramble Format**:
```javascript
this.currentPairings.fourBallGroups.forEach((group, groupIdx) => {
    const team1 = pairings.groups[group.teamIndices[0]];
    const team2 = pairings.groups[group.teamIndices[1]];

    printHTML += `<div class="group">
        <div class="group-header">Group ${groupIdx + 1}</div>
        <div class="team">
            <div class="team-label">Team A <span>Avg HCP: ${avgHcp1}</span></div>
            ${team1.map(player => ...)}
        </div>
        <div class="team">
            <div class="team-label">Team B <span>Avg HCP: ${avgHcp2}</span></div>
            ${team2.map(player => ...)}
        </div>
    </div>`;
});
```

---

## FEATURE 5: REAL-TIME GOLFER PAIRING VIEW

### 5.1 Purpose

**User Need**:
> "As the pairings are being set up in real-time the golfers need to see this on their events page."

**Use Case**:
- Organizer creates pairings
- Saves to database
- Golfers open event details
- See their group assignment in real-time
- Know who they're playing with

### 5.2 Where It Appears

**Location**: Event Detail Modal (when golfer clicks on event)

**Path**:
1. Golfer → Society Events
2. Browse events
3. Click on event card
4. Modal opens with event details
5. **"Your Group Assignment"** section appears

**Code**: `index.html:25662-25671` (HTML section)

### 5.3 Display States

#### State 1: No Pairings
```
[ Section is hidden ]
```
- Organizer hasn't created pairings yet
- Section doesn't display at all
- No error, no empty state

#### State 2: Pairings Exist, Player Not Assigned
```
┌──────────────────────────────────────────┐
│ Your Group Assignment                    │
├──────────────────────────────────────────┤
│             ⚠️                           │
│                                          │
│  Pairings have been set, but you're not │
│  assigned to a group yet.               │
│                                          │
│  Contact the organizer if you should    │
│  be included.                           │
└──────────────────────────────────────────┘
```
- Pairings exist but player not in any group
- Clear message to contact organizer
- Prevents confusion

#### State 3: Regular Group Assignment
```
┌──────────────────────────────────────────┐
│ Your Group Assignment        4 Players   │
├──────────────────────────────────────────┤
│ Group 3                                  │
│                                          │
│ 👉 Pete Park                    HCP 18  │  ← You
│    Donald Duck                  HCP 15  │
│    Billy Shepley                HCP 12  │
│    Brett Jones                  HCP 21  │
└──────────────────────────────────────────┘
```
- Shows group number
- Highlights your name in **bold green**
- **👉** pointer next to your name
- All groupmates with handicaps

#### State 4: 2-Man Scramble Assignment
```
┌───────────────────────────────────────────────┐
│ Your Group Assignment      2-Man Scramble     │
├───────────────────────────────────────────────┤
│ Group 1                                       │
│                                               │
│ Team A                                        │
│ 👉 Pete Park                         HCP 18  │  ← You
│    Donald Duck                       HCP 15  │
│                                               │
│ Team B                                        │
│    Billy Shepley                     HCP 12  │
│    Brett Jones                       HCP 16  │
└───────────────────────────────────────────────┘
```
- Shows format badge (2-Man Scramble)
- Shows 4-ball group number
- Breaks down Team A and Team B
- Highlights your name
- Shows all 4 players in tee time group

### 5.4 Implementation

#### Function: `loadGolferPairing()`

**Code**: `index.html:39581-39708`

**Process**:
```javascript
async loadGolferPairing(eventId) {
    // 1. Get pairings from database
    const pairings = await SocietyGolfDB.getPairings(eventId);

    // 2. Check if pairings exist
    if (!pairings || !pairings.groups.length) {
        section.style.display = 'none';  // Hide section
        return;
    }

    // 3. Get current player ID
    const currentPlayerId = AppState.currentUser?.lineUserId;

    // 4. Find player's group
    // Check 2-man scramble 4-ball groups
    if (pairings.fourBallGroups) {
        // Find team
        // Find which 4-ball group contains that team
    } else {
        // Regular format - find group directly
        groupIndex = pairings.groups.findIndex(group =>
            group.some(p => p.playerId === currentPlayerId)
        );
    }

    // 5. Render appropriate display
    if (is2ManScramble) {
        // Render 4-ball group with Team A/B
    } else {
        // Render regular group
    }

    // 6. Show section
    section.style.display = 'block';
}
```

#### Detection Logic

**2-Man Scramble Detection**:
```javascript
if (pairings.fourBallGroups && pairings.fourBallGroups.length > 0) {
    is2ManScramble = true;

    // Find player's team
    for (let teamIdx = 0; teamIdx < pairings.groups.length; teamIdx++) {
        const team = pairings.groups[teamIdx];
        if (team.some(p => p.playerId === currentPlayerId)) {
            // Found player's team

            // Find which 4-ball group contains this team
            for (let groupIdx = 0; groupIdx < pairings.fourBallGroups.length; groupIdx++) {
                const fourBallGroup = pairings.fourBallGroups[groupIdx];
                if (fourBallGroup.teamIndices.includes(teamIdx)) {
                    fourBallGroupIndex = groupIdx;  // Found it!
                    break;
                }
            }
            break;
        }
    }
}
```

**Regular Format Detection**:
```javascript
groupIndex = pairings.groups.findIndex(group =>
    group.some(p => p.playerId === currentPlayerId)
);
if (groupIndex !== -1) {
    myGroup = pairings.groups[groupIndex];
}
```

#### Player Highlighting

**Your Name**:
```javascript
${player.playerId === currentPlayerId ? 'font-bold text-green-600' : ''}
${player.playerId === currentPlayerId ? '👉 ' : ''}
```

**CSS Classes**:
- `font-bold` - Makes name bold
- `text-green-600` - Green color
- `👉` - Pointing emoji before name

### 5.5 Auto-Refresh

**When It Loads**:
- Every time golfer opens event detail modal
- Calls `loadGolferPairing(eventId)` automatically
- Code: `index.html:39501-39502`

**Integration**:
```javascript
async openEventDetail(eventId) {
    // ... load event details ...

    await this.loadRegisteredPlayers(eventId);
    await this.loadGolferPairing(eventId);  // ← Auto-load pairings

    // ... show modal ...
}
```

**Real-Time**:
- Organizer saves pairings → Database updated
- Golfer opens event → Fresh data loaded
- No manual refresh needed
- Always shows latest pairings

---

## DATABASE CHANGES

### New Columns

**Table**: `society_events`

```sql
ALTER TABLE society_events
    ADD COLUMN IF NOT EXISTS member_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS non_member_fee DECIMAL(10,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS other_fee DECIMAL(10,2) DEFAULT 0.00;
```

**Purpose**:
- `member_fee` - All-inclusive fee for society members
- `non_member_fee` - Additional charge for non-members
- `other_fee` - Miscellaneous fees (future use)

**Migration**:
```sql
UPDATE society_events
SET member_fee = COALESCE(base_fee, 0)
WHERE member_fee = 0 AND base_fee > 0;
```

### Existing Columns (Used)

**Table**: `event_registrations`

Already had these columns from previous session:
- `total_fee` DECIMAL(10,2)
- `payment_status` VARCHAR (paid/unpaid/partial)
- `amount_paid` DECIMAL(10,2)
- `paid_at` TIMESTAMP
- `paid_by` VARCHAR

Now properly populated by auto-calculation!

### Pairings Storage

**Table**: `event_pairings` (JSON column)

**Structure**:
```json
{
  "groupSize": 2,
  "groups": [
    [
      {"id": "...", "playerName": "Pete Park", "playerId": "...", "handicap": 18},
      {"id": "...", "playerName": "Donald Duck", "playerId": "...", "handicap": 15}
    ],
    ...
  ],
  "fourBallGroups": [
    {"teamIndices": [0, 1]},
    {"teamIndices": [2, 3]}
  ]
}
```

**New Field**: `fourBallGroups` (added in this session)

---

## CODE CHANGES

### Summary by File

**index.html** (~600 lines modified/added)

**Event Creation**:
- 24278-24312: Form fields redesigned
- 35761-35781: `saveEvent()` updated
- 35926-35943: `showEventForm()` edit mode
- 35965-35982: `showEventForm()` create mode

**Database Functions**:
- 28772-28807: `getEvents()` mapping
- 28823-28855: `getEvent()` mapping
- 28850-28885: `createEvent()` save
- 28903-28918: `updateEvent()` update
- 29096-29113: `getRegistrations()` payment fields
- 29116-29190: `registerPlayer()` auto-calculation
- 29174-29190: `checkSocietyMembership()`
- 29922-29940: `updateRegistrationFee()`
- 29942-30047: `recalculateEventFees()`

**Payment Tracking**:
- 35699-35738: `editPlayerFee()`
- 35740-35794: `togglePayment()` with logging
- 36414-36472: `renderConfirmedPlayers()` fixed

**Pairings - 2-Man Scramble**:
- 37258-37261: Detection and routing
- 37382-37429: `render2ManScramblePairings()`
- 37432-37498: `render4BallGroup()`
- 37501-37524: `renderDraggableTeam()`
- 37527-37534: Drag start/end handlers
- 37536-37543: Drop zone handlers
- 37545-37558: `handleTeamDrop()`
- 37560-37567: `add4BallGroup()`
- 37569-37574: `remove4BallGroup()`
- 37576-37583: `removeTeamFromGroup()`

**Print & Display**:
- 25547-25550: Print button
- 25662-25671: Golfer pairing section HTML
- 37641-37851: `printTeeSheet()`
- 39501-39502: Auto-load integration
- 39581-39708: `loadGolferPairing()`

**sw.js**:
- Line 4: Cache version (updated 5 times this session)

**New SQL Files**:
- `sql/add-member-nonmember-fees.sql`
- `sql/recalculate-event-fees.md`
- `sql/fix-budapaw-event-fees.sql`

---

## TESTING GUIDE

### Test 1: Member/Non-Member Fee System

**Setup**:
1. Create new event
2. Set Member Fee: ฿2,250
3. Set Non-Member Fee: ฿1,000
4. Save event

**Test A: Member Registration**:
1. Add player to society (Players tab)
2. Register that player for event
3. Open roster
4. **Expected**: Total Fee = ฿2,250

**Test B: Non-Member Registration**:
1. Register player NOT in society
2. Open roster
3. **Expected**: Total Fee = ฿3,250

**Test C: Optional Fees**:
1. Set Transport Fee: ฿500
2. Register player with transport
3. **Expected**: Total Fee = ฿2,250 + ฿500 = ฿2,750 (member) or ฿3,750 (non-member)

### Test 2: Editable Fees

1. Open roster
2. Click on total fee amount
3. Enter new value: ฿2,575
4. **Expected**: Fee updates, revenue recalculates

### Test 3: Payment Tracking

**As Organizer**:
1. Click "Mark Paid"
2. **Expected**: PAID badge, revenue updates

**As Super Admin** (Event Organizer):
1. Mark player as paid
2. See X button next to PAID badge
3. Click X
4. **Expected**: Reverts to unpaid

**As Regular Organizer** (Not event owner):
1. Mark player as paid
2. **Expected**: NO X button visible
3. Cannot unmark

### Test 4: Fee Recalculation

**Console Method**:
```javascript
// Find event
const events = await SocietyGolfDB.getEvents(AppState.currentUser.lineUserId);
console.table(events.map(e => ({ Name: e.name, ID: e.id })));

// Recalculate
const result = await SocietyGolfDB.recalculateEventFees('EVENT_ID');
console.table(result.results);
```

**Expected Output**:
```
Pete Park: MEMBER → ฿2250.00
Billy: NON-MEMBER → ฿3250.00
...
✅ Complete! Updated: 4, Skipped: 0
```

### Test 5: Event Editing

1. Click "Edit" on existing event
2. **Expected**: Form populates with current values
3. Change Member Fee to ฿2,500
4. Save
5. Reopen
6. **Expected**: Fee shows ฿2,500

### Test 6: Drag-and-Drop Pairings

1. Create 2-man scramble event
2. Register 8 players
3. Open "Manage Pairings"
4. Select "2-Man Scramble"
5. Click "Auto-Pair"
6. **Expected**: 4 teams created
7. Click "Add Group"
8. **Expected**: Empty group with 2 slots
9. Drag Team 1 card
10. **Expected**: Team becomes transparent, drop zones highlight
11. Drop on group
12. **Expected**: Team appears in Team A slot
13. Drag Team 2, drop on same group
14. **Expected**: Team appears in Team B slot
15. Try dragging Team 3 to same group
16. **Expected**: Warning (group full)
17. Click "Save Pairings"
18. Close and reopen
19. **Expected**: Groups restored

### Test 7: Print Tee Sheet

**Regular Format**:
1. Create pairings (4-ball groups)
2. Click "Print Tee Sheet"
3. **Expected**:
   - New window opens
   - Print dialog appears
   - Shows groups with players
   - Professional formatting
   - Can print or save as PDF

**2-Man Scramble**:
1. Create 2-man teams and 4-ball groups
2. Click "Print Tee Sheet"
3. **Expected**:
   - Shows groups
   - Team A and Team B separated
   - Average handicaps shown
   - Clear team labels

### Test 8: Golfer Pairing View

**Setup**: As organizer, create and save pairings

**Test A: Regular Group**:
1. Logout, login as golfer
2. Go to Society Events
3. Click on event
4. **Expected**:
   - "Your Group Assignment" section visible
   - Shows "Group X"
   - Your name in bold green with 👉
   - All groupmates listed

**Test B: 2-Man Scramble**:
1. Login as golfer in scramble
2. Click on event
3. **Expected**:
   - Shows "2-Man Scramble" badge
   - Shows group number
   - Team A and Team B separated
   - Your name highlighted
   - All 4 players visible

**Test C: Not Assigned**:
1. Login as registered player NOT in pairings
2. Click on event
3. **Expected**:
   - Section shows
   - Message: "not assigned to a group yet"
   - Suggestion to contact organizer

**Test D: No Pairings**:
1. Event with no pairings created
2. Click on event
3. **Expected**:
   - Section hidden (doesn't show at all)
   - No error

---

## KNOWN ISSUES & FUTURE ENHANCEMENTS

### Known Limitations

1. **Partial Payments**:
   - Database field exists
   - UI not implemented
   - Can only mark as paid/unpaid (not partial)

2. **Payment History**:
   - Fields: paid_by, paid_at exist
   - No audit trail UI
   - Can't see who marked payments or when

3. **Bulk Operations**:
   - No multi-select in roster
   - Can't mark multiple players as paid at once
   - Would improve efficiency for large events

4. **Export Tee Sheet to PDF**:
   - Currently only print (requires printer/PDF software)
   - Could add direct PDF generation
   - Better for mobile users

5. **Mobile Drag-and-Drop**:
   - Drag-and-drop may not work on touch devices
   - Consider touch-optimized alternative

### Future Enhancements

**Suggested Priority 1** (High Impact):
1. **Payment History Modal**:
   - Show all payment events for a player
   - Who marked, when, amount
   - Export to CSV

2. **Bulk Payment Operations**:
   - Checkbox to select multiple players
   - "Mark All as Paid" button
   - Batch fee entry

3. **Mobile-Friendly Pairing Assignment**:
   - Tap-to-select teams
   - Button-based assignment
   - Alternative to drag-and-drop

**Suggested Priority 2** (Nice to Have):
1. **Partial Payment Tracking**:
   - Allow entering partial amounts
   - Track remaining balance
   - Multiple payments per player

2. **Direct PDF Export**:
   - Generate PDF without print dialog
   - Email tee sheet to members
   - Share via WhatsApp/LINE

3. **Pairing Templates**:
   - Save common grouping patterns
   - Reuse for similar events
   - Quick setup for recurring events

4. **SMS/LINE Notifications**:
   - Notify golfers when pairings are published
   - Send group assignment via message
   - Include tee time and teammates

**Suggested Priority 3** (Future Vision):
1. **Revenue Analytics**:
   - Payment trends over time
   - Member vs non-member revenue split
   - Forecasting for future events

2. **Automated Pairing Suggestions**:
   - AI-based grouping (balance handicaps)
   - Honor partner preferences
   - Optimize for even competition

3. **Live Scoring Integration**:
   - Link pairings to live scorecard
   - Auto-populate player names
   - Real-time leaderboard by group

---

## APPENDIX A: Quick Command Reference

### Browser Console Commands

**Find Event ID**:
```javascript
const events = await SocietyGolfDB.getEvents(AppState.currentUser.lineUserId);
console.table(events.map(e => ({ Name: e.name, Date: e.date, ID: e.id })));
```

**Recalculate Single Event**:
```javascript
await SocietyGolfDB.recalculateEventFees('EVENT_ID_HERE');
```

**Recalculate All Events**:
```javascript
const events = await SocietyGolfDB.getEvents(AppState.currentUser.lineUserId);
for (const event of events) {
    await SocietyGolfDB.recalculateEventFees(event.id);
}
```

**Check Player Membership**:
```javascript
const isMember = await SocietyGolfDB.checkSocietyMembership('PLAYER_ID', 'SOCIETY_NAME');
console.log(isMember ? 'MEMBER' : 'NON-MEMBER');
```

---

## APPENDIX B: File Locations

### Modified Files

```
index.html                                    (~600 lines modified)
sw.js                                        (1 line - cache version)
```

### New Files

```
sql/
├── add-member-nonmember-fees.sql            (Database migration)
├── recalculate-event-fees.md                (Documentation)
└── fix-budapaw-event-fees.sql               (Helper script)

compacted/
└── SESSION-2025-10-18-FEES-PAIRINGS-PRINT.md  (This file)
```

---

## APPENDIX C: Git Commit History

```
fa838cec - Add member/non-member fee structure and auto-calculation
   - Event creation form redesigned
   - Auto fee calculation at registration
   - Fee recalculation utility
   - Database migration

7498d6af - Fix critical bug: Total fees not displaying in roster
   - Added payment fields to getRegistrations() mapping
   - Fees now display correctly

1145db71 - Fix Mark Paid button and add Super Admin permission
   - Fixed field name mismatch (player_id vs playerId)
   - Fixed eventId scope issue
   - Added Super Admin permission for unmarking

4ce4a987 - Fix event editing + Add drag-and-drop 2-man scramble grouping
   - Event editing form population fixed
   - getEvents() and getEvent() mappings updated
   - Drag-and-drop pairing interface
   - 4-ball grouping for tee times

8027ff99 - Add print tee sheet + real-time pairing display for golfers
   - printTeeSheet() function with formatted HTML
   - loadGolferPairing() for real-time display
   - Auto-load on event detail open
```

---

## END OF DOCUMENTATION

**Last Updated**: October 18, 2025
**Author**: Claude Code (Anthropic)
**Platform**: MyCaddy Pro Golf Platform
**Status**: ✅ All Features Deployed and Tested
