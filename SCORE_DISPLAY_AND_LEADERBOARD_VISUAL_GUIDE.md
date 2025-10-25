# Score Display & Hole-by-Hole Leaderboard - Visual Guide

## 1. Score Display in Scoring Input Section

### Location
Appears **below the keypad** when a player is selected from the "Group Scores" section.

### Visual Layout

```
┌─────────────────────────────────────────────┐
│  Entering score for:                        │
│  John Smith                                 │
└─────────────────────────────────────────────┘

┌───────────────────────────────────────────┐
│  [ 1 ]  [ 2 ]  [ 3 ]                      │
│  [ 4 ]  [ 5 ]  [ 6 ]                      │
│  [ 7 ]  [ 8 ]  [ 9 ]                      │
│  [←]    [ 0 ]  [ ✓ ]                      │
└───────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 🏆 Current Round              🔄 Live       │
├─────────────────────────────────────────────┤
│ ⭐ Thailand Stableford        36 pts      │
│ ⛳ Stroke Play                76 strokes  │
│ 📊 Nassau                     +2          │
├─────────────────────────────────────────────┤
│ Round Progress                3/18 holes    │
│ ▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░ 16%          │
└─────────────────────────────────────────────┘
```

### Colors & Styling

**Card Background:** Gradient from green-50 to blue-50
**Border:** 2px solid green-200
**Header Icon:** Green leaderboard icon
**Live Indicator:** Small clock icon with "Live" text

**Format Colors:**
- **Thailand Stableford:** Green text with star icon (⭐)
- **Stroke Play:** Blue text with golf icon (⛳)
- **Modified Stableford:** Purple text with sparkle icon (✨)
- **Nassau:** Dynamic color - Green if positive, Red if negative (📊)
- **Scramble:** Orange text with groups icon (👥)
- **Best Ball:** Indigo text with filter icon (📋)
- **Match Play:** Gray text with compare icon (⚖️)
- **Skins:** Red text with fire icon (🔥)

---

## 2. Hole-by-Hole Leaderboard

### Location
In the **Live Leaderboard** section, below the "Join Side Games" button.

### Visual Layout - Summary View (Default)

```
┌──────────────────────────────────────────────┐
│  [ My Group ]  [ Competition ]  [ This Event ]│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ [ 📊 Summary ] [ 📋 Hole-by-Hole ]          │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 🏆 Thailand Stableford Leaderboard           │
├──────────────────────────────────────────────┤
│ 1.  John Smith (12)            36 pts       │
│ 2.  Jane Doe (8)               34 pts       │
│ 3.  Bob Johnson (15)           32 pts       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ⛳ Stroke Play Leaderboard                   │
├──────────────────────────────────────────────┤
│ 1.  Jane Doe                   71           │
│ 2.  John Smith                 76           │
│ 3.  Bob Johnson                82           │
└──────────────────────────────────────────────┘
```

### Visual Layout - Hole-by-Hole View

```
┌──────────────────────────────────────────────┐
│  [ My Group ]  [ Competition ]  [ This Event ]│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ [ 📊 Summary ] [ 📋 Hole-by-Hole ]          │  ← Toggle
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│ 📋 Hole-by-Hole Scores                                                               │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  Player      │ HCP │  1  │  2  │  3  │  4  │  5  │  6  │ ... │ Thru │ Total │      │
│              │     │Par 4│Par 3│Par 5│Par 4│Par 4│Par 3│ ... │      │       │      │
│ ─────────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┼──────┼───────┤      │
│ John Smith   │ 12  │  4  │  2  │  5  │  5  │  4  │  3  │ ... │  6   │  23   │      │
│ Jane Doe     │  8  │  3  │  3  │  4  │  4  │  5  │  3  │ ... │  6   │  22   │      │
│ Bob Johnson  │ 15  │  5  │  4  │  6  │  5  │  6  │  4  │ ... │  6   │  30   │      │
│ ─────────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┴──────┴───────┘      │
│                                                                                       │
│ Legend:  [ Eagle ]  [ Birdie ]  [ Par ]  [ Bogey ]  [ Double+ ]                    │
│           Yellow     Red        Gray      Light Blue  Dark Blue                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Color Coding for Scores

**Eagle or better (Score < Par-1):**
```
┌──────┐
│  2   │  ← Yellow background, white text, bold
└──────┘
```

**Birdie (Score = Par-1):**
```
┌──────┐
│  3   │  ← Red background, white text, bold
└──────┘
```

**Par (Score = Par):**
```
┌──────┐
│  4   │  ← Gray background, dark text
└──────┘
```

**Bogey (Score = Par+1):**
```
┌──────┐
│  5   │  ← Light blue background, dark text
└──────┘
```

**Double Bogey or worse (Score >= Par+2):**
```
┌──────┐
│  6   │  ← Dark blue background, dark text, bold
└──────┘
```

---

## 3. Mobile View (320px - 768px)

### Score Display - Mobile

```
┌──────────────────────┐
│ Entering score for:  │
│ John Smith           │
└──────────────────────┘

