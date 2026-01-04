# Scripts Catalog
## Location: C:\Users\pete\Documents\MciPro\scripts\
## Last Updated: 2025-12-27

## Handicap Scripts

### update_trgg_handicaps.js
**Purpose:** Update TRGG society handicaps from master spreadsheet
**Usage:** `node scripts/update_trgg_handicaps.js`

### force_fix_pete.js
**Purpose:** Force fix all Pete Park handicap data across all tables
**Usage:** `node scripts/force_fix_pete.js`
**Actions:**
- Updates user_profiles.profile_data.handicap
- Updates society_handicaps (universal + TRGG)
- Fixes any 1.0 values in event_registrations
- Fixes any 1.0 values in rounds

### check_pete_diffs.js
**Purpose:** Check Pete Park's round differentials for handicap calculation
**Usage:** `node scripts/check_pete_diffs.js`

---

## PowerShell Scripts (Root Directory)

### check_alan.ps1 / check_alan_full.ps1
Check Alan's profile and handicap data

### check_rocky.ps1 / check_rocky2.ps1 / check_rocky3.ps1 / check_rocky4.ps1
Check Rocky's profile and event data

### check_pete_duplicates.ps1
Find duplicate registrations for Pete Park

### check_pete_registrations.ps1
List all event registrations for Pete Park

### check_pete_rounds.ps1
List all rounds for Pete Park

### check_pete_stableford.ps1
Verify Stableford calculations for Pete Park

### check_all_duplicates.ps1
Find all duplicate registrations across all users

### check_brc_event.ps1
Check BRC event registrations

### check_hole1.ps1 / check_hole12.ps1
Check specific hole scoring issues

### check_notifications.ps1
Debug push notification issues

### check_round_holes.ps1
Verify round_holes data integrity

---

## Database Maintenance

### Common Supabase Queries

**Check user handicaps:**
```javascript
const { data } = await supabase
  .from('society_handicaps')
  .select('*')
  .eq('golfer_id', 'U2b6d976f19bca4b2f4374ae0e10ed873');
```

**Update handicap:**
```javascript
await supabase
  .from('society_handicaps')
  .update({ handicap_index: 3.6 })
  .eq('golfer_id', 'GOLFER_ID')
  .is('society_id', null);  // Universal handicap
```

**Check profile data:**
```javascript
const { data } = await supabase
  .from('user_profiles')
  .select('profile_data, handicap_index')
  .eq('line_user_id', 'USER_ID')
  .single();
```

---

## Key IDs Reference

| Entity | ID |
|--------|-----|
| Pete Park LINE ID | U2b6d976f19bca4b2f4374ae0e10ed873 |
| TRGG Society ID | 7c0e4b72-d925-44bc-afda-38259a7ba346 |
| Pete Universal HCP | 3.6 |
| Pete TRGG HCP | 2.5 |

---

## Running Scripts

```powershell
# From project root
cd C:\Users\pete\Documents\MciPro

# Run Node.js scripts
node scripts/update_trgg_handicaps.js
node scripts/force_fix_pete.js

# Run PowerShell scripts
.\check_pete_duplicates.ps1
```
