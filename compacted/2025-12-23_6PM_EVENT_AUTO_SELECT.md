# 2025-12-23 6PM Event Auto-Select Fix

## PROBLEM

The Registrations page was supposed to auto-select the **next event** after 6pm, but it was still showing today's event at 6:45pm.

**Expected behavior:**
- Before 6pm: Show today's event
- After 6pm: Automatically switch to next upcoming event

**Actual behavior:**
- Always showed today's event regardless of time

---

## ROOT CAUSE

The `autoSelectEvent()` function had no time-based logic - it always prioritized today's event:

```javascript
// OLD - No time check
const todayEvent = events.find(e => e.date === todayStr);
if (todayEvent) {
    this.selectEvent(todayEvent.id, true);
    return;
}
```

Additionally, the `init()` function would skip auto-select if already initialized with an event selected.

---

## SOLUTION

### Fix 1: Time Check in autoSelectEvent()
Location: `public/index.html` lines 74159-74207

```javascript
// NEW - Check if after 6pm
const currentHour = now.getHours();
const isAfter6pm = currentHour >= 18;

// First priority: today's event (only before 6pm)
if (!isAfter6pm) {
    const todayEvent = events.find(e => e.date === todayStr);
    if (todayEvent) {
        console.log('[RegistrationsManager] Auto-selecting today\'s event (before 6pm):', todayEvent.name);
        this.selectEvent(todayEvent.id, true);
        return;
    }
} else {
    console.log('[RegistrationsManager] After 6pm - skipping today\'s event, selecting next event');
}

// Second priority: next upcoming event (after today)
const upcomingEvent = sortedEvents.find(e => e.date > todayStr);
if (upcomingEvent) {
    console.log('[RegistrationsManager] Auto-selecting upcoming event:', upcomingEvent.name);
    this.selectEvent(upcomingEvent.id, true);
    return;
}
```

### Fix 2: Force Re-evaluation in init()
Location: `public/index.html` lines 74105-74123

```javascript
// Check if we need to switch events after 6pm
const now = new Date();
const todayStr = now.toISOString().split('T')[0];
const currentHour = now.getHours();
const isAfter6pm = currentHour >= 18;

// If after 6pm and current event is today's event, force re-select to next event
if (this._initialized && this.currentEventId && isAfter6pm) {
    const currentEvent = window.SocietyOrganizerSystem?.events?.find(e => e.id === this.currentEventId);
    if (currentEvent && currentEvent.date === todayStr) {
        console.log('[RegistrationsManager] After 6pm with today\'s event selected - checking for next event');
        const sortedEvents = [...(window.SocietyOrganizerSystem?.events || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        const nextEvent = sortedEvents.find(e => e.date > todayStr);
        if (nextEvent) {
            console.log('[RegistrationsManager] Switching to next event:', nextEvent.name);
            this.currentEventId = null; // Force auto-select
        }
    }
}
```

---

## LOGIC FLOW

```
User opens Registrations page
    ↓
init() called
    ↓
Is it after 6pm AND today's event is selected?
    ├─ YES → Clear currentEventId, force re-evaluation
    └─ NO → Keep current selection if exists
    ↓
autoSelectEvent() called (if no event selected)
    ↓
Is it after 6pm?
    ├─ YES → Skip today's event
    │         ↓
    │         Select next upcoming event (date > today)
    │         ↓
    │         If no upcoming → Fall back to today's event
    │
    └─ NO → Select today's event if exists
             ↓
             If no today's event → Select next upcoming
```

---

## CONSOLE LOG PATTERNS

**Before 6pm:**
```
[RegistrationsManager] Auto-selecting today's event (before 6pm): TRGG - KK A-B / KK C-A
```

**After 6pm with next event available:**
```
[RegistrationsManager] After 6pm - skipping today's event, selecting next event
[RegistrationsManager] Auto-selecting upcoming event: TRGG - Khao Kheow
```

**After 6pm, revisiting page:**
```
[RegistrationsManager] After 6pm with today's event selected - checking for next event
[RegistrationsManager] Switching to next event: TRGG - Khao Kheow
```

**After 6pm, no upcoming events:**
```
[RegistrationsManager] After 6pm - skipping today's event, selecting next event
[RegistrationsManager] No upcoming events, falling back to today's event: TRGG - KK A-B / KK C-A
```

---

## CODE LOCATIONS

| Component | File | Lines |
|-----------|------|-------|
| init() with 6pm check | public/index.html | 74095-74142 |
| autoSelectEvent() | public/index.html | 74159-74207 |
| Service worker version | public/sw.js | 4 |

---

## EDGE CASES HANDLED

1. **No upcoming events after 6pm**: Falls back to today's event
2. **Already on page when 6pm hits**: Next `init()` call will switch
3. **Manual selection**: User can still manually select any event
4. **Multiple events same day**: Uses first match for today
5. **Society switch**: Resets state and re-runs auto-select

---

## COMMIT

- `538609bc` - fix: Auto-select next event after 6pm on Registrations page

---

## TESTING CHECKLIST

1. [ ] Before 6pm: Today's event is auto-selected
2. [ ] After 6pm: Next event is auto-selected (skips today)
3. [ ] After 6pm with no upcoming events: Falls back to today
4. [ ] Page refresh after 6pm: Switches to next event
5. [ ] Manual selection still works
6. [ ] Console logs show correct behavior

---

**Session Date**: 2025-12-23
**Status**: DEPLOYED
