# Organizer PIN Login & Dual-Role Implementation - Nov 30, 2025

## Summary
Implemented database-based PIN authentication for society organizers on login page and added dual-role functionality allowing organizers to also act as golfers.

## Problems Fixed

### 1. Hardcoded PIN on Login Page
**Problem**: The "Society Organizer" button on login page used hardcoded PIN '6789' instead of database-based per-organizer PINs

**Location**: `public/index.html:21630-1662` (loginWithPin function)

**Solution**:
- Modified `loginWithPin('society')` to use `SocietyOrganizerAuth` modal
- Database function `verify_society_organizer_pin()` validates PIN per organizer
- Checks if organizer has PIN set via `organizer_has_pin()` RPC function
- If no PIN set → direct access
- If PIN set → shows modal for verification

### 2. Role Mapping Issue
**Problem**: Role 'society' didn't map to 'societyOrganizerDashboard' in FallbackAuthentication

**Location**: `public/index.html:7795-7803`

**Solution**:
- Added `'society': 'societyOrganizerDashboard'` to dashboardMap
- Supports both 'society' and 'society_organizer' role names

### 3. No Dual-Role Support
**Problem**: Organizers couldn't also be golfers - no way to switch between roles

**Solution**: Created `RoleSwitcher` system

---

## New Features

### 1. Database-Based PIN Login for Organizers

**File**: `public/index.html:21630-1692`

**Flow**:
```javascript
loginWithPin('society')
  ↓
Check if AppState.currentUser.lineUserId exists
  ↓
If YES → Check if organizer has PIN in database
  ↓
If PIN exists → Show SocietyOrganizerAuth modal
  ↓
User enters PIN → verify_society_organizer_pin(org_id, input_pin)
  ↓
If valid → Navigate to societyOrganizerDashboard
```

**Code Reference**: `public/index.html:21630-1660`

---

### 2. RoleSwitcher System (Dual-Role Support)

**File**: `public/index.html:58247-58373`

**Features**:
- **Check Organizer Status**: `isUserOrganizer()` - Queries database to check if user has organizer PIN
- **Auto-Detection**: `init()` - Shows/hides "Switch to Organizer" button based on status
- **Switch to Golfer**: `switchToGolfer()` - Seamlessly switch from organizer → golfer dashboard
- **Switch to Organizer**: `switchToOrganizer()` - Switch from golfer → organizer (requires PIN if set)

**UI Buttons**:
1. **Society Organizer Dashboard** (line 29298-29301):
   ```html
   <button onclick="RoleSwitcher.switchToGolfer()" class="btn-secondary">
       My Golfer Profile
   </button>
   ```

2. **Golfer Dashboard** (line 22108-22110):
   ```html
   <button id="switchToOrganizerBtn" onclick="RoleSwitcher.switchToOrganizer()">
       <span class="material-symbols-outlined">groups</span>
   </button>
   ```
   - Only visible if user is an organizer
   - Auto-detected via `RoleSwitcher.init()` on dashboard load

---

## Implementation Details

### Modified Functions

#### 1. `loginWithPin()` - Line 21630
**Before**:
```javascript
// Hardcoded PIN check for all roles
if (pin === '6789') {
    return window.login(role);
}
```

**After**:
```javascript
// Special handling for society organizers
if (role === 'society') {
    const organizerRole = 'society_organizer';

    // Check if organizer has PIN in database
    const hasPinSet = await SocietyOrganizerAuth.checkIfPinRequired();

    if (hasPinSet) {
        // Show database-validated PIN modal
        SocietyOrganizerAuth.pendingDashboard = 'societyOrganizerDashboard';
        SocietyOrganizerAuth.showPinModal(organizerRole);
        return true;
    } else {
        // No PIN required - direct access
        return window.login(organizerRole);
    }
}
```

#### 2. `FallbackAuthentication.login()` - Line 7795
**Before**:
```javascript
const dashboardMap = {
    'golfer': 'golferDashboard',
    'caddie': 'caddieDashboard',
    'manager': 'managerDashboard',
    'proshop': 'proshopDashboard',
    'society_organizer': 'societyOrganizerDashboard',
    'maintenance': 'maintenanceDashboard'
};
```

**After**:
```javascript
const dashboardMap = {
    'golfer': 'golferDashboard',
    'caddie': 'caddieDashboard',
    'manager': 'managerDashboard',
    'proshop': 'proshopDashboard',
    'society': 'societyOrganizerDashboard', // NEW: Support 'society' role
    'society_organizer': 'societyOrganizerDashboard',
    'maintenance': 'maintenanceDashboard'
};
```

