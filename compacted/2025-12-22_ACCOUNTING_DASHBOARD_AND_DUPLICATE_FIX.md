# Accounting Dashboard + Duplicate Scorecard Fix

**Date:** December 22, 2025
**Session:** Accounting Dashboard implementation and Pete Park duplicate fix

---

## Part 1: Accounting Dashboard

### Overview

Added a comprehensive "Accounting" tab to the Society Organizer dashboard for financial tracking, budget management, and AI-powered recommendations.

### Tab Location

```
[Events] [Registrations] [Calendar] [Scoring] [Standings] [Rounds] [Players] [Accounting] [Profile]
```

### Features Implemented

| Feature | Description |
|---------|-------------|
| Stats Cards | Revenue, Outstanding, Budget %, Events Count, Active Players |
| AI Recommendations | Budget optimization, revenue forecasting, player insights |
| Period Filtering | Weekly, Monthly, Annually with year selector |
| Sub-tabs | Overview, Cost Breakdown, Budget Goals, Player Spending |
| Drill-down | Society → Events → Players → Individual Fees |
| Budget Goals | Auto-suggest based on history + manual override |
| Export | PDF, CSV, JSON formats |

### UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Period: [Weekly ▼] [Monthly] [Annually]   Year: [2025 ▼]       │
├─────────────────────────────────────────────────────────────────┤
│  STATS CARDS                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Revenue  │ │Outstanding│ │ Budget % │ │ Events   │ │Players │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  🤖 AI RECOMMENDATIONS                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 💰 Budget insight...                                        ││
│  │ ⚠️ Outstanding balances alert...                            ││
│  │ 📈 Revenue forecast...                                      ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  [Overview] [Cost Breakdown] [Budget Goals] [Player Spending]   │
└─────────────────────────────────────────────────────────────────┘
```

### Files Modified

| File | Changes |
|------|---------|
| `public/index.html` | Tab button (~line 33997), tab content (~330 lines), AccountingManager class (~1,150 lines) |
| `sql/accounting-tables.sql` | NEW: society_budgets table for budget tracking |

### Database Schema

```sql
CREATE TABLE society_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  society_id TEXT NOT NULL,
  fiscal_year INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('events', 'transport', 'prizes', 'marketing', 'other')),
  planned_amount DECIMAL(12,2) NOT NULL,
  auto_suggested BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(society_id, fiscal_year, category)
);
```

### AccountingManager Methods

| Method | Purpose |
|--------|---------|
| `init()` | Initialize and load all data |
| `setPeriod(period)` | Switch between weekly/monthly/annually |
| `setYear(year)` | Filter by fiscal year |
| `loadData()` | Load events, registrations, budgets |
| `renderStats()` | Render 5 stats cards |
| `renderAIRecommendations()` | Generate AI insights |
| `showSubTab(name)` | Switch between Overview/Breakdown/Budget/Players |
| `renderOverview()` | Revenue chart + transactions + event table |
| `renderCostBreakdown()` | Hierarchical drill-down tree |
| `renderBudgetGoals()` | Budget table with progress bars |
| `renderPlayerSpending()` | Player spending table |
| `autoSuggestBudgets()` | AI-calculate budget targets |
| `saveBudget()` | Save/update budget goal |
| `exportPDF/CSV/JSON()` | Export functionality |

---

## Part 2: Duplicate Scorecard Fix

### Problem

Pete Park appeared 3 times in live leaderboard for single event (TRGG Treasure Hill).

Database showed:
```
Pete Park - event 99219f5b... - 2025-12-21T22:33:06 (scorecard 1)
Pete Park - event 99219f5b... - 2025-12-21T22:31:23 (scorecard 2)
Pete Park - event 99219f5b... - 2025-12-21T09:25:45 (scorecard 3)
```

### Root Cause

`createScorecard()` function inserted new scorecards without checking if one already existed for that player/event combination. When rounds were started multiple times (testing, refresh, offline sync), duplicates were created.

### Fixes Applied

#### 1. Prevention Logic (index.html:44247)

```javascript
async createScorecard(eventId, playerId, handicap) {
    // PREVENTION: Check if scorecard already exists
    const { data: existing } = await window.SupabaseDB.client
        .from('scorecards')
        .select('id, player_id, created_at')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (existing) {
        console.log(`[SocietyGolf] ⚠️ Scorecard already exists, returning existing`);
        // Return existing instead of creating duplicate
        return fullScorecard;
    }

    // Only create if none exists
    // ... insert logic
}
```

#### 2. Deduplication in live.html (getEventLeaderboard)

```javascript
// DEDUPLICATE: Keep only the best scorecard per player
const bestByPlayer = new Map();
for (const sc of scorecards) {
    const existing = bestByPlayer.get(sc.player_id);
    const scHoles = (sc.scores || []).length;
    const existingHoles = existing ? (existing.scores || []).length : 0;

    if (!existing || scHoles > existingHoles ||
        (scHoles === existingHoles && new Date(sc.created_at) > new Date(existing.created_at))) {
        bestByPlayer.set(sc.player_id, sc);
    }
}
const uniqueScorecards = Array.from(bestByPlayer.values());
```

#### 3. Deduplication in index.html (getEventScorecards)

Same logic added to `SocietyGolfDB.getEventScorecards()` function.

#### 4. Database Cleanup

```sql
WITH ranked_scorecards AS (
    SELECT id, ROW_NUMBER() OVER (
        PARTITION BY event_id, player_id
        ORDER BY created_at DESC
    ) as rn
    FROM scorecards
)
DELETE FROM scorecards
WHERE id IN (SELECT id FROM ranked_scorecards WHERE rn > 1);
```

### Files Modified

| File | Line | Change |
|------|------|--------|
| `public/index.html` | 44247 | Prevention check in createScorecard() |
| `public/index.html` | 44380 | Deduplication in getEventScorecards() |
| `public/live.html` | 503 | Deduplication in getEventLeaderboard() |
| `sql/CLEANUP_DUPLICATE_SCORECARDS.sql` | - | Updated to handle non-UUID event_ids |

### Deduplication Logic

Keeps the **best** scorecard per player:
1. Most holes played (more progress = better)
2. If tied on holes, keep latest by created_at

### Verification

After running cleanup SQL:
```sql
SELECT event_id, player_id, player_name, COUNT(*) as duplicate_count
FROM scorecards
GROUP BY event_id, player_id, player_name
HAVING COUNT(*) > 1;
```
Returns 0 rows = no duplicates.

---

## Git Commits

```
09938df7 feat: Add Accounting Dashboard + fix duplicate scorecards
```

---

## Testing Checklist

### Accounting Dashboard
- [ ] Accounting tab appears after Players tab
- [ ] Stats cards load with correct values
- [ ] Period selector filters data correctly
- [ ] AI recommendations display relevant insights
- [ ] Cost Breakdown drill-down expands/collapses
- [ ] Budget Goals shows progress bars
- [ ] Player Spending shows aggregated data
- [ ] Export buttons generate files

### Duplicate Scorecard Fix
- [ ] Live leaderboard shows 1 entry per player
- [ ] Starting same round twice doesn't create duplicate
- [ ] Organizer Scoring page shows 1 entry per player
- [ ] History page shows 1 entry per event

---

## Notes

- The invalid event_id "0ga5vmph7" exists in scorecards table (legacy data)
- Cleanup SQL uses LEFT JOIN to handle non-UUID event_ids
- Prevention logic logs when returning existing scorecard for debugging
