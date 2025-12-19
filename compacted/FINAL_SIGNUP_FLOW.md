# Final Signup Flow - How It Actually Works ✅

## The Actual System Behavior

### **Key Rule:**
**If society affiliation exists in `society_members`, it's automatically applied when player confirms the match. Player can manually change it later.**

---

## Complete Flow: Rocky Jones Example

### **STEP 1: Organizer Adds Rocky**

```
┌─────────────────────────────────────────────────────────┐
│ TRAVELERS REST ORGANIZER ADDS ROCKY TO DIRECTORY       │
├─────────────────────────────────────────────────────────┤
│ Organizer enters:                                       │
│   ✅ Name: "Rocky Jones"                                │
│   ✅ Handicap: +1.5                                     │
│   ✅ Society: "Travelers Rest Golf Group" (auto-filled)│
│                                                          │
│ Stored in society_members table:                        │
│   society_name: "travelers_rest"                        │
│   golfer_id: "temp_golfer_8a7f2d"  ← Temporary ID      │
│   member_number: NULL (generated at confirmation)       │
│   member_data: {                                        │
│     "name": "Rocky Jones",                              │
│     "handicap": 1.5                                     │
│   }                                                     │
│   status: "pending"  ← Waiting for player to signup    │
└─────────────────────────────────────────────────────────┘
```

### **STEP 2: Rocky Logs In With LINE (2 weeks later)**

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY CLICKS "LOGIN WITH LINE"                          │
├─────────────────────────────────────────────────────────┤
│ LINE OAuth returns:                                     │
│   - userId: "U1234567890"                               │
│   - displayName: "Rocky Jones"                          │
│   - pictureUrl: "https://..."                           │
│                                                          │
│ System checks user_profiles...                          │
│   ❌ NOT FOUND (new user)                              │
│                                                          │
│ 🔍 System searches society_members...                  │
│   SELECT * FROM find_existing_member_matches(          │
│     'U1234567890', 'Rocky Jones'                       │
│   );                                                    │
│                                                          │
│ ✅ MATCH FOUND!                                         │
└─────────────────────────────────────────────────────────┘
```

### **STEP 3: Rocky Sees Confirmation Modal**

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 Welcome!                                            │
│  We found an existing profile for you                   │
│                                                          │
│  Is this you?                                           │
│                                                          │
│  ┌──────────────────────────────────────┐              │
│  │ Rocky Jones             [95% match]  │              │
│  │ ─────────────────────────────────────│              │
│  │ Society: Travelers Rest Golf Group   │              │
│  │ Handicap: +1.5                       │              │
│  │                                       │              │
│  │ 💡 Exact name match                  │              │
│  └──────────────────────────────────────┘              │
│                                                          │
│  By confirming, you'll be linked to this profile        │
│  with your handicap and society membership.             │
│                                                          │
│  [ ✅ Yes, That's Me! ]  [ ❌ Create New Profile ]     │
│                                                          │
└─────────────────────────────────────────────────────────┘

Rocky clicks "Yes, That's Me!" ← ONE CLICK
```

### **STEP 4: Account Linked - Society Auto-Applied** ✅

```
┌─────────────────────────────────────────────────────────┐
│ SYSTEM AUTOMATICALLY LINKS EVERYTHING                   │
├─────────────────────────────────────────────────────────┤
│ Creates user_profiles record:                           │
│   ✅ line_user_id: "U1234567890"                       │
│   ✅ name: "Rocky Jones"                               │
│   ✅ username: "rockyjones"                            │
│   ✅ handicap: 1.5 (from member_data)                  │
│   ✅ society_name: "travelers_rest" (AUTOMATIC!)       │
│   ✅ society_id: UUID (linked)                         │
│   ⚠️ home_course: NULL (Rocky adds later)              │
│                                                          │
│ Updates society_members:                                │
│   golfer_id: "temp_golfer_8a7f2d" → "U1234567890"      │
│   status: "pending" → "active"                          │
│   member_number: "TRGG-042" (generated)                │
│                                                          │
│ Success message:                                        │
│   "✅ Welcome back, Rocky! Your profile has been linked"│
│   "You're now a member of Travelers Rest Golf Group"   │
└─────────────────────────────────────────────────────────┘
```

