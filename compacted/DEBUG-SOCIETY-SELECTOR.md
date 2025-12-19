# Debug: Society Selector Not Showing

## Issue
After switching to Society Organizer via Dev Tools, the society selector modal doesn't appear.

## Why
The `SocietySelector.init()` is only called on page load, not when Dev Tools switches roles.

## Immediate Fix (Console Commands)

### Step 1: Check your current role
```javascript
console.log('Role:', AppState.currentUser?.role);
console.log('User ID:', AppState.currentUser?.lineUserId);
```

### Step 2: If role is NOT 'admin', manually set it (temporary)
```javascript
AppState.currentUser.role = 'admin';
console.log('Role updated to:', AppState.currentUser.role);
```

### Step 3: Manually trigger society selector
```javascript
SocietySelector.init();
```

This should show the modal with TRGG and JOA.

## Permanent Fix
The SQL must be run to set your database role to 'admin':

```sql
UPDATE user_profiles
SET role = 'admin', updated_at = NOW()
WHERE line_user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
```

Then logout and login again to get the admin role from database.

## Alternative: Force Show Modal
If societies exist but modal won't show:

```javascript
// Check societies
SocietySelector.init().then(() => {
    console.log('Societies found:', SocietySelector.societies);
    if (SocietySelector.societies.length > 0) {
        SocietySelector.show();
    }
});
```

## Check Database
Verify societies exist:
```javascript
supabase.from('society_profiles').select('*').then(console.log);
```

## Full Console Debug Sequence
```javascript
// 1. Set role to admin (temporary)
AppState.currentUser.role = 'admin';

// 2. Initialize selector
await SocietySelector.init();

// 3. Check results
console.log('Societies:', SocietySelector.societies);
console.log('Selected:', SocietySelector.selectedSociety);

// 4. If societies found but modal not showing, force it
if (SocietySelector.societies.length > 0) {
    SocietySelector.renderModal();
    SocietySelector.show();
}
```