#### 3. `initGolferDashboard()` - Line 6086
**Added**:
```javascript
// Initialize role switcher to show "Switch to Organizer" button if applicable
if (typeof RoleSwitcher !== 'undefined' && RoleSwitcher.init) {
    RoleSwitcher.init();
}
```

---

## RoleSwitcher API

### Methods

#### `async isUserOrganizer()`
**Returns**: `boolean`
**Purpose**: Checks if current user is a society organizer by querying database
**Database Call**: `organizer_has_pin(org_id: lineUserId)`

#### `async init()`
**Returns**: `void`
**Purpose**: Shows/hides "Switch to Organizer" button based on organizer status
**Called**: Automatically when Golfer Dashboard loads

#### `switchToGolfer()`
**Returns**: `void`
**Purpose**: Switch from Society Organizer → Golfer profile
**Actions**:
- Updates `AppState.currentUser.role = 'golfer'`
- Updates localStorage profile
- Navigates to `golferDashboard`
- Reinitializes RoleSwitcher to show organizer button

#### `async switchToOrganizer()`
**Returns**: `void`
**Purpose**: Switch from Golfer → Society Organizer dashboard
**Actions**:
- Updates `AppState.currentUser.role = 'society_organizer'`
- Updates localStorage profile
- Checks if PIN is required
- If PIN required → Shows PIN modal
- If no PIN or already verified → Navigates to `societyOrganizerDashboard`

---

## Database Functions Used

All implemented in `sql/society-organizer-pin-auth-per-organizer.sql`:

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `organizer_has_pin` | `org_id TEXT` | `BOOLEAN` | Check if organizer has PIN set |
| `verify_society_organizer_pin` | `org_id TEXT, input_pin TEXT` | `TEXT` (role) | Verify PIN and return role |

---

## User Flow Examples

### Example 1: Organizer with PIN Logs In
1. User clicks "Society Organizer" button on login page
2. `loginWithPin('society')` checks database for PIN
3. PIN exists → Shows `SocietyOrganizerAuth` modal
4. User enters PIN → `verify_society_organizer_pin()` validates
5. If correct → Navigate to Society Organizer Dashboard
6. User sees "My Golfer Profile" button in header

### Example 2: Organizer Switches to Golfer
1. From Society Organizer Dashboard, click "My Golfer Profile"
2. `RoleSwitcher.switchToGolfer()` updates role to 'golfer'
3. Navigate to Golfer Dashboard
4. "Switch to Organizer" button appears in header (via `RoleSwitcher.init()`)
5. User can now register for society events as a golfer

### Example 3: Golfer Who Is Also Organizer
1. User logs in as golfer
2. Golfer Dashboard loads → `RoleSwitcher.init()` runs
3. Detects user is organizer via database check
4. "Switch to Organizer" button becomes visible
5. Click button → PIN modal appears (if PIN set)
6. Enter PIN → Navigate to Society Organizer Dashboard

---

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `public/index.html` | 21630-1692 | Modified `loginWithPin()` for database PIN |
| `public/index.html` | 7800 | Added 'society' role mapping |
| `public/index.html` | 22108-22110 | Added "Switch to Organizer" button |
| `public/index.html` | 29298-29301 | Added "My Golfer Profile" button |
| `public/index.html` | 58247-58373 | New RoleSwitcher system |
| `public/index.html` | 6100-6102, 6113-6115 | Initialize RoleSwitcher on dashboard load |

**Total Changes**: 187 insertions, 8 deletions

---

## Git Commits

**Initial Implementation**:
- **Commit**: `6c4c49fb`
- **Message**: "Implement organizer PIN login and dual-role functionality"
- **Date**: Nov 30, 2025

**Bug Fix**:
- **Commit**: `4f8e7e36`
- **Message**: "Fix: Add society_organizer profile to FallbackAuthentication"
- **Date**: Nov 30, 2025
- **Issue Fixed**: `Cannot read properties of undefined (reading 'name')` error in fallback mode
- **Solution**: Added `'society_organizer'` profile entry to `userProfiles` object in FallbackAuthentication

---

## Deployment

**Initial Deployment**:
- **Command**: `vercel --prod`
- **Vercel URL**: https://mcipro-golf-platform-hu3wo7s8x-mcipros-projects.vercel.app
- **Status**: ✅ Deployed Successfully
- **Commit**: `6c4c49fb`

**Bug Fix Deployment**:
- **Command**: `vercel --prod`
- **Vercel URL**: https://mcipro-golf-platform-1ygr6ltxx-mcipros-projects.vercel.app
- **Status**: ✅ Deployed Successfully
- **Commit**: `4f8e7e36`
- **Fix**: Resolved `Cannot read properties of undefined (reading 'name')` error

