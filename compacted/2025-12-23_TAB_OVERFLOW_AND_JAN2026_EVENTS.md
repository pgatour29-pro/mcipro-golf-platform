# 2025-12-23 Society Dashboard Tab Overflow & January 2026 TRGG Events

## SESSION OVERVIEW

**Tasks Completed**:
1. Fixed Society Dashboard tab overflow - Profile and Admin tabs were cut off
2. Created January 2026 TRGG events SQL (28 events)

**Commits**:
- `ce75b3b7` - fix: Society Dashboard tabs overflow - Profile/Admin now visible

---

## TASK 1: SOCIETY DASHBOARD TAB OVERFLOW FIX

### Problem
The Society Organizer Dashboard has 10 tabs, and the rightmost tabs (Profile, Admin) were being cut off and not visible to users.

### Root Cause
- 10 tabs with `px-4 md:px-6` padding were too wide for the container
- Global CSS hides scrollbars (`::-webkit-scrollbar { display: none; }`)
- No visual indication that horizontal scrolling was available

### Solution

**HTML Changes** (`public/index.html` lines 33967-34009):

1. Reduced tab padding from `px-4 md:px-6` to `px-2 md:px-4`
2. Shortened tab labels:
   - "Season Standings" → "Standings"
   - "Round History" → "Rounds"
3. Added `whitespace-nowrap` to prevent text wrapping
4. Added `pr-4` right padding to inner container for scroll end visibility
5. Added `scrollbar-thin` class for visible scrollbar

```html
<div class="bg-white rounded-xl shadow-sm mb-6 overflow-x-auto scrollbar-thin">
    <div class="flex flex-nowrap border-b border-gray-200 min-w-max pr-4">
        <button class="organizer-tab-button px-2 md:px-4 py-3 text-sm font-medium whitespace-nowrap">
            ...
        </button>
    </div>
</div>
```

**CSS Added** (`public/index.html` lines 190-208):

```css
/* Thin scrollbar for horizontal scroll areas - make scroll visible */
.scrollbar-thin {
    scrollbar-width: thin;  /* Firefox */
    scrollbar-color: #cbd5e1 transparent;
}
.scrollbar-thin::-webkit-scrollbar {
    display: block !important;
    height: 6px;
}
.scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 3px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
}
```

### Files Modified
- `public/index.html` - Tab HTML and CSS
- `public/sw.js` - SW_VERSION updated to `'tab-overflow-fix-v1'`

---

## TASK 2: JANUARY 2026 TRGG EVENTS

### Requirement
Create 28 golf event cards for Travellers Rest Golf Group for January 2026.

### SQL File Created
`sql/import-trgg-january-2026-schedule.sql`

### Schema Issues Encountered & Fixed

| Issue | Wrong Value | Correct Value |
|-------|-------------|---------------|
| Column name | `green_fee` | `entry_fee` |
| Column name | `max_players` | `max_participants` |
| Column name | `notes` | `description` |
| organizer_id type | LINE user ID string | NULL (not UUID) |
| status value | `'open'` | `'draft'` |

### Correct Schema for society_events INSERT

```sql
INSERT INTO society_events (
  title,
  event_date,
  start_time,
  entry_fee,
  max_participants,
  society_id,
  organizer_id,
  status,
  course_name,
  description,
  format,
  is_private,
  created_at,
  updated_at
) VALUES
('TRGG - Course Name', '2026-01-01', '10:30', 2650, 80,
 '17451cf3-f499-4aa3-83d7-c206149838c4', NULL, 'draft',
 'Course Name', 'Departure: 09:15 | First Tee: 10:30 | Cart & Caddy included',
 'stableford', false, NOW(), NOW());
```

### January 2026 Schedule (28 Events)

