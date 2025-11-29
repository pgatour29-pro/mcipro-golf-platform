# Multi-Society Handicap System - Quick Start Guide

## Files Created

1. **SQL Migration Script:** `C:\Users\pete\Documents\MciPro\sql\multi-society-handicap-system.sql`
   - Complete database schema
   - Automatic triggers
   - Helper functions
   - Data migration from existing system

2. **Complete Design Document:** `C:\Users\pete\Documents\MciPro\MULTI_SOCIETY_HANDICAP_DESIGN.md`
   - Full system architecture
   - UI/UX mockups
   - Application code changes
   - Testing checklist
   - Example scenarios

---

## Quick Deploy (5 Steps)

### Step 1: Backup Database
```bash
# Create backup before migration
pg_dump mcipro > mcipro_backup_$(date +%Y%m%d).sql
```

### Step 2: Run SQL Migration
```bash
# In Supabase SQL Editor, paste and run:
C:\Users\pete\Documents\MciPro\sql\multi-society-handicap-system.sql

# OR via command line:
psql mcipro < C:\Users\pete\Documents\MciPro\sql\multi-society-handicap-system.sql
```

### Step 3: Verify Migration
```sql
-- Check tables created
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('society_handicaps', 'round_societies');

-- View migrated handicaps
SELECT * FROM v_golfer_handicaps LIMIT 10;
```

### Step 4: Update Frontend Code

**File:** `C:\Users\pete\Documents\MciPro\public\index.html`

**Find this section (around line 41485):**
```javascript
const legacyInsert = await window.SupabaseDB.client
  .from('rounds')
  .insert({
    golfer_id: player.lineUserId,
    course_id: courseId || null,
    course_name: courseName,
    // ... existing fields
  })
```

**Add these two lines:**
```javascript
const selectedSocieties = this.getSelectedSocieties(); // NEW
const primarySociety = selectedSocieties[0] || null;   // NEW

const legacyInsert = await window.SupabaseDB.client
  .from('rounds')
  .insert({
    golfer_id: player.lineUserId,
    course_id: courseId || null,
    course_name: courseName,
    primary_society_id: primarySociety,  // NEW FIELD
    // ... existing fields
  })
```

**Add after round insert:**
```javascript
// If multiple societies selected, insert into junction table
if (selectedSocieties.length > 1) {
  await window.SupabaseDB.client.rpc('assign_round_to_societies', {
    p_round_id: legacyInsert.data.id,
    p_society_ids: selectedSocieties
  });
}
```

### Step 5: Add Society Selector UI

Add this HTML before the "Finish Round" button:

```html
<div id="society-selector" class="mb-4">
  <label class="block text-sm font-medium text-gray-700 mb-2">
    Which society does this round count for?
  </label>
  <div class="space-y-2">
    <!-- Will be populated with societies from database -->
    <div id="society-checkboxes"></div>
  </div>
  <p class="text-sm text-gray-500 mt-2">
    ℹ️ Select multiple for joint events
  </p>
</div>
```

Add this JavaScript function:

```javascript
// Load societies and create checkboxes
async function loadSocietySelector() {
  const { data: societies } = await window.SupabaseDB.client
    .from('society_profiles')
    .select('id, society_name')
    .order('society_name');

  const container = document.getElementById('society-checkboxes');
  container.innerHTML = societies.map(s => `
    <label class="flex items-center">
      <input type="checkbox" name="round-society" value="${s.id}"
             class="mr-2 rounded border-gray-300">
      <span>${s.society_name}</span>
    </label>
  `).join('') + `
    <label class="flex items-center">
      <input type="checkbox" name="round-society" value="private"
             class="mr-2 rounded border-gray-300">
      <span>Private (No Society)</span>
    </label>
  `;
}

// Get selected societies from UI
function getSelectedSocieties() {
  const checkboxes = document.querySelectorAll('input[name="round-society"]:checked');
  const values = Array.from(checkboxes).map(cb => cb.value);

  // If "private" selected, return empty array
  if (values.includes('private')) return [];

  return values;
}
```

---

## Key Concepts

### 1. Independent Handicap Per Society
Each society calculates handicaps using ONLY their own rounds.

```
Pete's Rounds:
  TRGG: 5 rounds → TRGG handicap = 12.5
  JOA:  4 rounds → JOA handicap = 14.2
  All:  8 rounds → Universal = 13.1
```

### 2. Multi-Society Rounds
A round can count for multiple societies simultaneously.

```sql
-- Joint TRGG/JOA event
INSERT INTO rounds (golfer_id, primary_society_id, ...) VALUES (...);
-- Round ID: uuid-123

-- Also assign to JOA
INSERT INTO round_societies (round_id, society_id)
VALUES ('uuid-123', 'uuid-joa');

-- Result: This round updates BOTH TRGG and JOA handicaps
```

### 3. Automatic Updates
Triggers handle everything automatically!

```
Round Completed
    ↓
Trigger Fires
    ↓
For Each Society Round Belongs To:
  1. Get last 5 rounds from that society
  2. Calculate best 3 of 5
  3. Update society_handicaps table
    ↓
Also Update Universal Handicap
```

---

## Testing Your Deployment