**Production Aliases**:
- **Primary URL**: https://www.mycaddipro.com
- **Alternate URL**: https://mycaddipro.com
- **Aliased**: `vercel alias mcipro-golf-platform-1ygr6ltxx-mcipros-projects.vercel.app www.mycaddipro.com`
- **Status**: ✅ Live on Production Domain

---

## Testing Checklist

- [ ] Society Organizer button on login page shows PIN modal (not hardcoded prompt)
- [ ] PIN verification uses database (organizer-specific PIN)
- [ ] Organizer can access society dashboard after PIN entry
- [ ] "My Golfer Profile" button visible in Society Organizer Dashboard
- [ ] Clicking "My Golfer Profile" switches to Golfer Dashboard
- [ ] "Switch to Organizer" button visible in Golfer Dashboard (only if user is organizer)
- [ ] Clicking "Switch to Organizer" shows PIN modal if PIN is set
- [ ] After PIN verification, user reaches Society Organizer Dashboard
- [ ] Organizer can register for events when in Golfer role
- [ ] Role switches persist in localStorage
- [ ] RoleSwitcher.init() auto-detects organizer status correctly

---

## Security Features

1. **Database-Based PIN**: Each organizer has unique PIN stored in database
2. **Session Verification**: PIN verification stored in `sessionStorage` (clears on browser close)
3. **PIN Required on Role Switch**: Switching to organizer role requires PIN re-entry if not verified
4. **Auto-Detection**: RoleSwitcher only shows button if user is confirmed organizer in database

---

## Future Enhancements

1. **Role Permissions**: Add granular permissions for what organizers can do as golfers
2. **Role History**: Track when users switch between roles
3. **Notification**: Show notification when role switches
4. **Mobile UI**: Optimize role switcher buttons for mobile screens
5. **Multi-Society Support**: Allow organizers to manage multiple societies and switch between them

---

## Related Documentation

- `SOCIETY_PIN_PER_ORGANIZER_DEPLOYED.md` - Original PIN auth implementation
- `sql/society-organizer-pin-auth-per-organizer.sql` - Database schema for PINs
- `compacted/2025-11-06-LOGIN-PAGE-PIN-PROTECTION.md` - Login page PIN protection

---

## Technical Notes

### Why Two Role Names?
- `'society'`: Used on login page button for simplicity
- `'society_organizer'`: Internal role name used in AppState and database
- Both now properly map to `societyOrganizerDashboard`

### RoleSwitcher vs DevMode
- **DevMode**: Development tool for testing different roles (visible in dev environment)
- **RoleSwitcher**: Production feature for dual-role users (organizer + golfer)
- RoleSwitcher uses PIN authentication; DevMode bypasses it

### Session Management
- Role is stored in `AppState.currentUser.role`
- Also persisted in `localStorage` under `mcipro_user_profiles`
- PIN verification status in `sessionStorage.society_organizer_verified`

---

## Troubleshooting

**Issue**: "Switch to Organizer" button doesn't appear
**Fix**: User must have PIN set in database. Check via:
```sql
SELECT * FROM society_organizer_access WHERE organizer_id = 'USER_LINE_ID';
```

**Issue**: PIN modal doesn't show on login
**Fix**: Ensure `SocietyOrganizerAuth` is loaded before `loginWithPin()` is called

**Issue**: Role switch doesn't work
**Fix**: Check browser console for errors. Ensure `RoleSwitcher` is defined globally

**Issue**: `Cannot read properties of undefined (reading 'name')` error
**Symptoms**:
- Error at line 7767 when logging in as Society Organizer
- Console shows: `[loginWithPin] No LINE user ID - using fallback authentication`
- Error occurs in FallbackAuthentication.login()

**Root Cause**:
- `loginWithPin('society')` converts role to `'society_organizer'`
- FallbackAuthentication.login() tries to access `userProfiles['society_organizer']`
- But `userProfiles` object only had `'society'` key, not `'society_organizer'`

**Fix Applied** (Commit 4f8e7e36):
- Added `'society_organizer'` profile to `userProfiles` object
- Now supports both role names in fallback mode

**Verification**:
```javascript
// Check in browser console:
FallbackAuthentication.login('society_organizer')
// Should not throw error
```

---

## Contact

For issues or questions about this implementation, check:
- Console logs prefixed with `[RoleSwitcher]`
- Console logs prefixed with `[loginWithPin]`
- Network tab for Supabase RPC calls to `organizer_has_pin` and `verify_society_organizer_pin`
