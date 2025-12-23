# 2025-12-23 Dynamic Society Handicap Lookup

## PROBLEM

The pairings/registration system used **hardcoded string matching** to detect which society's handicaps to use:

```javascript
// OLD - Only worked for TRGG and JOA
if (eventTitle.toLowerCase().includes('trgg') || eventTitle.toLowerCase().includes('travellers rest')) {
    societyId = '7c0e4b72-d925-44bc-afda-38259a7ba346'; // TRGG
} else if (eventTitle.toLowerCase().includes('joa') || eventTitle.toLowerCase().includes('japan open')) {
    societyId = '72d8444a-56bf-4441-86f2-22087f0e6b27'; // JOA
}
```

**Issues:**
- Only 2 societies supported (TRGG, JOA)
- New societies wouldn't use society handicaps
- Events without society name in title would fail

---

## SOLUTION

Use `AppState.selectedSociety.id` dynamically - works for ANY society:

```javascript
// NEW - Dynamic, works for any society
const selectedSociety = window.AppState?.selectedSociety;
const societyId = selectedSociety?.id || null;
```

---

## CODE LOCATION

`public/index.html` line 74955-74957

### Before (16 lines)
```javascript
// Determine society from event title (TRGG, JOA, etc.)
const event = this.currentEvent || SocietyOrganizerSystem.events?.find(e => e.id === this.currentEventId);
const eventTitle = event?.title || event?.name || '';
let societyId = null;

// Also check AppState.selectedSociety as backup
const selectedSociety = window.AppState?.selectedSociety;

if (eventTitle.toLowerCase().includes('trgg') || eventTitle.toLowerCase().includes('travellers rest') ||
    selectedSociety?.name?.toLowerCase().includes('travellers rest')) {
    societyId = '7c0e4b72-d925-44bc-afda-38259a7ba346'; // TRGG
} else if (eventTitle.toLowerCase().includes('joa') || eventTitle.toLowerCase().includes('japan open') ||
    selectedSociety?.name?.toLowerCase().includes('joa')) {
    societyId = '72d8444a-56bf-4441-86f2-22087f0e6b27'; // JOA
}
```

### After (3 lines)
```javascript
// Get society ID from context (dynamic - works for any society)
const selectedSociety = window.AppState?.selectedSociety;
const societyId = selectedSociety?.id || null;
```

---

## HANDICAP PRIORITY ORDER

Both Live Scorecard and Pairings now use this priority:

1. **Society-specific handicap** (from `society_handicaps` where `society_id` matches)
2. **Universal handicap** (from `society_handicaps` where `society_id = null`)
3. **Registration/Profile fallback** (last resort)

---

## WHERE HANDICAPS ARE USED

### Live Scorecard
- Society selected via `roundSocietySelect` dropdown
- `getHandicapForSociety()` handles lookup
- Updates all players when society changes

### Pairings/Registration
- Society from `AppState.selectedSociety.id`
- `fetchCurrentHandicaps()` handles lookup
- Console shows which handicap source was used

---

## CONSOLE LOG PATTERNS

```
[Pairings] Selected Society: "Travellers Rest Golf Group", Society ID: 7c0e4b72-d925-44bc-afda-38259a7ba346
[Pairings] ✅ U1234...: Using SOCIETY handicap: 15.2
[Pairings] ⚠️ U5678...: No society record, using universal: 18.0
[Pairings] ❌ U9999...: No handicap records found
```

---

## AppState.selectedSociety STRUCTURE

```javascript
AppState.selectedSociety = {
    id: '7c0e4b72-d925-44bc-afda-38259a7ba346',  // Society UUID
    name: 'Travellers Rest Golf Group',
    organizerId: 'U...',
    logo: 'https://...',
    website: 'https://...'
};
```

Set when user navigates to a society's page or selects a society.

---

## COMMITS

- `d3a662d3` - fix: Use dynamic society ID for handicap lookup instead of hardcoded strings

---

## BENEFITS

| Aspect | Before | After |
|--------|--------|-------|
| Societies supported | 2 (TRGG, JOA) | Unlimited |
| Code lines | 16 | 3 |
| Maintenance | Add code for each society | None needed |
| Event naming | Must include society name | Any name works |

---

**Session Date**: 2025-12-23
**Status**: DEPLOYED