### Test 1: View Current Handicaps
```sql
SELECT * FROM v_golfer_handicaps
WHERE golfer_id = 'pgatour29';
```

**Expected Result:**
```
golfer_id | society_name | handicap_index | rounds_count
----------+--------------+----------------+-------------
pgatour29 | TRGG         | 12.5          | 5
pgatour29 | JOA          | 14.2          | 4
pgatour29 | Universal    | 13.1          | 8
```

### Test 2: Complete a Test Round

1. Go to Live Scorecard
2. Play a round
3. Click "Finish Round"
4. Select "TRGG" society
5. Save round

**Verify:**
```sql
-- Check round has society assigned
SELECT id, primary_society_id FROM rounds
ORDER BY completed_at DESC LIMIT 1;

-- Check TRGG handicap updated
SELECT * FROM society_handicaps
WHERE golfer_id = 'YOUR_ID' AND society_id = (
  SELECT id FROM society_profiles WHERE society_name = 'TRGG'
);
```

### Test 3: Multi-Society Round

1. Complete a round
2. Select BOTH "TRGG" and "JOA"
3. Save

**Verify:**
```sql
-- Check junction table has both entries
SELECT * FROM round_societies
WHERE round_id = 'YOUR_ROUND_ID';

-- Both society handicaps should update
SELECT * FROM v_golfer_handicaps WHERE golfer_id = 'YOUR_ID';
```

---

## Common Queries

### Get Golfer's Handicap for Specific Society
```sql
SELECT get_golfer_society_handicap('pgatour29', 'uuid-trgg-123');
-- Returns: 12.5
```

### Get Universal Handicap
```sql
SELECT get_golfer_society_handicap('pgatour29', NULL);
-- Returns: 13.1
```

### See Which Societies a Round Belongs To
```sql
SELECT * FROM v_round_societies_detail
WHERE round_id = 'uuid-round-123';
```

### Recalculate All Handicaps
```sql
SELECT * FROM recalculate_all_society_handicaps();
```

### View Rounds Used for Society Handicap
```sql
-- Get last 5 TRGG rounds for Pete
SELECT r.*
FROM rounds r
LEFT JOIN round_societies rs ON rs.round_id = r.id
WHERE r.golfer_id = 'pgatour29'
  AND r.status = 'completed'
  AND (
    r.primary_society_id = 'uuid-trgg-123'
    OR rs.society_id = 'uuid-trgg-123'
  )
ORDER BY r.completed_at DESC
LIMIT 5;
```

---

## Troubleshooting

### Issue: Handicap Not Updating

**Check:**
1. Round status is 'completed'
2. total_gross is not NULL
3. Society is assigned (primary_society_id or round_societies entry)

**Debug:**
```sql
-- Check trigger fired
SELECT * FROM society_handicaps
WHERE golfer_id = 'YOUR_ID'
ORDER BY updated_at DESC;

-- Manually recalculate
SELECT * FROM calculate_society_handicap_index('YOUR_ID', 'SOCIETY_UUID');
```

### Issue: Wrong Societies Assigned

**Fix:**
```sql
-- Update round's primary society
UPDATE rounds
SET primary_society_id = 'correct-society-uuid'
WHERE id = 'round-uuid';

-- Or add/remove from round_societies
INSERT INTO round_societies (round_id, society_id)
VALUES ('round-uuid', 'society-uuid');

DELETE FROM round_societies
WHERE round_id = 'round-uuid' AND society_id = 'wrong-society-uuid';
```

### Issue: Need to Recalculate Everything

**Solution:**
```sql
-- Nuclear option: recalculate all handicaps for all golfers
SELECT * FROM recalculate_all_society_handicaps();
```

---

## Database Schema Quick Reference

### Tables

1. **society_handicaps** - Stores handicaps per golfer per society
   - PK: (golfer_id, society_id)
   - society_id = NULL → Universal handicap

2. **round_societies** - Junction table for multi-society rounds
   - PK: (round_id, society_id)
   - Allows N:M relationship

3. **rounds** (modified) - Added primary_society_id column
   - FK to society_profiles

### Key Functions

- `calculate_society_handicap_index(golfer_id, society_id)` - Calculate handicap
- `update_society_handicap(...)` - Update handicap record
- `get_golfer_society_handicap(golfer_id, society_id)` - Get current handicap
- `assign_round_to_societies(round_id, society_ids[])` - Bulk assign societies
- `recalculate_all_society_handicaps()` - Batch recalculation

### Views

- `v_golfer_handicaps` - All handicaps for all golfers
- `v_round_societies_detail` - Rounds with society assignments

---

## Support

**Questions?** Check the full design document:
`C:\Users\pete\Documents\MciPro\MULTI_SOCIETY_HANDICAP_DESIGN.md`

**Found a bug?** Run verification queries:
```sql
-- Check system health
SELECT
  (SELECT count(*) FROM society_handicaps) as handicaps,
  (SELECT count(*) FROM round_societies) as round_societies,
  (SELECT count(*) FROM rounds WHERE primary_society_id IS NOT NULL) as rounds_with_society;
```

---

**READY TO DEPLOY!** Start with Step 1 above.
