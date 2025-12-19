# How Signup Actually Works - Final Clarification 🎯

## The Real Data Flow

### **What Data EXISTS in the System:**

```
┌─────────────────────────────────────────────────────────┐
│ WHEN ORGANIZER MANUALLY ADDS "ROCKY JONES"             │
├─────────────────────────────────────────────────────────┤
│ Organizer adds to their Player Directory:               │
│   ✅ Name: "Rocky Jones"                                │
│   ✅ Handicap: +1.5                                     │
│   ❌ Society: NOT SET (Rocky decides at signup!)        │
│   ❌ Home Course: NOT SET (Rocky adds after signup)     │
│                                                          │
│ Stored in society_members table:                        │
│   society_name: "travelers_rest"  ← Org's society      │
│   golfer_id: "temp_golfer_8a7f2d"                      │
│   member_data: {                                        │
│     "name": "Rocky Jones",                              │
│     "handicap": 1.5                                     │
│   }                                                     │
│   status: "pending"  ← Not confirmed by player yet      │
└─────────────────────────────────────────────────────────┘
```

---

## The Complete Signup Flow (Corrected)

### **STEP 1: Rocky Logs In With LINE** 📱

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY CLICKS "LOGIN WITH LINE"                          │
├─────────────────────────────────────────────────────────┤
│ LINE OAuth returns:                                     │
│   - userId: "U1234567890"                               │
│   - displayName: "Rocky Jones"                          │
│                                                          │
│ System checks user_profiles...                          │
│   ❌ NOT FOUND (new user)                              │
│                                                          │
│ 🔍 System searches society_members for name match...   │
│   SELECT * FROM find_existing_member_matches(          │
│     'U1234567890', 'Rocky Jones'                       │
│   );                                                    │
└─────────────────────────────────────────────────────────┘
```

### **STEP 2: System Finds Name + Handicap** ✅

```
┌─────────────────────────────────────────────────────────┐
│ FOUND POTENTIAL MATCH IN PLAYER DIRECTORY               │
├─────────────────────────────────────────────────────────┤
│ Match Found:                                            │
│   ✅ Name: "Rocky Jones" (95% match)                    │
│   ✅ Handicap: +1.5                                     │
│   ⚠️ Society: "Travelers Rest" (suggested, not confirmed)│
│                                                          │
│ Shows Confirmation + Society Selection Modal...         │
└─────────────────────────────────────────────────────────┘
```

### **STEP 3: Rocky Sees Match + Society Choice** 👀

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 Welcome!                                            │
│  We found a profile that might be you                   │
│                                                          │
│  Is this you?                                           │
│                                                          │
│  ┌──────────────────────────────────────┐              │
│  │ Rocky Jones             [95% match]  │              │
│  │ ─────────────────────────────────────│              │
│  │ Handicap: +1.5                       │              │
│  │ 💡 Exact name match                  │              │
│  └──────────────────────────────────────┘              │
│                                                          │
│  [ ✅ Yes, That's Me! ]  [ ❌ Not Me ]                 │
│                                                          │
│  ────────────────────────────────────────               │
│                                                          │
│  If yes, you've been invited to join:                   │
│                                                          │
│  ┌──────────────────────────────────────┐              │
│  │ 🏌️ Travelers Rest Golf Group         │              │
│  │                                       │              │
│  │ Organizer: Pete Park                 │              │
│  │ Members: 42 active                   │              │
│  └──────────────────────────────────────┘              │
│                                                          │
│  Would you like to join this society?                   │
│                                                          │
│  [ ✅ Join This Society ]                               │
│  [ 🔍 Browse Other Societies ]                          │
│  [ ⏭️ Skip for Now ]                                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### **STEP 4A: Rocky Accepts Match + Joins Society** ✅

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY CLICKS "YES, THAT'S ME" + "JOIN THIS SOCIETY"    │
├─────────────────────────────────────────────────────────┤
│ System executes:                                        │
│   1. Link LINE account to existing member record        │
│   2. Confirm society membership (player approved)       │
│   3. Generate member number (TRGG-042)                  │
│                                                          │
│ Creates user_profiles:                                  │
│   ✅ line_user_id: "U1234567890"                       │
│   ✅ name: "Rocky Jones"                               │
│   ✅ handicap: 1.5 (from member_data)                  │
│   ✅ society_name: "travelers_rest" (Rocky confirmed!) │
│   ✅ society_id: UUID (linked)                         │
│                                                          │
│ Updates society_members:                                │
│   golfer_id: "temp_123" → "U1234567890"                │
│   status: "pending" → "active" (Rocky confirmed!)       │
│   member_number: "TRGG-042" (auto-generated)           │
└─────────────────────────────────────────────────────────┘
```

