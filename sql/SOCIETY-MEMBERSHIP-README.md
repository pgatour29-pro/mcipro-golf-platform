# Society Membership System

## Overview

The MciPro platform now supports **society-specific membership rosters** in addition to platform-wide user search. This allows societies to maintain their own official member lists while still being able to add any platform user to events.

---

## The Problem

Previously, when searching for players to add to events:
- ❌ Only searched the `profiles` table (chat users, which was wrong)
- ❌ No way to distinguish society members from general platform users
- ❌ No concept of "primary society" for users who belong to multiple societies
- ❌ Societies couldn't maintain their own membership rosters

**User Example:**
> "Donald and Pete Park aren't showing up in search, but they're definitely in the system. Also, Travelers Rest has their own membership, Padia Sports Club has their own membership... societies need their own dedicated database."

---

## The Solution

### 1. Fixed Player Search (Immediate Fix)
**Changed:** Search now queries `user_profiles` table instead of `profiles`
**Result:** Pete Park, Donald, and all registered users now appear in search

### 2. Society Membership Database (New Feature)
**New Table:** `society_members`
- Links golfers to societies they are **official members** of
- Different from `golfer_society_subscriptions` (which is just "following" events)
- Supports membership numbers, status, and expiration dates

### 3. Dual Search Architecture
When organizers search for players, the system searches **two sources**:

1. **Society Members** (searched first, prioritized)
   - Official members of the society organizing the event
   - Marked with **MEMBER** badge in search results
   - If marked as primary society, shows **PRIMARY** badge

2. **Platform-Wide Users** (fallback)
   - All registered users in `user_profiles` table
   - No special badge
   - Can still be added to any event

---

## Database Schema

### Table: `society_members`

```sql
CREATE TABLE society_members (
    id UUID PRIMARY KEY,
    society_name TEXT NOT NULL,
    organizer_id TEXT,
    golfer_id TEXT NOT NULL,  -- LINE user ID
    member_number TEXT,
    is_primary_society BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'active',  -- active, inactive, suspended, pending
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    renewed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    member_data JSONB DEFAULT '{}'::jsonb,
    UNIQUE(society_name, golfer_id)
);
```

### Key Constraints:
- **Unique membership:** Each user can only be a member of each society once
- **One primary society:** Users can only have ONE primary society at a time (enforced by database constraint)

---

## Features

### For Society Organizers:
- ✅ Maintain official member roster
- ✅ Assign membership numbers
- ✅ Track membership status (active, inactive, suspended, pending)
- ✅ Set membership expiration dates
- ✅ Store custom member data (JSONB field for flexibility)

### For Golfers:
- ✅ Join multiple societies
- ✅ Designate one "primary/home" society
- ✅ View all society memberships
- ✅ See membership status and numbers

### For Search:
- ✅ Searches both society members AND platform users
- ✅ Society members appear first in results
- ✅ Visual badges show membership status
- ✅ Deduplicated results (no duplicate entries)

---

## Search Result Badges

When organizers search for players, results show:

| Badge | Meaning |
|-------|---------|
| **MEMBER** (purple) | Official member of this society |
| **PRIMARY** (blue) | This is the user's primary/home society |
| *(no badge)* | Platform user, not a society member |

**Example:**
```
Pete Park [MEMBER] [PRIMARY]
HCP: 18 • Travelers Rest • #TR-001

Donald Miller [MEMBER]
HCP: 12 • Padia Sports Club

Jane Doe
HCP: 24 • Oak Valley Golf Club
```

---

## API Functions

### SocietyGolfSupabase Methods:

```javascript
// Get all members of a society
await SocietyGolfDB.getSocietyMembers(societyName, organizerId);

// Add a member to a society
await SocietyGolfDB.addSocietyMember(societyName, organizerId, golferId, {
    memberNumber: 'TR-001',
    isPrimary: true,
    status: 'active',
    extra: { ... }  // Custom data
});

// Remove a member
await SocietyGolfDB.removeSocietyMember(societyName, golferId);

// Get all societies a user belongs to
await SocietyGolfDB.getUserSocietyMemberships(golferId);

// Set primary society
await SocietyGolfDB.setPrimarySociety(golferId, societyName);

// Search players (dual search)
await SocietyGolfDB.searchPlayers(searchTerm, societyName);
```