┌──────────────────────┐
│  [ 1 ]  [ 2 ]  [ 3 ] │
│  [ 4 ]  [ 5 ]  [ 6 ] │
│  [ 7 ]  [ 8 ]  [ 9 ] │
│  [←]    [ 0 ]  [ ✓ ] │
└──────────────────────┘

┌──────────────────────┐
│ 🏆 Current Round     │
│                🔄 Live│
├──────────────────────┤
│ ⭐ Thai Stableford   │
│            36 pts    │
│ ⛳ Stroke Play       │
│         76 strokes   │
├──────────────────────┤
│ Progress  3/18 holes │
│ ▓▓▓░░░░░░░░░ 16%    │
└──────────────────────┘
```

### Hole-by-Hole - Mobile (Horizontal Scroll)

```
┌────────────────────────────────────────────┐
│  [ My Group ]  [ Competition ]             │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ [  Summary  ] [ Hole-by-Hole ]            │
└────────────────────────────────────────────┘

┌───────────────────────────────────────┐
│ 📋 Hole-by-Hole Scores               │
│  ← Scroll horizontally →             │
└───────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Player    │HCP│ 1 │ 2 │ 3 │ 4 │→│                       │
│           │   │P4 │P3 │P5 │P4 │ │                       │
│───────────┼───┼───┼───┼───┼───┤ │                       │
│John Smith │12 │ 4 │ 2 │ 5 │ 5 │→│  ← Sticky column     │
│Jane Doe   │ 8 │ 3 │ 3 │ 4 │ 4 │→│                       │
└─────────────────────────────────────────────────────────┘
```

**Mobile Features:**
- Score display fits screen width
- Hole-by-hole table scrolls horizontally
- Player name column stays visible (sticky)
- Touch-friendly buttons
- Compact icons and spacing

---

## 4. Real-Time Update Animation

### Before Score Entry

```
┌──────────────────────┐
│ ⭐ Thai Stableford   │
│            32 pts    │  ← Current total
│ ⛳ Stroke Play       │
│         72 strokes   │
├──────────────────────┤
│ Progress  5/18 holes │
│ ▓▓▓▓▓░░░░░░░ 28%    │
└──────────────────────┘
```

### User enters score "4" on hole 6

```
┌──────────────────────┐
│ ⭐ Thai Stableford   │
│            34 pts    │  ← Updates instantly
│ ⛳ Stroke Play       │
│         76 strokes   │  ← Updates instantly
├──────────────────────┤
│ Progress  6/18 holes │  ← Updates instantly
│ ▓▓▓▓▓▓░░░░░░ 33%    │  ← Animates smoothly
└──────────────────────┘
```

---

## 5. State Changes

### State 1: No Player Selected

```
┌──────────────────────┐
│ Select a player above│  ← Prompt message
└──────────────────────┘