### **STEP 4B: Rocky Accepts Match but Declines Society** ⚠️

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY CLICKS "YES, THAT'S ME" + "BROWSE OTHER SOCIETIES"│
├─────────────────────────────────────────────────────────┤
│ System:                                                 │
│   1. Links LINE account                                 │
│   2. Preserves handicap +1.5                            │
│   3. Does NOT join Travelers Rest                       │
│   4. Shows society browser                              │
│                                                          │
│ Creates user_profiles:                                  │
│   ✅ line_user_id: "U1234567890"                       │
│   ✅ name: "Rocky Jones"                               │
│   ✅ handicap: 1.5 (preserved)                         │
│   ❌ society_name: NULL (Rocky declined)               │
│                                                          │
│ Rocky can browse and join societies manually            │
└─────────────────────────────────────────────────────────┘
```

### **STEP 4C: Rocky Declines Match (Wrong Person)** ❌

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY CLICKS "NOT ME, CREATE NEW"                       │
├─────────────────────────────────────────────────────────┤
│ System:                                                 │
│   1. Ignores the match                                  │
│   2. Creates blank profile                              │
│   3. Rocky enters handicap manually                     │
│   4. Rocky chooses societies manually                   │
│                                                          │
│ Creates user_profiles:                                  │
│   ✅ line_user_id: "U1234567890"                       │
│   ✅ name: "Rocky Jones" (from LINE)                   │
│   ⚠️ handicap: 0 (Rocky must enter)                    │
│   ❌ society_name: NULL (Rocky must choose)            │
└─────────────────────────────────────────────────────────┘
```

---

## What Each Person Controls

### **Organizer Responsibilities:**

```
┌─────────────────────────────────────────┐
│ ORGANIZER CAN ADD TO DIRECTORY:         │
├─────────────────────────────────────────┤
│ ✅ Player Name                          │
│ ✅ Player Handicap                      │
│ ✅ Invite to their society (suggested)  │
│                                         │
│ ❌ CANNOT force society membership      │
│ ❌ CANNOT set home course               │
│ ❌ CANNOT create LINE account for them  │
└─────────────────────────────────────────┘
```

### **Player Responsibilities (Rocky):**

```
┌─────────────────────────────────────────┐
│ PLAYER MUST CONFIRM:                     │
├─────────────────────────────────────────┤
│ ✅ Accept/reject name+handicap match    │
│ ✅ Choose which societies to join       │
│ ✅ Add home course (optional)           │
│ ✅ Update profile details (optional)    │
│                                         │
│ Player has full control over:           │
│   - Which societies they join           │
│   - When they join                      │
│   - Profile settings                    │
└─────────────────────────────────────────┘
```

---

## Database Schema (Actual)

### **society_members Table**

```sql
CREATE TABLE society_members (
    society_name TEXT NOT NULL,     -- Organizer's society
    golfer_id TEXT NOT NULL,        -- temp until LINE linked
    member_data JSONB,              -- { name, handicap }
    status TEXT DEFAULT 'pending',  -- 'pending' until player confirms!

    -- Key field: Player must confirm membership
    player_confirmed BOOLEAN DEFAULT FALSE,  -- ← NEW!
    player_confirmed_at TIMESTAMPTZ,

    -- Membership only becomes 'active' when player confirms
    CONSTRAINT valid_status CHECK (
        (status = 'active' AND player_confirmed = TRUE)
        OR status != 'active'
    )
);
```

### **user_profiles Table**

```sql
CREATE TABLE user_profiles (
    line_user_id TEXT PRIMARY KEY,

    -- From matched member_data
    name TEXT,                      -- From LINE or member_data
    handicap NUMERIC,               -- From member_data (if matched)

    -- Player chooses society at signup
    society_name TEXT,              -- NULL until player confirms!
    society_id UUID,                -- NULL until player confirms!

    -- Player adds after signup
    home_course_id TEXT,            -- NULL, player adds later
    home_course_name TEXT,          -- NULL, player adds later

    profile_data JSONB
);
```

---

## Updated Intelligent Signup Flow

### **Modified link_line_account_to_member() Function:**