### **STEP 5: Rocky's Dashboard - Everything Ready** 🎯

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY'S DASHBOARD - FIRST LOGIN                         │
├─────────────────────────────────────────────────────────┤
│ Profile:                                                │
│   ✅ Name: Rocky Jones                                  │
│   ✅ Username: @rockyjones                              │
│   ✅ Handicap: +1.5 (preserved from directory)         │
│   ✅ Society: Travelers Rest Golf Group (automatic!)    │
│   ✅ Member #: TRGG-042 (auto-generated)               │
│   ✅ LINE Profile Picture                               │
│   ⚠️ Home Course: Not set (Rocky can add in settings)  │
│                                                          │
│ Available Now:                                          │
│   🏌️ View Travelers Rest Events                        │
│   📋 Register for Events                                 │
│   👥 See Other Members                                   │
│   📊 View Round History                                  │
│   ⚙️ Edit Profile Settings                              │
└─────────────────────────────────────────────────────────┘
```

### **STEP 6 (LATER): Rocky Changes Society** ⚙️

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY DECIDES TO SWITCH SOCIETIES (Optional)            │
├─────────────────────────────────────────────────────────┤
│ Rocky goes to: Profile Settings → Society Membership    │
│                                                          │
│ Sees:                                                   │
│   Current Society: Travelers Rest Golf Group ✅         │
│                                                          │
│ Options:                                                │
│   [ Add Another Society ]                               │
│   [ Change Primary Society ]                            │
│   [ Leave Society ]                                     │
│                                                          │
│ Rocky can:                                              │
│   - Join multiple societies                             │
│   - Set one as primary                                  │
│   - Leave Travelers Rest if he wants                    │
│                                                          │
│ This is MANUAL change by Rocky only!                    │
└─────────────────────────────────────────────────────────┘
```

---

## What Gets Applied Automatically vs Manually

### **✅ Automatic (If Rocky Clicks "Yes, That's Me!"):**

```
┌───────────────────────────────────┐
│ AUTOMATICALLY APPLIED:            │
├───────────────────────────────────┤
│ ✅ Name: "Rocky Jones"            │
│ ✅ Handicap: +1.5                 │
│ ✅ Society: "Travelers Rest"      │ ← AUTOMATIC!
│ ✅ Member #: "TRGG-042"           │
│ ✅ LINE Account Linked            │
└───────────────────────────────────┘

Rocky doesn't choose the society.
It's pre-filled from society_members.
```

### **⚙️ Manual (Rocky Adds Later):**

```
┌───────────────────────────────────┐
│ ROCKY ADDS IN SETTINGS:           │
├───────────────────────────────────┤
│ ⚙️ Home Course                    │
│ ⚙️ Profile Photo (or from LINE)   │
│ ⚙️ Bio / About                    │
│ ⚙️ Switch to Different Society    │
│ ⚙️ Join Additional Societies      │
└───────────────────────────────────┘
```

---

## Updated SQL Function

