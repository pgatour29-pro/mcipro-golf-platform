# Multi-Society Handicap System - Complete Design Document

**Version:** 1.0
**Date:** 2025-11-29
**Location:** Pattaya, Thailand
**Platform:** MciPro Golf Management System

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Solution Architecture](#solution-architecture)
4. [Database Schema Design](#database-schema-design)
5. [Handicap Calculation Logic](#handicap-calculation-logic)
6. [Application Code Changes](#application-code-changes)
7. [UI/UX Design](#uiux-design)
8. [Migration Plan](#migration-plan)
9. [Example Scenarios](#example-scenarios)
10. [Testing Checklist](#testing-checklist)
11. [API Reference](#api-reference)

---

## Executive Summary

### The Problem
In Pattaya, golfers belong to multiple societies (TRGG, JOA, Ora Ora Golf, etc.). Currently, each society maintains separate handicap databases, resulting in:
- One golfer having 2-4 different handicaps
- No system to track which society a round belongs to
- Societies wanting to protect their members with independent calculations
- User's philosophical preference for ONE universal handicap

### The Solution
A **Multi-Society Handicap System** that:
- Tracks handicaps **independently per society**
- Allows rounds to belong to **one or multiple societies**
- Automatically updates **only the relevant society handicaps**
- Supports **optional universal handicap** from all rounds combined
- Maintains backward compatibility with existing data

### Key Benefits
- **Society Protection:** Each society's handicap is calculated ONLY from their own rounds
- **Flexibility:** Rounds can count for multiple societies simultaneously
- **Transparency:** Clear visibility of which rounds contribute to which handicaps
- **Universal Option:** Optional "one true handicap" across all play
- **Automatic Updates:** Triggers handle all calculations in real-time

---

## Problem Statement

### Current Situation in Pattaya

```
┌─────────────────────────────────────────────────────────────┐
│  GOLFER: Pete Park                                          │
├─────────────────────────────────────────────────────────────┤
│  TRGG Handicap:      12.5  (based on TRGG rounds only)      │
│  JOA Handicap:       14.2  (based on JOA rounds only)       │
│  Ora Ora Handicap:   11.8  (based on Ora Ora rounds only)   │
│  Universal Handicap: 13.1  (what it SHOULD be - all rounds) │
└─────────────────────────────────────────────────────────────┘

Problem: These are maintained in separate systems!
```

### Real-World Scenario

**Pete Park plays:**
- Monday: TRGG event at Siam Country Club → Updates TRGG handicap only
- Wednesday: JOA event at Green Valley → Updates JOA handicap only
- Friday: Private round at Laem Chabang → Doesn't update any society handicap
- Saturday: Joint TRGG/JOA event → Should update BOTH handicaps

**Current System Issues:**
1. No way to tag a round with society(ies)
2. No independent handicap tracking per society
3. No way to handle multi-society events
4. Golfer has different handicaps in different society systems

---

## Solution Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    MULTI-SOCIETY HANDICAP SYSTEM                 │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│   ROUND COMPLETED   │
│  (Live Scorecard)   │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 1: Determine Society Assignment                            │
│  ────────────────────────────────────────────────────────────    │
│  • User selects society(ies) when finishing round                │
│  • Options: Single society, multiple societies, or universal     │
│  • Stored in: rounds.primary_society_id + round_societies table  │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 2: Trigger Fires (automatic)                               │
│  ────────────────────────────────────────────────────────────    │
│  • trigger_auto_update_society_handicaps                         │
│  • Identifies ALL societies this round belongs to                │
│  • Loops through each society                                    │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 3: Calculate Handicap Per Society                          │
│  ────────────────────────────────────────────────────────────    │
│  For EACH society:                                               │
│  1. Get golfer's last 5 rounds from THAT SOCIETY ONLY            │
│  2. Calculate score differentials                                │
│  3. Take best 3 of 5 (WHS formula)                               │
│  4. Apply 0.96 multiplier                                        │
│  5. Update society_handicaps table                               │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STEP 4: Update Universal Handicap                               │
│  ────────────────────────────────────────────────────────────    │
│  • Calculate handicap from ALL rounds (regardless of society)    │
│  • Store with society_id = NULL                                  │
│  • User's "one true handicap"                                    │
└──────────┬───────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│  RESULT: Golfer has multiple independent handicaps               │
│  ────────────────────────────────────────────────────────────    │
│  society_handicaps table:                                        │
│    Pete | TRGG    | 12.5                                         │
│    Pete | JOA     | 14.2                                         │
│    Pete | NULL    | 13.1  (universal)                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Design

### New Tables

#### 1. `society_handicaps`
**Purpose:** Store per-society handicaps for each golfer

```sql
CREATE TABLE society_handicaps (
  id UUID PRIMARY KEY,
  golfer_id TEXT NOT NULL,              -- LINE user ID
  society_id UUID,                      -- NULL = universal handicap
  handicap_index DECIMAL(4,1),          -- e.g., 12.5, -2.0 (plus handicap)
  rounds_count INTEGER DEFAULT 0,       -- How many rounds used
  last_calculated_at TIMESTAMPTZ,       -- When last updated
  calculation_method TEXT,              -- 'WHS-5' (best 3 of last 5)
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  UNIQUE(golfer_id, society_id),
  FOREIGN KEY (society_id) REFERENCES society_profiles(id)
);
```

**Example Data:**
```
golfer_id  | society_id              | handicap_index | rounds_count
-----------+-------------------------+----------------+-------------
pgatour29  | uuid-trgg-123           | 12.5          | 5
pgatour29  | uuid-joa-456            | 14.2          | 4
pgatour29  | NULL (universal)        | 13.1          | 8
donald123  | uuid-trgg-123           | 8.0           | 5
donald123  | NULL (universal)        | 8.5           | 6
```

#### 2. `round_societies`
**Purpose:** Junction table linking rounds to societies (many-to-many)

```sql
CREATE TABLE round_societies (
  round_id UUID NOT NULL,
  society_id UUID NOT NULL,
  created_at TIMESTAMPTZ,

  PRIMARY KEY (round_id, society_id),
  FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (society_id) REFERENCES society_profiles(id) ON DELETE CASCADE
);
```

**Example Data:**
```
round_id              | society_id              | created_at
----------------------+-------------------------+------------------------
uuid-round-001        | uuid-trgg-123           | 2025-11-29 10:00:00
uuid-round-002        | uuid-joa-456            | 2025-11-29 14:00:00
uuid-round-003        | uuid-trgg-123           | 2025-11-30 09:00:00
uuid-round-003        | uuid-joa-456            | 2025-11-30 09:00:00  ← Multi-society!
```

### Modified Tables

#### 3. `rounds` (existing table - add column)

```sql
ALTER TABLE rounds
  ADD COLUMN primary_society_id UUID REFERENCES society_profiles(id);
```

**Purpose:** Track the primary society a round belongs to

**Design Decision:**
- `primary_society_id`: The main society (stored on rounds table directly)
- `round_societies`: Additional societies (many-to-many junction table)
- A round MUST have at least a `primary_society_id` OR an entry in `round_societies`

---

## Handicap Calculation Logic

### World Handicap System (WHS) - Adapted for 5 Rounds

#### Formula
```
Score Differential = (Adjusted Gross Score - Course Rating) × (113 / Slope Rating)

Handicap Index = Average of Best 3 of Last 5 Differentials × 0.96
```

#### Calculation Rules

| Rounds Played | Calculation Method                    |
|---------------|---------------------------------------|
| 5+            | Best 3 of last 5 differentials        |
| 4             | Best 2 of last 4 differentials        |
| 3             | Best 2 of last 3 differentials        |
| 1-2           | Best 1 differential (lowest)          |
| 0             | No handicap (NULL)                    |

#### Society-Specific Calculation

**KEY CONCEPT:** Each society only uses rounds from that society!

```sql
-- Example: Calculate TRGG handicap for Pete
SELECT * FROM calculate_society_handicap_index('pgatour29', 'uuid-trgg-123');

-- This function will:
-- 1. Get Pete's last 5 COMPLETED rounds from TRGG only
-- 2. Calculate score differential for each round
-- 3. Take best 3 of 5
-- 4. Average and multiply by 0.96
-- 5. Return handicap index
```

**Rounds Selection Logic:**
```sql
-- A round belongs to a society if:
WHERE (
  rounds.primary_society_id = 'uuid-trgg-123'
  OR
  EXISTS (
    SELECT 1 FROM round_societies
    WHERE round_id = rounds.id
      AND society_id = 'uuid-trgg-123'
  )
)
```

### Universal Handicap Calculation

**Universal handicap uses ALL rounds regardless of society:**

```sql
-- Calculate universal handicap (society_id = NULL)
SELECT * FROM calculate_society_handicap_index('pgatour29', NULL);

-- This uses ALL completed rounds, not filtered by society
```

---

## Application Code Changes

### File Locations and Required Changes

#### 1. Round Saving Logic
**File:** `C:\Users\pete\Documents\MciPro\public\index.html`
**Line:** ~41485 (in the rounds insert section)

**BEFORE:**
```javascript
const legacyInsert = await window.SupabaseDB.client
  .from('rounds')
  .insert({
    golfer_id: player.lineUserId,
    course_id: courseId || null,
    course_name: courseName,
    // ... other fields
  })
  .select()
  .single();
```

**AFTER:**
```javascript
// Get selected societies from UI
const selectedSocieties = this.getSelectedSocieties(); // Returns array of society UUIDs
const primarySociety = selectedSocieties[0] || null;

const legacyInsert = await window.SupabaseDB.client
  .from('rounds')
  .insert({
    golfer_id: player.lineUserId,
    course_id: courseId || null,
    course_name: courseName,
    primary_society_id: primarySociety, // NEW FIELD
    // ... other fields
  })
  .select()
  .single();

// If multiple societies selected, insert into round_societies junction table
if (selectedSocieties.length > 1) {
  await window.SupabaseDB.client.rpc('assign_round_to_societies', {
    p_round_id: legacyInsert.data.id,
    p_society_ids: selectedSocieties
  });
}
```

#### 2. Society Selector UI Component
**File:** `C:\Users\pete\Documents\MciPro\public\index.html`
**Function to Add:** `getSelectedSocieties()`

```javascript
// Add this function to your scorecard class
getSelectedSocieties() {
  // Get selected societies from UI
  const societyCheckboxes = document.querySelectorAll('input[name="round-society"]:checked');
  const societies = Array.from(societyCheckboxes).map(cb => cb.value);

  // If "Universal" is selected, return empty array (will be handled as NULL)
  if (societies.includes('universal')) {
    return []; // No specific society
  }

  return societies;
}
```

#### 3. Display Handicap by Society
**File:** `C:\Users\pete\Documents\MciPro\public\index.html`
**Location:** User profile display section

**NEW FUNCTION:**
```javascript
async function loadGolferHandicaps(golferId) {
  const { data, error } = await window.SupabaseDB.client
    .from('v_golfer_handicaps')
    .select('*')
    .eq('golfer_id', golferId)
    .order('society_name');

  if (error) {
    console.error('Error loading handicaps:', error);
    return;
  }

  // Display handicaps by society
  const handicapDisplay = document.getElementById('handicap-breakdown');
  handicapDisplay.innerHTML = data.map(h => `
    <div class="handicap-item">
      <span class="society-name">${h.society_name}</span>
      <span class="handicap-value">${h.handicap_index}</span>
      <span class="rounds-count">(${h.rounds_count} rounds)</span>
    </div>
  `).join('');
}
```

---

## UI/UX Design

### 1. Society Selector - Round Completion Screen

**Location:** Appears when golfer clicks "Finish Round" button

```
┌─────────────────────────────────────────────────────────────┐
│  Finish Round & Save to History                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Which society does this round count for?                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ☐ TRGG - Travellers Rest Golf Group               │   │
│  │  ☑ JOA Golf Pattaya                                 │   │
│  │  ☐ Ora Ora Golf Society                            │   │
│  │  ☐ Universal (All Societies)                       │   │
│  │  ☐ Private (No Society)                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ℹ️ You can select multiple societies for joint events     │
│                                                             │
│  [Cancel]                              [Save Round]         │
└─────────────────────────────────────────────────────────────┘
```

**Design Specifications:**
- **Checkboxes** (not radio buttons) - allow multiple selections
- **Default Selection:** Golfer's primary society (from profile)
- **Smart Defaults:**
  - If round is part of society_event, auto-select that society
  - If tournament round, auto-select tournament's society
- **Validation:** Must select at least one option OR "Private"
- **"Universal" Option:** If selected, deselects all others (radio-like behavior)

### 2. Handicap Display - Golfer Profile

**Location:** User profile page

```
┌─────────────────────────────────────────────────────────────┐
│  Pete Park's Handicaps                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🌍 Universal Handicap                              │   │
│  │  13.1                                               │   │
│  │  Based on 8 rounds from all societies              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  TRGG - Travellers Rest Golf Group                 │   │
│  │  12.5                                               │   │
│  │  Based on 5 rounds     [View Rounds →]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  JOA Golf Pattaya                                   │   │
│  │  14.2                                               │   │
│  │  Based on 4 rounds     [View Rounds →]             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  + Add Society Membership                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Interactions:**
- **Click Society Card:** Expand to show calculation details
- **"View Rounds" Button:** Show last 5 rounds used for that society's handicap
- **Universal Badge:** Highlighted/emphasized as the "official" handicap

### 3. Round History - Society Tags

**Location:** Round history list

```
┌─────────────────────────────────────────────────────────────┐
│  Round History                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Nov 29, 2025 • Siam Country Club                          │
│  Score: 85 (Net 73)                                         │
│  🏷️ TRGG, JOA                                              │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Nov 27, 2025 • Green Valley                               │
│  Score: 88 (Net 76)                                         │
│  🏷️ JOA                                                     │
│  ────────────────────────────────────────────────────────   │
│                                                             │
│  Nov 25, 2025 • Laem Chabang                               │
│  Score: 82 (Net 70)                                         │
│  🏷️ Private (No Society)                                   │
│  ────────────────────────────────────────────────────────   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4. Event Registration - Auto-Society Assignment

**Location:** Society event registration screen

```
┌─────────────────────────────────────────────────────────────┐
│  Register for TRGG Weekly Tournament                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Event: TRGG Weekly - Siam Country Club                    │
│  Date: Dec 5, 2025                                          │
│                                                             │
│  ✓ This round will automatically count for TRGG            │
│    handicap calculations                                    │
│                                                             │
│  Your current TRGG handicap: 12.5                          │
│  Your universal handicap: 13.1                             │
│                                                             │
│  [Cancel]                              [Register]           │
└─────────────────────────────────────────────────────────────┘
```

---

## Migration Plan

### Phase 1: Database Migration (Run SQL Script)

**File:** `C:\Users\pete\Documents\MciPro\sql\multi-society-handicap-system.sql`

**Steps:**
1. **Backup Database**
   ```bash
   # Backup current database
   pg_dump mcipro > mcipro_backup_pre_society_handicap.sql
   ```

2. **Run Migration Script**
   ```bash
   psql mcipro < multi-society-handicap-system.sql
   ```

3. **Verify Tables Created**
   ```sql
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename IN ('society_handicaps', 'round_societies');
   ```

4. **Check Migration Results**
   ```sql
   -- Should show handicaps created for each golfer-society combination
   SELECT * FROM v_golfer_handicaps;
   ```

### Phase 2: Update Application Code

**Priority 1: Round Saving (Required)**
- [ ] Add `primary_society_id` field to round insert
- [ ] Add society selector UI to finish round screen
- [ ] Implement `assign_round_to_societies()` call for multi-society rounds

**Priority 2: Handicap Display (Recommended)**
- [ ] Add handicap breakdown by society to profile page
- [ ] Show society tags on round history items
- [ ] Display which rounds contribute to which society handicaps

**Priority 3: Enhanced Features (Optional)**
- [ ] Society membership management UI
- [ ] Handicap trend charts per society
- [ ] Compare handicaps across societies
- [ ] Export handicap certificates per society

### Phase 3: Data Cleanup

**Manual Review Tasks:**

1. **Review Auto-Assigned Societies**
   ```sql
   -- Find rounds with no society assigned
   SELECT id, golfer_id, course_name, completed_at
   FROM rounds
   WHERE status = 'completed'
     AND primary_society_id IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM round_societies rs WHERE rs.round_id = rounds.id
     );
   ```

2. **Manually Assign Societies to Unassigned Rounds**
   ```sql
   -- Example: Assign Pete's private rounds to TRGG
   UPDATE rounds
   SET primary_society_id = (SELECT id FROM society_profiles WHERE society_name = 'TRGG')
   WHERE golfer_id = 'pgatour29'
     AND type = 'private'
     AND primary_society_id IS NULL;
   ```

3. **Recalculate All Handicaps**
   ```sql
   -- After manual assignments, recalculate everything
   SELECT * FROM recalculate_all_society_handicaps();
   ```

### Phase 4: Testing

**Test Scenarios:**

1. **Single Society Round**
   - [ ] Complete a round
   - [ ] Select one society
   - [ ] Verify handicap updates for that society only
   - [ ] Check universal handicap also updated

2. **Multi-Society Round**
   - [ ] Complete a round
   - [ ] Select two societies (TRGG + JOA)
   - [ ] Verify BOTH society handicaps update
   - [ ] Check round appears in both societies' round lists

3. **Private Round**
   - [ ] Complete a round
   - [ ] Select "Private (No Society)"
   - [ ] Verify NO society handicap updates
   - [ ] Verify universal handicap DOES update

4. **Society Event Auto-Assignment**
   - [ ] Register for society event
   - [ ] Complete scorecard
   - [ ] Verify society auto-selected
   - [ ] Verify correct society handicap updates

---

## Example Scenarios

### Scenario 1: Pete Plays Three Different Types of Rounds

**Initial State:**
```
Pete's Handicaps:
- TRGG:     12.5 (5 rounds)
- JOA:      14.2 (4 rounds)
- Universal: 13.1 (8 rounds)
```

**Round 1: TRGG Weekly Event**
- Course: Siam Country Club
- Score: 85 (gross)
- Society: TRGG (auto-selected from event)
- Result:
  - ✓ TRGG handicap recalculated (now uses last 5 TRGG rounds including this one)
  - ✗ JOA handicap unchanged (this wasn't a JOA round)
  - ✓ Universal handicap recalculated (includes all rounds)

**Round 2: JOA Monthly Tournament**
- Course: Green Valley
- Score: 88 (gross)
- Society: JOA (auto-selected from event)
- Result:
  - ✗ TRGG handicap unchanged
  - ✓ JOA handicap recalculated (now has 5 rounds, uses best 3)
  - ✓ Universal handicap recalculated

**Round 3: Joint TRGG/JOA Event**
- Course: Laem Chabang
- Score: 82 (gross)
- Society: TRGG + JOA (both selected)
- Result:
  - ✓ TRGG handicap recalculated
  - ✓ JOA handicap recalculated
  - ✓ Universal handicap recalculated

**Final State:**
```sql
-- Query to see Pete's updated handicaps
SELECT * FROM v_golfer_handicaps WHERE golfer_id = 'pgatour29';

Expected Results:
- TRGG:     12.3 (6 rounds) ← Improved!
- JOA:      13.8 (6 rounds) ← Improved!
- Universal: 12.9 (11 rounds) ← Improved!
```

### Scenario 2: New Golfer Joins Multiple Societies

**New Golfer: John Smith**
- Joins TRGG
- Joins JOA
- Starts playing rounds

**Round 1: First TRGG Event**
- Score: 95
- Society: TRGG
- Result:
  ```
  TRGG handicap: 23.5 (1 round, uses best 1)
  Universal: 23.5 (1 round)
  JOA: NULL (no JOA rounds yet)
  ```

**Rounds 2-5: Mix of TRGG and JOA**
- TRGG rounds: 95, 92, 88, 90 (4 total)
- JOA rounds: 91, 89 (2 total)

**Result After 6 Rounds:**
```
TRGG handicap: 19.8 (4 rounds, uses best 2 of 4)
JOA handicap: 18.2 (2 rounds, uses best 1)
Universal: 19.1 (6 rounds, uses best 3 of 5)
```

**Explanation:**
- TRGG uses ONLY TRGG rounds (4 rounds)
- JOA uses ONLY JOA rounds (2 rounds)
- Universal uses ALL rounds (6 rounds)
- Each calculated independently!

### Scenario 3: Golfer Switches Primary Society

**Background:**
- Pete primarily played TRGG for 2 years
- Now wants to focus on JOA
- Keeps TRGG membership but plays less

**Before Switch:**
```
TRGG: 12.5 (20+ rounds over time, system uses last 5)
JOA: 14.2 (only 4 rounds)
```

**After Playing 10 More JOA Rounds:**
```
TRGG: 13.2 (still based on old TRGG rounds, no new ones)
JOA: 11.8 (now has 14 rounds, uses best 3 of last 5)
Universal: 12.3 (all rounds combined)
```

**Key Insight:**
- TRGG handicap will stay frozen at his last TRGG rounds
- JOA handicap improves as he plays more JOA events
- Societies remain independent!

---

## Testing Checklist

### Database Tests

- [ ] **Create society_handicaps table**
  ```sql
  SELECT count(*) FROM society_handicaps; -- Should have records
  ```

- [ ] **Create round_societies table**
  ```sql
  SELECT count(*) FROM round_societies; -- Should have records
  ```

- [ ] **Verify triggers exist**
  ```sql
  SELECT tgname FROM pg_trigger WHERE tgname LIKE '%society%';
  ```

- [ ] **Test calculate_society_handicap_index function**
  ```sql
  SELECT * FROM calculate_society_handicap_index('pgatour29', 'uuid-trgg');
  ```

- [ ] **Test universal handicap calculation**
  ```sql
  SELECT * FROM calculate_society_handicap_index('pgatour29', NULL);
  ```

- [ ] **Verify views work**
  ```sql
  SELECT * FROM v_golfer_handicaps LIMIT 10;
  SELECT * FROM v_round_societies_detail LIMIT 10;
  ```

### Application Tests

- [ ] **Society selector appears on finish round**
- [ ] **Can select single society**
- [ ] **Can select multiple societies**
- [ ] **"Private" option excludes all societies**
- [ ] **Round saves with primary_society_id**
- [ ] **Multi-society rounds create round_societies entries**
- [ ] **Handicap display shows all societies**
- [ ] **Round history shows society tags**
- [ ] **Society event auto-selects correct society**

### Integration Tests

- [ ] **Complete TRGG round → TRGG handicap updates**
- [ ] **Complete JOA round → JOA handicap updates**
- [ ] **Complete multi-society round → Both update**
- [ ] **Complete private round → Only universal updates**
- [ ] **Delete round → Handicaps recalculate correctly**
- [ ] **Change round society → Handicaps adjust**

### Edge Case Tests

- [ ] **Golfer with 0 rounds → No handicap (NULL)**
- [ ] **Golfer with 1 round → Single differential used**
- [ ] **Golfer with exactly 5 rounds → Best 3 of 5**
- [ ] **Plus handicap (scratch golfer) → Negative value allowed**
- [ ] **Round with no society → Universal only**
- [ ] **Delete society → Cascades correctly**

---

## API Reference

### Database Functions

#### `calculate_society_handicap_index(golfer_id, society_id)`
Calculate handicap index for a golfer in a specific society.

**Parameters:**
- `golfer_id` (TEXT): LINE user ID of golfer
- `society_id` (UUID): Society UUID, or NULL for universal

**Returns:**
- `new_handicap_index` (DECIMAL): Calculated handicap
- `rounds_used` (INTEGER): Number of rounds used
- `all_differentials` (JSONB): Array of all score differentials
- `best_differentials` (JSONB): Best differentials used in calculation

**Example:**
```sql
SELECT * FROM calculate_society_handicap_index('pgatour29', 'uuid-trgg-123');

Result:
  new_handicap_index: 12.5
  rounds_used: 5
  all_differentials: [14.2, 12.8, 10.5, 15.3, 11.9]
  best_differentials: [10.5, 11.9, 12.8]
```

#### `get_golfer_society_handicap(golfer_id, society_id)`
Get current handicap for a golfer in a specific society.

**Parameters:**
- `golfer_id` (TEXT): LINE user ID
- `society_id` (UUID): Society UUID, or NULL for universal

**Returns:**
- `DECIMAL`: Current handicap index

**Example:**
```sql
SELECT get_golfer_society_handicap('pgatour29', 'uuid-trgg-123');
-- Returns: 12.5
```

#### `assign_round_to_societies(round_id, society_ids[])`
Assign a round to multiple societies at once.

**Parameters:**
- `round_id` (UUID): Round UUID
- `society_ids` (UUID[]): Array of society UUIDs

**Returns:**
- `INTEGER`: Number of societies assigned

**Example:**
```sql
SELECT assign_round_to_societies(
  'uuid-round-001',
  ARRAY['uuid-trgg-123', 'uuid-joa-456']::UUID[]
);
-- Returns: 2
```

#### `recalculate_all_society_handicaps()`
Batch recalculate all handicaps for all golfers across all societies.

**Parameters:** None

**Returns:**
- Table of results with columns:
  - `golfer_id` (TEXT)
  - `society_id` (UUID)
  - `society_name` (TEXT)
  - `new_handicap` (DECIMAL)
  - `rounds_used` (INTEGER)

**Example:**
```sql
SELECT * FROM recalculate_all_society_handicaps();

Result:
  golfer_id  | society_id  | society_name | new_handicap | rounds_used
  -----------+-------------+--------------+--------------+------------
  pgatour29  | uuid-trgg   | TRGG         | 12.5         | 5
  pgatour29  | uuid-joa    | JOA          | 14.2         | 4
  pgatour29  | NULL        | Universal    | 13.1         | 8
  ...
```

### JavaScript API (Frontend)

#### `saveRoundWithSocieties(roundData, societyIds)`
Save a completed round with society assignments.

**Parameters:**
```javascript
{
  roundData: {
    golfer_id: 'pgatour29',
    course_id: 'uuid-course',
    total_gross: 85,
    // ... other round fields
  },
  societyIds: ['uuid-trgg-123', 'uuid-joa-456'] // Array of UUIDs
}
```

**Example:**
```javascript
const roundData = {
  golfer_id: currentUser.lineUserId,
  course_id: selectedCourse.id,
  course_name: selectedCourse.name,
  total_gross: 85,
  total_net: 73,
  handicap_used: 12.5,
  status: 'completed'
};

const selectedSocieties = getSelectedSocieties(); // From UI

await saveRoundWithSocieties(roundData, selectedSocieties);
```

#### `loadGolferHandicaps(golferId)`
Load all handicaps for a golfer across all societies.

**Returns:**
```javascript
[
  {
    golfer_id: 'pgatour29',
    golfer_name: 'Pete Park',
    society_id: 'uuid-trgg-123',
    society_name: 'TRGG',
    handicap_index: 12.5,
    rounds_count: 5,
    last_calculated_at: '2025-11-29T10:00:00Z'
  },
  {
    golfer_id: 'pgatour29',
    society_id: 'uuid-joa-456',
    society_name: 'JOA Golf Pattaya',
    handicap_index: 14.2,
    rounds_count: 4
  },
  {
    golfer_id: 'pgatour29',
    society_id: null,
    society_name: 'Universal',
    handicap_index: 13.1,
    rounds_count: 8
  }
]
```

---

## Appendix: Database Relationships Diagram

```
┌─────────────────────────┐
│   society_profiles      │
│  ───────────────────── │
│  id (PK)                │
│  organizer_id           │
│  society_name           │
│  society_logo           │
└───────────┬─────────────┘
            │
            │ 1:N
            │
┌───────────▼─────────────┐           ┌─────────────────────────┐
│   society_handicaps     │           │   rounds                │
│  ───────────────────── │           │  ───────────────────── │
│  id (PK)                │           │  id (PK)                │
│  golfer_id              │◄──────────┤  golfer_id              │
│  society_id (FK) ───────┘           │  primary_society_id (FK)│
│  handicap_index         │           │  total_gross            │
│  rounds_count           │           │  completed_at           │
│  last_calculated_at     │           │  status                 │
└─────────────────────────┘           └───────────┬─────────────┘
                                                  │
                                                  │ N:M
                                                  │
                                      ┌───────────▼─────────────┐
                                      │   round_societies       │
                                      │  ───────────────────── │
                                      │  round_id (FK)          │
                                      │  society_id (FK)        │
                                      └─────────────────────────┘
```

---

## Deployment Summary

**SQL Migration File:**
- `C:\Users\pete\Documents\MciPro\sql\multi-society-handicap-system.sql`

**Key Features Implemented:**
1. ✓ Independent handicap tracking per society
2. ✓ Multi-society round support
3. ✓ Automatic trigger-based updates
4. ✓ Universal handicap option
5. ✓ Backward compatible migration
6. ✓ WHS-compliant calculations
7. ✓ Complete RLS policies
8. ✓ Helper functions and views

**Next Steps:**
1. Run SQL migration in Supabase SQL Editor
2. Update frontend to add society selector UI
3. Test with real data
4. Roll out to users

**Questions? Contact Pete Park (pgatour29)**

---

**End of Design Document**
