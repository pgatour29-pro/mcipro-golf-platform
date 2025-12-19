# Database Sync Requirements

## Current Problem

Guest IDs (TRGG-GUEST-XXXX) are polluting the system because:

1. **No single source of truth** - `user_profiles.line_user_id` can have guest IDs
2. **No automatic sync** - Changes in Admin don't propagate to societies
3. **No validation** - System accepts guest IDs instead of requiring real LINE IDs

## Required Sync Logic

### 1. Admin → Society Sync

When an admin updates a user profile:
- ✅ Update `user_profiles` table
- ✅ Automatically update `society_members.golfer_id` to match
- ✅ Update all related tables: `rounds`, `scorecards`, `event_registrations`, etc.

### 2. Society → Admin Sync

When a society organizer adds/updates a member:
- ✅ Check if user exists in `user_profiles` with real LINE ID
- ✅ If exists, use their real LINE ID
- ❌ If doesn't exist, **DO NOT CREATE** guest ID profile
- ✅ Only add to `society_members` with a note that they need to login

### 3. LINE Login → Profile Creation

When a user logs in with LINE:
- ✅ Create/update `user_profiles` with real LINE ID (starts with `U`)
- ✅ Search for any existing guest profiles with matching name/email
- ✅ If found, **MIGRATE** all data from guest ID to real LINE ID
- ✅ Delete guest profile after migration

## Database Triggers Needed

### Trigger 1: Prevent Guest ID Creation
```sql
CREATE OR REPLACE FUNCTION prevent_guest_line_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.line_user_id LIKE 'TRGG-GUEST%' THEN
        RAISE EXCEPTION 'Guest IDs not allowed in user_profiles. Use real LINE user ID from authentication.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_line_user_id
BEFORE INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_guest_line_id();
```

### Trigger 2: Sync line_user_id Changes
```sql
CREATE OR REPLACE FUNCTION sync_user_id_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.line_user_id IS DISTINCT FROM NEW.line_user_id THEN
        -- Update all related tables
        UPDATE society_members SET golfer_id = NEW.line_user_id WHERE golfer_id = OLD.line_user_id;
        UPDATE rounds SET golfer_id = NEW.line_user_id WHERE golfer_id = OLD.line_user_id;
        UPDATE scorecards SET player_id = NEW.line_user_id WHERE player_id = OLD.line_user_id;
        UPDATE event_registrations SET player_id = NEW.line_user_id WHERE player_id = OLD.line_user_id;
        UPDATE event_join_requests SET golfer_id = NEW.line_user_id WHERE golfer_id = OLD.line_user_id;
        UPDATE golf_buddies SET buddy_id = NEW.line_user_id WHERE buddy_id = OLD.line_user_id;
        UPDATE golf_buddies SET user_id = NEW.line_user_id WHERE user_id = OLD.line_user_id;

        RAISE NOTICE 'Synced user ID change from % to %', OLD.line_user_id, NEW.line_user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_line_user_id_changes
AFTER UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_id_changes();
```

## Application Logic Changes

### Frontend: Society Member Addition
```javascript
// BEFORE (BAD):
const guestId = `TRGG-GUEST-${randomNumber}`;
await createProfile({ line_user_id: guestId, name: memberName });

// AFTER (GOOD):
// Only add to society_members, NOT user_profiles
await addSocietyMember({
    society_name: societyName,
    golfer_id: null, // Will be set when they login
    name: memberName,
    status: 'pending_login'
});
// Show message: "Member added. They must login with LINE to activate their account."
```

### Frontend: Golf Buddies/Scorecard Addition
```javascript
// BEFORE (BAD):
const player = await getProfile(buddyId); // Returns TRGG-GUEST ID

// AFTER (GOOD):
const player = await getProfile(buddyId);
if (!player.line_user_id || player.line_user_id.startsWith('TRGG-GUEST')) {
    throw new Error('This player must login with LINE before being added to scorecard');
}
```

## Immediate Actions

1. ✅ Run `FIX_PETE_COMPLETE.sql` to fix Pete's data
2. ✅ Run `FIX_ALL_GUEST_ID_USERS.sql` to find other affected users
3. ✅ Create database triggers to prevent future guest IDs
4. ✅ Update frontend code to require LINE login before adding to scorecards
5. ✅ Add automatic migration on LINE login to merge guest accounts

## Long-term Solution

**Use PostgreSQL Foreign Keys with CASCADE**:
```sql
-- Make line_user_id the primary key and enforce referential integrity
ALTER TABLE society_members
ADD CONSTRAINT fk_golfer_id
FOREIGN KEY (golfer_id) REFERENCES user_profiles(line_user_id)
ON UPDATE CASCADE
ON DELETE RESTRICT;

-- Now any update to user_profiles.line_user_id automatically cascades
```

This ensures **100% consistency** across all tables automatically.
