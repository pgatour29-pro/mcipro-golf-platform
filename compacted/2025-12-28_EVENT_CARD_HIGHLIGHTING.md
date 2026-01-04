# Session Catalog - December 28, 2025
## Event Card Border Highlighting Feature

---

## Feature Overview

Added visual border highlighting to event cards across the platform to make it easier to identify:
- **Imminent events** (today/tomorrow) - Bright green border
- **Filling up events** (≤30% spots remaining) - Yellow border
- **Full events** - Red border

---

## Files Modified

**File:** `public/index.html`

### 1. Golfer Society Events Page
**Location:** `GolferEventsManager.renderEventCard()` - Lines 73106-73124

```javascript
// Check if event is today or tomorrow (imminent)
const eventDateOnly = new Date(event.date);
eventDateOnly.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const isToday = eventDateOnly.getTime() === today.getTime();
const isTomorrow = eventDateOnly.getTime() === tomorrow.getTime();
const isImminent = isToday || isTomorrow;

// Determine card border highlight (priority: full > filling > imminent)
let cardBorderClass = 'border border-gray-200'; // Default
if (isFull && !isPast) {
    cardBorderClass = 'ring-4 ring-red-500 border-2 border-red-600';
} else if (isFillingFast && !isPast) {
    cardBorderClass = 'ring-4 ring-yellow-400 border-2 border-yellow-500';
} else if (isImminent && !isPast) {
    cardBorderClass = 'ring-4 ring-green-400 border-2 border-green-600';
}
```

**Card div:** Line 73169
```html
<div id="event-card-${event.id}" class="bg-white rounded-lg shadow-sm ${cardBorderClass} overflow-hidden...">
```

---

### 2. Organizer Calendar Sidebar
**Location:** `showEventsForDate()` - Lines 83566-83588

```javascript
// Determine card border highlight for organizer events
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const eventDate = new Date(event.date);
eventDate.setHours(0, 0, 0, 0);
const isPastEvent = eventDate < today;
const isFull = max > 0 && registered >= max;
const isFillingFast = max > 0 && registered < max && (max - registered) <= max * 0.3;
const isToday = eventDate.getTime() === today.getTime();
const isTomorrow = eventDate.getTime() === tomorrow.getTime();
const isImminent = isToday || isTomorrow;

let orgCardBorderClass = 'border border-gray-200'; // Default
if (isFull && !isPastEvent) {
    orgCardBorderClass = 'ring-4 ring-red-500 border-2 border-red-600';
} else if (isFillingFast && !isPastEvent) {
    orgCardBorderClass = 'ring-4 ring-yellow-400 border-2 border-yellow-500';
} else if (isImminent && !isPastEvent) {
    orgCardBorderClass = 'ring-4 ring-green-400 border-2 border-green-600';
}
```

**Card div:** Line 83591
```html
<div class="p-3 ${orgCardBorderClass} rounded-lg hover:shadow-md transition cursor-pointer">
```

---

### 3. Organizer Dashboard Events
**Location:** `SocietyOrganizerSystem.renderEventCard()` - Lines 61854-61875

```javascript
// Determine card border highlight for organizer events
const today = new Date();
today.setHours(0, 0, 0, 0);
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const eventDateObj = event.date ? new Date(event.date) : null;
if (eventDateObj) eventDateObj.setHours(0, 0, 0, 0);
const isPastEvent = eventDateObj ? eventDateObj < today : false;
const isToday = eventDateObj ? eventDateObj.getTime() === today.getTime() : false;
const isTomorrow = eventDateObj ? eventDateObj.getTime() === tomorrow.getTime() : false;
const isImminent = isToday || isTomorrow;
const isFillingFast = maxPlayers > 0 && registered < maxPlayers && (maxPlayers - registered) <= maxPlayers * 0.3;

let orgCardBorderClass = 'border'; // Default
if (isFull && !isPastEvent) {
    orgCardBorderClass = 'ring-4 ring-red-500 border-2 border-red-600';
} else if (isFillingFast && !isPastEvent) {
    orgCardBorderClass = 'ring-4 ring-yellow-400 border-2 border-yellow-500';
} else if (isImminent && !isPastEvent) {
    orgCardBorderClass = 'ring-4 ring-green-400 border-2 border-green-600';
}
```

**Card div:** Line 61878
```html
<div class="bg-white rounded-xl shadow-md ${orgCardBorderClass} overflow-hidden hover:shadow-lg transition-shadow">
```

---

## Border Styles

| Status | Tailwind Classes | Visual |
|--------|------------------|--------|
| **Today/Tomorrow** | `ring-4 ring-green-400 border-2 border-green-600` | Thick bright green double ring |
| **Filling Up** (≤30% spots) | `ring-4 ring-yellow-400 border-2 border-yellow-500` | Thick yellow double ring |
| **Full** | `ring-4 ring-red-500 border-2 border-red-600` | Thick red double ring |
| **Past/Future** | `border border-gray-200` | Default gray (no highlight) |

---

## Priority Order

1. **Full** (red) - Highest priority
2. **Filling Fast** (yellow)
3. **Imminent** (green) - Today or tomorrow only
4. **Default** (gray) - Past events and future events beyond tomorrow

---

## Key Design Decisions

1. **Only today/tomorrow get green** - NOT all future events
2. **Past events never highlighted** - No special border
3. **Future events (day after tomorrow+) not highlighted** - Unless filling/full
4. **ring-4 + border-2** - Creates thick, visible double border effect
5. **Slightly different shades** - ring vs border colors differ for visibility

---

## Line Number Reference

| Component | Lines |
|-----------|-------|
| Golfer Events - Logic | 73106-73124 |
| Golfer Events - Card | 73169 |
| Organizer Calendar - Logic | 83566-83588 |
| Organizer Calendar - Card | 83591 |
| Organizer Dashboard - Logic | 61854-61875 |
| Organizer Dashboard - Card | 61878 |

---

## Deployment

- Deployed to Vercel production
- Live at: https://mycaddipro.com
- Verified: HTTP 200

---

Generated: 2025-12-28
