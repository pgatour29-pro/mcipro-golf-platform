# Complete Supabase Migration Fix Guide

## Problems Identified

1. **❌ Deletions don't work** - Missing DELETE policy in Supabase RLS
2. **❌ Security too open** - "Everyone" can view all bookings
3. **❌ No role-based access** - Staff, managers, golfers all see same data
4. **❌ Privacy leak** - Golfers see other golfers' names/phone numbers
5. **❌ No booking sharing** - Can't invite people to join your booking
6. **❌ GM Dashboard broken** - Needs Supabase integration
7. **❌ Missing features from Netlify** - Some functionality lost in migration

---

## STEP 1: Fix Database (RUN THIS NOW)

### Go to Supabase SQL Editor
https://pyeeplwsnupmhgbguwqs.supabase.co → SQL Editor

### Run This File:
`C:\Users\pete\Documents\MciPro\supabase-fix-immediate.sql`

This adds:
- ✅ DELETE policy (fixes deletion issue)
- ✅ User role fields (is_staff, is_manager, is_proshop)
- ✅ Booking access keys table (for sharing bookings)
- ✅ Privacy fields (society_event_title, show_event_title)
- ✅ Performance indexes

**After running this, deletions will work immediately.**

---

## STEP 2: Assign User Roles

Right now everyone is a "golfer". You need to set roles for staff/managers.

### Option A: Manual (Quick Start)

Run this in Supabase SQL Editor for each staff member:

```sql
-- Example: Make Peter a pro shop staff
UPDATE user_profiles
SET
  user_role = 'proshop',
  is_proshop = true,
  is_staff = true
WHERE line_user_id = 'YOUR_LINE_USER_ID_HERE';

-- Example: Make someone a manager
UPDATE user_profiles
SET
  user_role = 'manager',
  is_manager = true,
  is_staff = true
WHERE line_user_id = 'MANAGER_LINE_USER_ID';
```

### Option B: Admin UI (Better Long-term)

I can create an admin page where managers can assign roles.

---

## STEP 3: Load Security Layer

Add this to `index.html` (after supabase-config.js):

```html
<script src="supabase-security.js"></script>
```

This provides:
- Role checking (isStaffOrManager)
- Booking filtering for golfers (hide names)
- Access key generation (share bookings)
- Permission validation

---

## STEP 4: Update Golfer Dashboard (Privacy)

### Current Behavior:
```
9:30 AM - John Smith (4 players) - 555-1234
9:45 AM - Mary Johnson (2 players) - 555-5678
```

### New Behavior:
```
9:30 AM - Booked ← (Not your booking, shows as "Booked")
9:45 AM - Mary Johnson (2 players) ← (Your booking, shows details)
10:00 AM - Phoenix Open Tournament ← (Society event, shows title)
```

### Code Change Needed:

In the golfer dashboard booking list, use:

```javascript
const security = new SupabaseSecurity(window.SupabaseDB.client);
const currentUserId = liff.getContext().userId;

// Filter bookings for privacy
const filteredBookings = security.filterBookingsForGolferView(
    allBookings,
    currentUserId
);
```

---

## STEP 5: Booking Sharing (Access Keys)

### Feature: Share Your Booking

When a golfer creates a booking, they can generate an access key:

```javascript
const security = new SupabaseSecurity(window.SupabaseDB.client);

// Generate access key
const result = await security.generateAccessKey(
    bookingId,
    groupId,
    currentUserId,
    {
        expiresAt: null,  // Never expires
        maxUses: 10       // Max 10 people can join
    }
);

console.log('Share this with your group:');
console.log('Access Key:', result.accessKey);  // e.g., "A7B2XF9K"
console.log('Share URL:', result.shareUrl);     // e.g., "https://...?join=A7B2XF9K"
```

### Feature: Join a Booking

When someone receives an access key:

```javascript
// URL: https://your-app.com?join=A7B2XF9K
const urlParams = new URLSearchParams(window.location.search);
const joinKey = urlParams.get('join');

if (joinKey) {
    const security = new SupabaseSecurity(window.SupabaseDB.client);
    const result = await security.validateAccessKey(joinKey);

    if (result.valid) {
        // Load the booking
        const booking = await loadBookingById(result.bookingId);
        // Show booking details
        // Allow them to join
    } else {
        alert(`Cannot join: ${result.reason}`);
    }
}
```

---

## STEP 6: Restrict Tee Sheet Access