Score display card is HIDDEN
```

### State 2: Player Selected, No Scores

```
┌──────────────────────┐
│ 🏆 Current Round     │
├──────────────────────┤
│ ⭐ Thai Stableford   │
│               -      │  ← No scores yet
├──────────────────────┤
│ Progress  0/18 holes │
│ ░░░░░░░░░░░░ 0%     │
└──────────────────────┘
```

### State 3: Player Selected, Scores Entered

```
┌──────────────────────┐
│ 🏆 Current Round     │
├──────────────────────┤
│ ⭐ Thai Stableford   │
│            36 pts    │  ← Calculated
│ ⛳ Stroke Play       │
│         76 strokes   │  ← Calculated
├──────────────────────┤
│ Progress  9/18 holes │
│ ▓▓▓▓▓▓▓▓▓░░ 50%    │
└──────────────────────┘
```

### State 4: Round Completed

```
┌──────────────────────┐
│ 🏆 Current Round     │
├──────────────────────┤
│ ⭐ Thai Stableford   │
│            72 pts    │  ← Final score
│ ⛳ Stroke Play       │
│        144 strokes   │  ← Final score
├──────────────────────┤
│ Progress 18/18 holes │
│ ▓▓▓▓▓▓▓▓▓▓▓ 100%   │  ← Full bar
└──────────────────────┘
```

---

## 6. Multi-Format Example

### All 8 Formats Selected

```
┌──────────────────────────────┐
│ 🏆 Current Round   🔄 Live   │
├──────────────────────────────┤
│ ⭐ Thailand Stableford       │
│                     36 pts   │
│ ⛳ Stroke Play               │
│                  76 strokes  │
│ ✨ Modified Stableford       │
│                     42 pts   │
│ 📊 Nassau                    │
│                         +2   │
│ 👥 Scramble (Team)           │
│                  68 (team)   │
│ 📋 Best Ball                 │
│                         76   │
│ ⚖️ Match Play                │
│                vs opponent   │
│ 🔥 Skins                     │
│                    0 skins   │
├──────────────────────────────┤
│ Progress         9/18 holes  │
│ ▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%    │
└──────────────────────────────┘
```

---

## 7. Hover & Active States

### Toggle Button - Inactive

```
┌─────────────────┐
│  📊 Summary     │  ← Gray text, transparent border
└─────────────────┘
```

### Toggle Button - Active

```
┌─────────────────┐
│  📊 Summary     │  ← Green text, green bottom border (2px)
└─────────────────┘
```

### Toggle Button - Hover (Inactive)

```
┌─────────────────┐
│  📊 Summary     │  ← Darker gray text on hover
└─────────────────┘
```

---

## 8. Desktop View (1024px+)

### Split Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                     Scoring Entry Section                       │
├───────────────────────┬─────────────────────────────────────────┤
│                       │                                         │
│   Keypad              │   Scramble Tracking                     │
│   ┌───┬───┬───┐       │   (when active)                         │
│   │ 1 │ 2 │ 3 │       │                                         │
│   ├───┼───┼───┤       │                                         │
│   │ 4 │ 5 │ 6 │       │                                         │
│   ├───┼───┼───┤       │                                         │
│   │ 7 │ 8 │ 9 │       │                                         │
│   ├───┼───┼───┤       │                                         │
│   │←  │ 0 │ ✓ │       │                                         │
│   └───┴───┴───┘       │                                         │
│                       │                                         │
│   Score Display       │                                         │
│   ┌─────────────────┐ │                                         │
│   │ 🏆 Current Round│ │                                         │
│   │ ⭐ Stableford   │ │                                         │
│   │          36 pts │ │                                         │
│   └─────────────────┘ │                                         │
│                       │                                         │
└───────────────────────┴─────────────────────────────────────────┘
```

---

## 9. Accessibility Features

### Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Icons supplement color coding
- Score colors work for colorblind users

### Touch Targets
- All buttons minimum 44x44px
- Spacing between interactive elements
- Large tap areas on mobile

### Screen Readers
- Semantic HTML structure
- ARIA labels on dynamic content
- Meaningful icon descriptions

---

## 10. Loading States

### Initial Load

```
┌──────────────────────┐
│ Loading scores...    │
│        ⏳            │
└──────────────────────┘
```

### Calculating Scores

```
┌──────────────────────┐
│ Calculating...       │
│ ⭐ Thai Stableford   │
│            ... pts   │  ← Temporary
└──────────────────────┘
```

---

## Summary

The visual design follows the MciPro platform's existing aesthetic:
- **Green primary color** for golf theme
- **Gradient backgrounds** for modern look
- **Material Icons** for consistency
- **Tailwind CSS** for responsive design
- **Clean card-based layout**
- **Mobile-first approach**

All components are:
✅ Mobile-responsive
✅ Touch-friendly
✅ Accessible
✅ Performant
✅ Real-time updated