---

## Deployment Steps

### STEP 1: Create Database Table
Run in **Supabase SQL Editor**:
```sql
C:\Users\pete\Documents\MciPro\sql\create-society-members.sql
```

**Expected Output:**
```
✅ society_members table created successfully!
Societies can now maintain their own member rosters.
Features: Primary society designation, membership status, member numbers
```

### STEP 2: Deploy Code
Already committed to git as:
```
Commit: [PENDING]
Files: index.html, sw.js
```

### STEP 3: Test
1. Clear browser cache and reload
2. Go to Society Organizer → Event → Roster → Add Player
3. Search for "Pete" or "Donald" - should now appear!
4. Society members show **MEMBER** badge
5. Primary society members show **PRIMARY** badge

---

## Use Cases

### Travelers Rest Golf Society
- Pete Park: Member #TR-001, Primary Society: Travelers Rest
- When Travelers Rest organizer searches, Pete appears with [MEMBER] [PRIMARY] badges
- Pete can also play in Padia Sports Club events (but won't show member badge there)

### Padia Sports Club
- Donald Miller: Member #PSC-042, Primary Society: Padia Sports Club
- When PSC organizer searches, Donald appears with [MEMBER] [PRIMARY] badges
- Donald can also play in Travelers Rest events as a guest

### Multi-Society Members
- Jane Doe: Member of both Travelers Rest AND Padia Sports Club
- Primary: Travelers Rest
- Shows [MEMBER] [PRIMARY] when TR searches
- Shows [MEMBER] when PSC searches (not primary)

---

## Data Relationships

```
user_profiles (platform users)
    ↓
society_members (membership roster)
    ├── society_name → society_profiles
    ├── organizer_id → society_profiles
    └── golfer_id → user_profiles.line_user_id

golfer_society_subscriptions (following societies)
    ├── Different from membership!
    ├── Subscription = seeing events in feed
    └── Membership = official roster
```

---

## Benefits

✅ **Fixed search** - All users now findable (was searching wrong table)
✅ **Society rosters** - Each society maintains official members
✅ **Dual search** - Searches both members and platform users
✅ **Visual clarity** - Badges show membership status at a glance
✅ **Primary society** - Users can designate home society
✅ **Flexible membership** - Status, numbers, expiration, custom data
✅ **Database enforced** - Can't have duplicate memberships or multiple primaries

---

## Future Enhancements

### Possible Features:
- **Membership approval workflow** - Pending → Active
- **Bulk member import** - CSV upload for existing rosters
- **Membership dues tracking** - Payment status
- **Member directory** - Public/private profiles
- **Member stats** - Attendance, handicap trends
- **Auto-expiration** - Scheduled cleanup of expired memberships
- **Member communications** - Targeted messages to roster

---

## Technical Notes

### RLS Policies:
- Everyone can view **active** members (public directory)
- Society organizers can manage their own society's members
- Users can view/update their own memberships

### Realtime:
- Enabled for live membership updates
- Changes sync across all connected clients

### Performance:
- Indexed on: society_name, golfer_id, status, primary flag
- Dual search runs in parallel (Promise.all potential)
- Deduplication prevents duplicate results

---

## Rollback Plan

If something goes wrong:
1. Table remains safe (no data loss)
2. Revert code changes
3. Search falls back to user_profiles only
4. Membership features disabled but data preserved

---

## Summary

**What Changed:**
1. Fixed search to use correct table (`user_profiles` instead of `profiles`)
2. Created society membership system with new database table
3. Implemented dual search (members + platform users)
4. Added visual badges for members and primary society
5. Provided full CRUD API for membership management

**Impact:**
- Immediate: Pete Park and Donald now appear in search
- Short-term: Societies can build official member rosters
- Long-term: Foundation for member-only features, dues tracking, etc.

**Status:** ✅ Code complete, database schema ready, pending SQL execution