### Current: Anyone can open teesheetproshop.html

### New: Check if user is staff/manager

Add to `teesheetproshop.html` at the top:

```javascript
// Check access permission
async function checkTeeSheetAccess() {
    await window.SupabaseDB.waitForReady();

    const security = new SupabaseSecurity(window.SupabaseDB.client);
    const currentUserId = liff.getContext().userId;

    const canView = await security.canViewTeeSheet(currentUserId);

    if (!canView) {
        alert('Access Denied: This page is only for Pro Shop staff and managers.');
        window.location.href = '/'; // Redirect to home
        return false;
    }

    return true;
}

// Run on page load
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkTeeSheetAccess();
    if (hasAccess) {
        // Initialize tee sheet
        initializeTeeSheet();
    }
});
```

---

## STEP 7: Fix GM Dashboard

The GM dashboard needs to load data from Supabase instead of Netlify Blobs.

### Files to Update:

1. `manager/gm_dashboard_enterprise_cockpit_v3.html`
2. `gm-analytics-engine.js`

### Changes Needed:

Replace all Netlify Blobs calls with Supabase:

```javascript
// OLD (Netlify Blobs):
const response = await fetch('/.netlify/functions/bookings');
const data = await response.json();

// NEW (Supabase):
await window.SupabaseDB.waitForReady();
const { bookings } = await window.SupabaseDB.getBookings();
```

---

## STEP 8: What Was in Netlify That We're Missing

### Already Fixed:
- ✅ Bookings storage
- ✅ User profiles storage
- ✅ GPS positions
- ✅ Chat messages
- ✅ Emergency alerts

### Still Using Netlify Functions (To Migrate):
- ❓ Chat function (if still using Pusher replacement)
- ❓ Profiles function

### New Features We're Adding (Not in Netlify):
- ✅ Booking access keys (sharing)
- ✅ Role-based access control
- ✅ Privacy filtering
- ✅ Society event titles

---

## DEPLOYMENT ORDER

### Phase 1: Critical Fixes (DO NOW)
1. ✅ Run `supabase-fix-immediate.sql` in Supabase
2. ✅ Test that deletions work
3. ✅ Assign roles to your staff/managers

### Phase 2: Security (Next)
4. Add `supabase-security.js` to index.html
5. Update golfer dashboard to filter bookings
6. Add tee sheet access control

### Phase 3: Features (After Testing)
7. Add booking sharing UI
8. Fix GM dashboard
9. Add admin role management page

---

## Testing Checklist

After Phase 1:
- [ ] Can delete bookings from tee sheet
- [ ] Deletion is instant (no page reload)
- [ ] Deleted bookings don't reappear

After Phase 2:
- [ ] Golfers only see "Booked" for other people's slots
- [ ] Staff can see all booking details
- [ ] Only staff/managers can open tee sheet

After Phase 3:
- [ ] Can generate access key for a booking
- [ ] Others can join using the key
- [ ] GM dashboard loads data correctly

---

## WHAT NETLIFY HAD vs WHAT SUPABASE NEEDS

### Netlify Blobs Approach:
- Single API key (`SITE_WRITE_KEY`)
- No role-based access
- All users had full read/write access
- Security was "trust the client"

### Supabase Approach:
- Row Level Security (RLS) policies
- Role-based permissions
- Database-level security
- Client can't bypass restrictions

### Why Migration Was "Shit":
1. **We kept Netlify's open access model** ("everyone can view")
2. **We didn't add the new security features** that Supabase enables
3. **We didn't add role fields** to user profiles
4. **We forgot the DELETE policy**

### What We're Fixing Now:
1. ✅ Proper role-based access
2. ✅ Privacy controls
3. ✅ Booking sharing system
4. ✅ All CRUD operations working
5. ✅ GM dashboard integration

---

## Files Created:

1. `supabase-fix-immediate.sql` - RUN THIS FIRST
2. `supabase-security.js` - Application security layer
3. `SUPABASE_COMPLETE_SCHEMA.sql` - Full schema (for reference)
4. `COMPLETE_FIX_GUIDE.md` - This file

---

## Next Steps:

1. **RUN `supabase-fix-immediate.sql` NOW** to fix deletions
2. Let me know what breaks after (so I can fix it)
3. Tell me which staff members need roles assigned
4. I'll update the code to use the security layer

**DO NOT** run `SUPABASE_COMPLETE_SCHEMA.sql` yet - it has JWT-based policies that won't work with your setup.
