# Society Selector Setup Guide

## Problem
When switching to "Society Organizer" via Dev Tools, only seeing Travellers Rest Golf Group in the selector modal. JOA Golf Pattaya should also appear.

## Root Cause
1. Pete's role in database is not 'admin' (required to see all societies)
2. JOA Golf Pattaya may not exist in `society_profiles` table
3. Duplicate JOA entries causing 5x listing

## Solution

### Step 1: Run SQL Setup in Supabase

1. **Open Supabase Dashboard**:
   - Go to: https://supabase.com/dashboard
   - Select your MciPro project
   - Click "SQL Editor" in the left sidebar

2. **Run the Complete Setup Script**:
   - Open file: `sql/setup-society-selector-complete.sql`
   - Copy ALL contents
   - Paste into Supabase SQL Editor
   - Click **"Run"**

3. **Verify Results**:
   The query results should show:
   ```
   === ALL SOCIETIES ===
   2 rows:
   - Travellers Rest Golf Group (U2b6d976f19bca4b2f4374ae0e10ed873)
   - JOA Golf Pattaya (JOAGOLFPAT)

   === PETE PROFILE ===
   1 row:
   - line_user_id: pgatour29
   - role: admin  ← MUST BE 'admin'

   === DUPLICATE CHECK ===
   0 rows (no duplicates)
   ```

### Step 2: Test in MciPro

1. **Reload MciPro**: https://mcipro-golf-platform-912ei1yug-mcipros-projects.vercel.app

2. **Open Browser DevTools**:
   - Press F12 or Right-click → Inspect
   - Go to Console tab

3. **Switch to Society Organizer**:
   - Click the **Dev Role Switcher** button (bottom right corner)
   - Select **"Society Organizer"**

4. **Expected Behavior**:
   - Society selector modal should appear automatically
   - Should show **2 societies**:
     - Travellers Rest Golf Group
     - JOA Golf Pattaya
   - Each with logo and description

### Step 3: Manual Testing (If Modal Doesn't Appear)

Run these commands in browser console:

```javascript
// 1. Check current user role
console.log('Current role:', AppState.currentUser?.role);
// Should show: "admin"

// 2. Manually trigger society selector
await SocietySelectorSystem.init();
console.log('Societies loaded:', SocietySelectorSystem.societies.length);
// Should show: 2

// 3. Open the modal
SocietySelectorSystem.openModal();
// Modal should appear with TRGG and JOA
```

### Step 4: Select a Society

1. **In the modal**, click on either:
   - Travellers Rest Golf Group → Shows 36 TRGG events
   - JOA Golf Pattaya → Shows 0 events (none created yet)

2. **Verify Events Load**:
   - Console should show:
     ```
     [SocietyOrganizer] Loading events for organizerId: JOAGOLFPAT
     [SocietyGolfDB] Found 0 events for organizer JOAGOLFPAT
     ```
   OR
     ```
     [SocietyOrganizer] Loading events for organizerId: U2b6d976f19bca4b2f4374ae0e10ed873
     [SocietyGolfDB] Found 36 events for organizer U2b6d976f19bca4b2f4374ae0e10ed873
     ```

3. **Switch Between Societies**:
   - Click Dev Tools → Switch to Society Organizer again
   - Modal appears with both societies
   - Select different society
   - Events filter correctly

## Troubleshooting

### Issue: Modal Not Appearing

**Check 1**: Role in Database
```javascript
// In console:
const { data } = await window.SupabaseDB.client
    .from('user_profiles')
    .select('role')
    .eq('line_user_id', 'pgatour29')
    .single();
console.log('Database role:', data?.role);
// Must show: "admin"
```

**Fix**: Run the SQL setup script again

---

### Issue: Only 1 Society Showing

**Check 2**: Society Count in Database
```javascript
// In console:
const { data } = await window.SupabaseDB.client
    .from('society_profiles')
    .select('*');
console.log('Societies in DB:', data?.length);
console.table(data);
// Should show 2 societies
```

**Fix**: Run the SQL setup script to create JOA

---

### Issue: JOA Showing 5 Times

**Check 3**: Duplicate Societies
```javascript
// In console:
const { data } = await window.SupabaseDB.client
    .from('society_profiles')
    .select('society_name, organizer_id');
console.table(data);
// Should see only 2 unique societies
```

**Fix**: SQL setup script includes cleanup of duplicates

---

### Issue: Wrong Events Showing

**Check 4**: Selected Society
```javascript
// In console:
console.log('Selected:', AppState.selectedSociety);
// Should show the society you selected:
// { id: "...", organizerId: "JOAGOLFPAT", name: "JOA Golf Pattaya", logo: "..." }
```

**Check 5**: organizerId in localStorage
```javascript
// In console:
console.log(localStorage.getItem('selectedSocietyOrganizerId'));
// Should match the society you selected:
// "JOAGOLFPAT" for JOA
// "U2b6d976f19bca4b2f4374ae0e10ed873" for TRGG
```

---

## Quick Fix Commands

If things get stuck, run these in console to reset:

```javascript
// Clear society selection
localStorage.removeItem('selectedSocietyId');
localStorage.removeItem('selectedSocietyOrganizerId');
localStorage.removeItem('selectedSocietyName');

// Reload selector
await SocietySelectorSystem.init();
SocietySelectorSystem.openModal();
```

## Expected Final State

✅ **Database**:
- 2 societies in `society_profiles`
- Pete's role = 'admin' in `user_profiles`
- No duplicate societies

✅ **MciPro App**:
- Dev Tools → Society Organizer → Modal appears
- Modal shows 2 societies (TRGG + JOA)
- Can switch between societies
- Events filter correctly per society

✅ **Console Output**:
```
[SocietySelectorSystem] Loaded 2 societies
[SocietySelector] Selected: JOA Golf Pattaya (JOAGOLFPAT)
[SocietyOrganizer] Loading events for organizerId: JOAGOLFPAT
[SocietyGolfDB] Found 0 events for organizer JOAGOLFPAT
```