```sql
CREATE OR REPLACE FUNCTION link_line_account_to_member(
    p_line_user_id TEXT,
    p_existing_golfer_id TEXT,
    p_society_name TEXT,
    p_player_accepts_society BOOLEAN  -- ← NEW parameter!
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Create user_profile with handicap preserved
    INSERT INTO user_profiles (
        line_user_id,
        name,
        handicap,
        society_name,  -- Only set if player accepts
        profile_data
    )
    SELECT
        p_line_user_id,
        member_data->>'name',
        (member_data->>'handicap')::numeric,
        CASE
            WHEN p_player_accepts_society THEN p_society_name
            ELSE NULL  -- Player declined society
        END,
        jsonb_build_object(
            'golfInfo', jsonb_build_object(
                'handicap', (member_data->>'handicap')::numeric,
                'homeClub', '',  -- Player adds later
                'homeCourseId', ''  -- Player adds later
            )
        )
    FROM society_members
    WHERE golfer_id = p_existing_golfer_id;

    -- 2. Update society_members
    UPDATE society_members
    SET
        golfer_id = p_line_user_id,
        player_confirmed = p_player_accepts_society,
        player_confirmed_at = CASE
            WHEN p_player_accepts_society THEN NOW()
            ELSE NULL
        END,
        status = CASE
            WHEN p_player_accepts_society THEN 'active'
            ELSE 'declined'
        END
    WHERE golfer_id = p_existing_golfer_id
      AND society_name = p_society_name;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Account linked',
        'society_accepted', p_player_accepts_society
    );
END;
$$ LANGUAGE plpgsql;
```

---

## Example Scenarios

### **Scenario 1: Rocky Accepts Everything** ✅

```
1. Organizer adds "Rocky Jones, +1.5" to Travelers Rest
2. Rocky logs in with LINE
3. Sees: "Rocky Jones, +1.5, invited to Travelers Rest"
4. Clicks: "Yes, That's Me!" + "Join This Society"
5. Result:
   ✅ Handicap +1.5 preserved
   ✅ Member of Travelers Rest
   ✅ Member # TRGG-042 assigned
   ✅ Can register for events immediately
```

### **Scenario 2: Rocky Takes Handicap but Not Society** ⚠️

```
1. Organizer adds "Rocky Jones, +1.5" to Travelers Rest
2. Rocky logs in with LINE
3. Sees: "Rocky Jones, +1.5, invited to Travelers Rest"
4. Clicks: "Yes, That's Me!" + "Browse Other Societies"
5. Result:
   ✅ Handicap +1.5 preserved
   ❌ NOT member of Travelers Rest (Rocky declined)
   ⚠️ Can join other societies manually
```

### **Scenario 3: Wrong Person** ❌

```
1. Organizer adds "Rocky Jones, +1.5"
2. Different Rocky Jones logs in with LINE
3. Sees: "Rocky Jones, +1.5, invited to Travelers Rest"
4. Clicks: "Not Me, Create New"
5. Result:
   ❌ Handicap NOT preserved (starts at 0)
   ❌ NOT matched to existing record
   ⚠️ Must enter handicap manually
```

---

## The Key Point

```
┌───────────────────────────────────────────────────────┐
│ ORGANIZER'S ROLE:                                     │
│   - Add players to directory with name + handicap     │
│   - Invite them to join society                       │
│   - Suggestion only, not forced!                      │
└───────────────────────────────────────────────────────┘
                        ↓
┌───────────────────────────────────────────────────────┐
│ PLAYER'S ROLE (Rocky):                                │
│   - Accepts or rejects name + handicap match          │
│   - Chooses to join suggested society OR declines     │
│   - Can join other societies later                    │
│   - Adds home course in profile settings              │
│   - Full control over membership decisions            │
└───────────────────────────────────────────────────────┘
```

---

## Summary

**What's Preserved (if Rocky accepts):**
- ✅ Name: "Rocky Jones"
- ✅ Handicap: +1.5

**What Rocky Decides:**
- ⚙️ Join Travelers Rest Society? (yes/no/later)
- ⚙️ Join other societies? (yes/no/later)

**What Rocky Adds Later:**
- ⚙️ Home course
- ⚙️ Profile details

**The Flow:**
Organizer adds Rocky to directory → Rocky logs in with LINE → Sees match with handicap → **Rocky decides** to join society or not → Adds home course later → Done! ✨
