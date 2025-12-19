# Session Catalog: UI Fixes, Mobile Improvements, OAuth Options

**Date:** December 16, 2025
**Session:** Event cards, History tab, Quick Start OAuth, Mobile fixes

---

## Summary of Changes

This session addressed multiple UI/UX issues across the platform including event card sizing, redundant tabs, OAuth login options, and mobile modal fixes.

---

## 1. Shrink Society Event Cards (35% Desktop, 30% Mobile)

### Problem
Event cards in the Events tab were too large, taking up too much screen space.

### Root Cause Discovery
There are TWO `renderEventCard()` functions in the codebase:
1. **SocietyOrganizerManager** (line ~55144) - For organizer admin view
2. **GolferEventsManager** (line ~65141) - For golfer Events tab ← THIS IS THE ONE USERS SEE

Initially edited the wrong function (organizer view).

### Fix Applied
Modified `GolferEventsManager.renderEventCard()` at line 65197:
- **Desktop:** Reduced padding, smaller text, compact layout (35% reduction)
- **Mobile:** Slightly less compact (30% reduction)
- Compact header with smaller society tag
- Smaller course name and date text
- Compact footer with smaller buttons

### File Changed
- `public/index.html` (lines 65197-65268)

---

## 2. Fix History Tab "No Past Events" Error

### Problem
History tab showed "No past events, you haven't played any events yet" even when user had played events.

### Root Cause
`loadMyHistory()` function only queried `event_registrations` table, missing actual played rounds stored in `scorecards` table.

### Fix Applied
Rewrote `loadMyHistory()` at line 66756 to:
1. Query `scorecards` table for rounds played (by player_id OR player_name)
2. Query `event_registrations` for registered events
3. Combine and deduplicate by event_id
4. Display all past rounds with proper card formatting

Added new `renderHistoryCard()` function to display history items with:
- Course name, date, scores
- Gross/Net/Stableford display
- Event name if applicable

### File Changed
- `public/index.html` (lines 66756+)

---

## 3. Remove Redundant History Tab from Events Page

### Problem
History tab on Events page was redundant - same info available in Round History (top nav).

### Fix Applied
Removed:
- History tab button (was at line 26725)
- History content section (was at line 26967)

Events page now has only: Browse, My Events, Calendar

### File Changed
- `public/index.html`

---

## 4. Add Kakao and Google to Quick Start Registration

### Problem
Quick Start Registration modal only showed LINE and QR Code options. Need Kakao and Google for Korean and international users.

### Fix Applied
Modified Quick Start Registration modal at line 12886:
- Changed from 2-column grid to 4-column grid
- Added LINE option with green styling + "Popular in Thailand"
- Added Kakao option with yellow styling + "Popular in Korea"
- Added Google option with white/red styling + "International"
- Kept QR Code option with cyan styling + "Fastest"

Each option now has:
- Distinct icon (SVG)
- Platform name
- Regional usage label
- Matching brand colors

### File Changed
- `public/index.html` (line 12886+)

---

## 5. Fix Announcements Not Expanding on Mobile

### Problem
In Messages section, clicking announcements on mobile did nothing - couldn't read full announcement text.

### Root Cause
`viewAnnouncement()` function (line 61479) only marked announcement as read but didn't display content.

### Fix Applied
Rewrote `viewAnnouncement()` to show full announcement modal:
- Full-screen modal overlay
- Header with title and priority badge (urgent/normal)
- Sender name and society name
- Full message content with scrolling
- Proper whitespace preservation for formatting
- Close button

### File Changed
- `public/index.html` (line 61479+)

---

## 6. Fix Golf Buddies Modal Not Loading on Mobile

### Problem
Golf Buddies modal wouldn't load/display on mobile devices.

### Root Cause
Modal used `max-h-[100vh]` with flex constraints that don't work on mobile browsers (address bar height issues, etc.).

### Fix Applied
Restructured `createBuddiesModal()` in golf-buddies-system.js:

**Before (broken):**
```javascript
<div class="fixed inset-0 ... overflow-hidden">
    <div class="h-full max-h-[100vh] flex flex-col">
        <div class="flex-1 min-h-0 overflow-y-auto">
```

**After (fixed):**
```javascript
<div class="fixed inset-0 ... overflow-y-auto">
    <div class="min-h-screen px-2 py-4 flex items-start justify-center">
        <div class="bg-white rounded-lg w-full max-w-4xl">
```

Key changes:
- Outer container now scrolls (`overflow-y-auto`)
- Uses `min-h-screen` instead of fixed height
- Natural document flow instead of flexbox constraints
- Updated `closeBuddiesModal()` to reset body overflow

### File Changed
- `public/golf-buddies-system.js` (lines 246+, 785+)

---

## Mistakes Made This Session

### 1. Wrong renderEventCard Function
**What happened:** Initially edited SocietyOrganizerManager's renderEventCard instead of GolferEventsManager's
**User feedback:** "what the fuck are you talking about. nothing has changed"
**Lesson:** Search for ALL instances of a function name before editing - there can be multiple implementations

### 2. History Only Querying Registrations
**What happened:** Assumed event_registrations contained play history
**Reality:** Actual played rounds are in scorecards table, registrations are just signups
**Lesson:** Understand data model - registrations ≠ completed rounds

---

## Database Tables Referenced

| Table | Purpose |
|-------|---------|
| `scorecards` | Actual played rounds with scores |
| `event_registrations` | Event signup records |
| `society_events` | Event definitions |
| `announcements` | Society announcements |
| `announcement_reads` | Read receipts for announcements |

---

## Files Modified

1. `public/index.html`
   - Event card sizing (GolferEventsManager)
   - History tab removal
   - loadMyHistory() rewrite
   - Quick Start Registration OAuth options
   - viewAnnouncement() modal display

2. `public/golf-buddies-system.js`
   - createBuddiesModal() mobile layout fix
   - closeBuddiesModal() body overflow reset

---

## Deployment

All changes deployed to Vercel production:
```
https://mycaddipro.com
```

---

## Testing Checklist

- [x] Event cards display smaller on desktop (35% reduction)
- [x] Event cards display smaller on mobile (30% reduction)
- [x] History tab removed from Events page
- [x] Round History accessible from top nav
- [x] Quick Start shows LINE, Kakao, Google, QR options
- [x] Announcements expand on mobile with full text
- [x] Golf Buddies modal loads on mobile
- [x] Golf Buddies modal scrollable on small screens
