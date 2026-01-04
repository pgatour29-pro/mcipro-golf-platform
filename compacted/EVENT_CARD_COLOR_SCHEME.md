# Event Card Color Scheme

**Updated:** 2026-01-01
**File:** `public/index.html` (lines ~73728-73786)
**Function:** `GolferEventsSystem.renderEventCard()`

## Color Hierarchy

| Event Status | Border/Ring | Header Gradient | Badge |
|--------------|-------------|-----------------|-------|
| **TODAY** | `ring-4 ring-amber-400 border-2 border-amber-500 shadow-lg shadow-amber-200` | `from-amber-500 to-amber-400` | Pulsing "TODAY" (amber-500) |
| **TOMORROW** | `ring-4 ring-sky-400 border-2 border-sky-500` | `from-sky-500 to-sky-400` | "TOMORROW" (sky-500) |
| **Filling Fast** | `ring-4 ring-yellow-400 border-2 border-yellow-500` | `from-green-500 to-green-400` | - |
| **Full** | `ring-4 ring-red-500 border-2 border-red-600` | `from-green-500 to-green-400` | - |
| **Default** | `border border-gray-200` | `from-green-500 to-green-400` | - |

## Priority Order

1. Full (red) - highest priority
2. Filling Fast (yellow)
3. Today (amber/gold)
4. Tomorrow (sky blue)
5. Default (gray border, green header)

## Status Badges

| Status | Style |
|--------|-------|
| Registered | `bg-blue-100 text-blue-600` |
| Pending Approval | `bg-amber-100 text-amber-600` |
| On Waitlist | `bg-purple-100 text-purple-600` |
| Past Event | `bg-gray-100 text-gray-600` |
| Closed | `bg-red-100 text-red-700` |
| Full - Waitlist | `bg-orange-100 text-orange-600` |
| Full (no waitlist) | `bg-red-100 text-red-600` |
| Filling Fast | `bg-amber-100 text-amber-600` |
| Open | `bg-green-100 text-green-600` |

## Timing Badges

```javascript
// TODAY - pulsing animation for urgency
timingBadge = '<span class="px-2 py-1 text-xs font-bold bg-amber-500 text-white rounded-full animate-pulse">TODAY</span>';

// TOMORROW - static badge
timingBadge = '<span class="px-2 py-1 text-xs font-bold bg-sky-500 text-white rounded-full">TOMORROW</span>';
```

## Code Location

```javascript
// Lines 73728-73743: Border/header class logic
let cardBorderClass = 'border border-gray-200';
let cardHeaderClass = 'bg-gradient-to-r from-green-500 to-green-400';

if (isFull && !isPast) {
    cardBorderClass = 'ring-4 ring-red-500 border-2 border-red-600';
} else if (isFillingFast && !isPast) {
    cardBorderClass = 'ring-4 ring-yellow-400 border-2 border-yellow-500';
} else if (isToday && !isPast) {
    cardBorderClass = 'ring-4 ring-amber-400 border-2 border-amber-500 shadow-lg shadow-amber-200';
    cardHeaderClass = 'bg-gradient-to-r from-amber-500 to-amber-400';
} else if (isTomorrow && !isPast) {
    cardBorderClass = 'ring-4 ring-sky-400 border-2 border-sky-500';
    cardHeaderClass = 'bg-gradient-to-r from-sky-500 to-sky-400';
}

// Lines 73780-73786: Timing badge logic
let timingBadge = '';
if (isToday && !isPast) {
    timingBadge = '<span class="... bg-amber-500 ... animate-pulse">TODAY</span>';
} else if (isTomorrow && !isPast) {
    timingBadge = '<span class="... bg-sky-500 ...">TOMORROW</span>';
}
```

## Visual Result

- **TODAY events**: Gold/amber glow with pulsing badge - maximum visibility
- **TOMORROW events**: Sky blue ring/header - clearly distinct from green
- **Regular future events**: Standard green header, gray border
- **Full/Filling events**: Red/yellow borders override timing colors