| Date | Day | Course | Tee Time | Price |
|------|-----|--------|----------|-------|
| Jan 1 | Thu | Mountain Shadow (Holiday) | 10:30 | TBA |
| Jan 2 | Fri | Burapha (Free Food Friday) | 10:00 | ฿2,750 |
| Jan 3 | Sat | Eastern Star (Two Way) | 10:30 | ฿2,450 |
| Jan 5 | Mon | Pattaya C.C. | 09:35 | ฿2,650 |
| Jan 6 | Tue | Greenwood | 09:05 | ฿1,750 |
| Jan 7 | Wed | Bangpakong (Monthly Medal Final) | 10:40 | ฿1,850 |
| Jan 8 | Thu | Phoenix | 11:45 | ฿2,650 |
| Jan 9 | Fri | Burapha (Free Food Friday) | 10:00 | ฿2,750 |
| Jan 10 | Sat | Pleasant Valley (Two Way) | 11:30 | ฿2,350 |
| Jan 12 | Mon | Pattaya C.C. | 09:35 | ฿2,650 |
| Jan 13 | Tue | Khao Kheow | 11:35 | ฿2,250 |
| Jan 14 | Wed | Green Valley (Two Way) | 11:15 | ฿2,550 |
| Jan 15 | Thu | Phoenix | 11:45 | ฿2,650 |
| Jan 16 | Fri | Burapha (Free Food Friday) | 10:00 | ฿2,750 |
| Jan 17 | Sat | Eastern Star (Two Way) | 10:20 | ฿2,450 |
| Jan 19 | Mon | Phoenix | 11:50 | ฿2,650 |
| Jan 20 | Tue | St Andrews (10 Groups) | 09:30 | ฿2,650 |
| Jan 20 | Tue | Bangpakong (Alternative) | 10:10 | ฿1,850 |
| Jan 21 | Wed | Treasure Hill | TBA | TBA |
| Jan 22 | Thu | Greenwood | 09:05 | ฿1,750 |
| Jan 23 | Fri | Burapha (Two Man Scramble) | 10:00 | ฿2,950 |
| Jan 24 | Sat | Plutaluang (N-W) | 10:30 | ฿1,750 |
| Jan 26 | Mon | Pattaya C.C. | 09:35 | ฿2,650 |
| Jan 27 | Tue | Bangpakong | 09:50 | ฿1,850 |
| Jan 28 | Wed | Green Valley (Monthly Medal) | 11:15 | ฿2,550 |
| Jan 29 | Thu | Greenwood | 09:05 | ฿1,750 |
| Jan 30 | Fri | Burapha (Free Food Friday) | 10:00 | ฿2,750 |
| Jan 31 | Sat | Pleasant Valley (Two Way) | 11:30 | ฿2,350 |

### Society Reference

| Field | Value |
|-------|-------|
| Society Name | Travellers Rest Golf Group |
| Society UUID | `17451cf3-f499-4aa3-83d7-c206149838c4` |
| Organizer ID | NULL (use society_id for filtering) |
| Event Prefix | `TRGG -` |
| Status | `draft` |

---

## KEY LEARNINGS

### 1. society_events Schema
The correct column names are:
- `entry_fee` (NOT `green_fee`, `base_fee`)
- `max_participants` (NOT `max_players`)
- `description` (NOT `notes`)
- `organizer_id` is UUID type (use NULL if no UUID available)
- `status` must be valid enum: `'draft'`, `'published'`, etc. (NOT `'open'`)

### 2. To Check Valid Status Values
```sql
SELECT DISTINCT status FROM society_events LIMIT 10;
```

### 3. Scrollbar CSS Override
To make scrollbars visible despite global hiding:
```css
.scrollbar-thin::-webkit-scrollbar {
    display: block !important;  /* !important overrides global hide */
    height: 6px;
}
```

---

## FILES CREATED/MODIFIED

1. **`public/index.html`**
   - Lines 190-208: Added `.scrollbar-thin` CSS
   - Lines 33967-34009: Updated tab navigation HTML

2. **`public/sw.js`**
   - Line 4: SW_VERSION = `'tab-overflow-fix-v1'`

3. **`sql/import-trgg-january-2026-schedule.sql`** (NEW)
   - 28 TRGG events for January 2026
   - Correct schema with proper column names

---

## VERIFICATION CHECKLIST

### Tab Overflow Fix
- [ ] Hard refresh (Ctrl+F5)
- [ ] All 10 tabs visible (Events → Admin)
- [ ] Horizontal scroll works with visible scrollbar
- [ ] Profile and Admin tabs accessible

### January 2026 Events
- [ ] Run SQL in Supabase
- [ ] Verify 28 events created
- [ ] Events appear only for TRGG society
- [ ] Events visible in Society Dashboard

---

**Session Date**: 2025-12-23
**Status**: Tab fix DEPLOYED, Events SQL READY TO RUN