```sql
CREATE OR REPLACE FUNCTION link_line_account_to_member(
    p_line_user_id TEXT,
    p_line_display_name TEXT,
    p_line_picture_url TEXT,
    p_society_name TEXT,
    p_existing_golfer_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_member_data JSONB;
    v_society_id UUID;
BEGIN
    -- Get existing member data
    SELECT member_data INTO v_member_data
    FROM society_members
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Member not found');
    END IF;

    -- Get society ID
    SELECT id INTO v_society_id
    FROM society_profiles
    WHERE society_name = p_society_name
    LIMIT 1;

    -- Create user_profile with AUTOMATIC society affiliation
    INSERT INTO user_profiles (
        line_user_id,
        name,
        username,
        role,
        email,
        phone,
        society_name,        -- ← AUTOMATIC!
        society_id,          -- ← AUTOMATIC!
        profile_data
    ) VALUES (
        p_line_user_id,
        COALESCE(v_member_data->>'name', p_line_display_name),
        LOWER(REPLACE(COALESCE(v_member_data->>'name', p_line_display_name), ' ', '')),
        'golfer',
        v_member_data->>'email',
        v_member_data->>'phone',
        p_society_name,      -- ← Pre-filled from society_members!
        v_society_id,        -- ← Pre-filled!
        jsonb_build_object(
            'username', LOWER(REPLACE(COALESCE(v_member_data->>'name', p_line_display_name), ' ', '')),
            'linePictureUrl', p_line_picture_url,
            'personalInfo', jsonb_build_object(
                'firstName', SPLIT_PART(COALESCE(v_member_data->>'name', p_line_display_name), ' ', 1),
                'lastName', SPLIT_PART(COALESCE(v_member_data->>'name', p_line_display_name), ' ', 2),
                'email', COALESCE(v_member_data->>'email', ''),
                'phone', COALESCE(v_member_data->>'phone', '')
            ),
            'golfInfo', jsonb_build_object(
                'handicap', COALESCE((v_member_data->>'handicap')::numeric, 0),
                'homeClub', '',          -- Rocky adds later
                'homeCourseId', ''       -- Rocky adds later
            ),
            'professionalInfo', jsonb_build_object(),
            'skills', jsonb_build_object(),
            'preferences', jsonb_build_object('language', 'en'),
            'media', jsonb_build_object(),
            'privacy', jsonb_build_object()
        )
    )
    ON CONFLICT (line_user_id) DO UPDATE SET
        name = EXCLUDED.name,
        society_name = EXCLUDED.society_name,
        society_id = EXCLUDED.society_id,
        profile_data = EXCLUDED.profile_data,
        updated_at = NOW();

    -- Update society_members: Link to LINE ID + mark active
    UPDATE society_members
    SET
        golfer_id = p_line_user_id,  -- Replace temp ID with LINE ID
        status = 'active',            -- Now active
        member_data = jsonb_set(
            member_data,
            '{linkedAt}',
            to_jsonb(NOW())
        ),
        updated_at = NOW()
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Account linked successfully',
        'society_applied', p_society_name
    );
END;
$$ LANGUAGE plpgsql;
```

---

## The Complete Picture

```
┌───────────────────────────────────────────────────────┐
│ ORGANIZER'S ACTION:                                   │
│   - Adds "Rocky Jones, +1.5" to Travelers Rest        │
│   - Society affiliation is SET (travelers_rest)       │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ ROCKY'S ACTION AT SIGNUP:                             │
│   - Logs in with LINE                                 │
│   - Clicks "Yes, That's Me!" (ONE click)              │
│   - Society affiliation AUTOMATICALLY applied ✅      │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ RESULT:                                               │
│   ✅ Rocky is member of Travelers Rest (automatic)    │
│   ✅ Handicap +1.5 preserved                          │
│   ✅ Member # TRGG-042 assigned                       │
│   ✅ Can register for events immediately              │
└───────────────────────────────────────────────────────┘
                        ↓ (Later, if Rocky wants)
┌───────────────────────────────────────────────────────┐
│ ROCKY CAN MANUALLY CHANGE:                            │
│   ⚙️ Switch to different society                      │
│   ⚙️ Join additional societies                        │
│   ⚙️ Add home course                                  │
│   ⚙️ Update profile                                   │
└───────────────────────────────────────────────────────┘
```

---

## Key Differences from Previous Versions

| Previous (Wrong) | Current (Correct) |
|------------------|-------------------|
| Rocky chooses society at signup | Society is automatic from society_members |
| Modal shows "Would you like to join?" | Modal shows "You're in Travelers Rest" |
| Player can decline society | Player gets society automatically |
| Society confirmation required | No confirmation, just applied |

---

## Summary

**The Rule:**
**Society affiliation in `society_members` = sticky. Applied automatically when player confirms match.**

**Rocky's Experience:**
1. Logs in with LINE
2. Sees "Is this you? Rocky Jones, Travelers Rest, +1.5"
3. Clicks "Yes"
4. ✅ DONE! Member of Travelers Rest with handicap +1.5

**If Rocky wants to change society later:**
- Goes to Profile Settings → Society Membership
- Manually changes to different society
- System allows it

**The Magic:**
One click, everything linked. Handicap preserved, society applied, member number assigned. Rocky can register for events immediately. No forms, no choices, just works. ✨
