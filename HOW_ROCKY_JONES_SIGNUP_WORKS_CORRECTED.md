# How Rocky Jones Signup Works 🏌️ (Corrected)

## The Actual System - Step by Step

### **What Data EXISTS When Organizer Adds Rocky:**

```
┌─────────────────────────────────────────────────────────┐
│ ORGANIZER ADDS ROCKY TO SOCIETY                         │
├─────────────────────────────────────────────────────────┤
│ Travelers Rest Golf Group Organizer enters:             │
│   ✅ Name: Rocky Jones                                  │
│   ✅ Handicap: +1.5                                     │
│   ✅ Society: Travelers Rest Golf Group                 │
│   ✅ Member #: TRGG-042                                 │
│                                                          │
│ Stored in society_members table:                        │
│   society_name: "travelers_rest"                        │
│   golfer_id: "temp_golfer_8a7f2d"  ← Temporary ID      │
│   member_number: "TRGG-042"                             │
│   member_data: {                                        │
│     "name": "Rocky Jones",                              │
│     "handicap": 1.5                                     │
│   }                                                     │
│                                                          │
│ ❌ Home course: NOT SET                                 │
│    (Rocky will add this himself after signup)           │
└─────────────────────────────────────────────────────────┘
```

---

## The Complete Flow

### **STEP 1: Rocky Logs In With LINE** 📱

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY CLICKS "LOGIN WITH LINE"                          │
├─────────────────────────────────────────────────────────┤
│ LINE OAuth returns:                                     │
│   - userId: "U1234567890"                               │
│   - displayName: "Rocky Jones"                          │
│   - pictureUrl: "https://profile.line..."              │
│                                                          │
│ System checks user_profiles table...                    │
│   ❌ NOT FOUND (Rocky doesn't have a profile yet)      │
│                                                          │
│ 🔍 System searches society_members...                  │
│   SELECT * FROM find_existing_member_matches(          │
│     'U1234567890',                                      │
│     'Rocky Jones'                                       │
│   );                                                    │
└─────────────────────────────────────────────────────────┘
```

### **STEP 2: System Finds Match** ✅

```
┌─────────────────────────────────────────────────────────┐
│ MATCH FOUND IN SOCIETY_MEMBERS!                         │
├─────────────────────────────────────────────────────────┤
│ Match Details:                                          │
│   society_name: "travelers_rest"                        │
│   member_number: "TRGG-042"                             │
│   member_data: {                                        │
│     "name": "Rocky Jones",                              │
│     "handicap": 1.5                                     │
│   }                                                     │
│   match_confidence: 0.95 (95% - exact name match)      │
│                                                          │
│ Shows Confirmation Modal to Rocky...                    │
└─────────────────────────────────────────────────────────┘
```

### **STEP 3: Rocky Sees Confirmation Modal** 👀

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│  🎉 Welcome Back!                                       │
│  We found your existing member profile                  │
│                                                          │
│  Is this you?                                           │
│                                                          │
│  ┌──────────────────────────────────────┐              │
│  │ Rocky Jones             [95% match]  │              │
│  │ ─────────────────────────────────────│              │
│  │ Society: Travelers Rest Golf Group   │  ← SOCIETY   │
│  │ Member #: TRGG-042                   │              │
│  │ Handicap: +1.5                       │  ← PRESERVED │
│  │                                       │              │
│  │ 💡 Exact name match                  │              │
│  └──────────────────────────────────────┘              │
│                                                          │
│  [ ✅ Yes, That's Me! ]  [ ❌ Not Me ]                 │
│                                                          │
│  Note: Home course is NOT shown here                    │
│  (Rocky will add it later in profile settings)          │
└─────────────────────────────────────────────────────────┘
```

### **STEP 4: Rocky Confirms - Account Linked** 🔗

```
┌─────────────────────────────────────────────────────────┐
│ LINKING LINE ACCOUNT TO EXISTING MEMBER                 │
├─────────────────────────────────────────────────────────┤
│ SQL Function executes:                                  │
│   link_line_account_to_member(...)                     │
│                                                          │
│ Creates user_profiles record:                           │
│   ✅ line_user_id: "U1234567890"                       │
│   ✅ name: "Rocky Jones"                               │
│   ✅ username: "rockyjones"                            │
│   ✅ society_name: "travelers_rest"                    │
│   ✅ profile_data: {                                    │
│        golfInfo: {                                      │
│          handicap: 1.5,                                │
│          homeClub: "",        ← EMPTY (Rocky adds this)│
│          homeCourseId: ""     ← EMPTY                  │
│        }                                                │
│      }                                                  │
│                                                          │
│ Updates society_members:                                │
│   golfer_id: "temp_golfer_8a7f2d"                      │
│              ↓                                           │
│   golfer_id: "U1234567890" ✅ (LINE ID now)           │
└─────────────────────────────────────────────────────────┘
```

### **STEP 5: Rocky's Dashboard** 🎯

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY'S DASHBOARD - FIRST LOGIN                         │
├─────────────────────────────────────────────────────────┤
│ Profile Information:                                    │
│   ✅ Name: Rocky Jones                                  │
│   ✅ Username: @rockyjones                              │
│   ✅ Handicap: +1.5 (from society_members)             │
│   ✅ Society: Travelers Rest Golf Group                 │
│   ✅ Member #: TRGG-042                                 │
│   ✅ LINE Profile Picture                               │
│   ⚠️ Home Course: NOT SET                              │
│                                                          │
│ Available Actions:                                      │
│   🏌️ View Society Events                               │
│   📋 Register for Events                                 │
│   ⚙️ Edit Profile → Add Home Course                    │
│   📊 View Round History                                 │
└─────────────────────────────────────────────────────────┘
```

### **STEP 6: Rocky Adds Home Course (Later)** 🏌️

```
┌─────────────────────────────────────────────────────────┐
│ ROCKY EDITS HIS PROFILE                                 │
├─────────────────────────────────────────────────────────┤
│ Rocky clicks "Edit Profile" → Golf Info                 │
│                                                          │
│ Selects from dropdown:                                  │
│   🏌️ Home Course: Pleasant Valley Country Club         │
│                                                          │
│ System saves:                                           │
│   home_course_id: "pleasant_valley_cc"                 │
│   home_course_name: "Pleasant Valley Country Club"     │
│                                                          │
│ Also updates profile_data:                              │
│   golfInfo: {                                           │
│     handicap: 1.5,                                      │
│     homeClub: "Pleasant Valley Country Club",  ✅       │
│     homeCourseId: "pleasant_valley_cc"         ✅       │
│   }                                                     │
│                                                          │
│ Sync function ensures both flat columns and JSONB       │
│ are updated automatically! ✨                           │
└─────────────────────────────────────────────────────────┘
```

---

## Database Structure (Actual)

### **society_members Table** (What organizers manage)

```sql
CREATE TABLE society_members (
    id UUID PRIMARY KEY,
    society_name TEXT NOT NULL,        -- e.g., "travelers_rest"
    organizer_id TEXT,
    golfer_id TEXT NOT NULL,           -- Temp ID until LINE linked
    member_number TEXT,                -- e.g., "TRGG-042"
    is_primary_society BOOLEAN,
    status TEXT DEFAULT 'active',
    member_data JSONB DEFAULT '{}'::jsonb  -- Contains:
    --   {
    --     "name": "Rocky Jones",
    --     "handicap": 1.5,
    --     "email": "...",
    --     "phone": "..."
    --   }
    --   NOTE: NO home course data here!
);
```

### **user_profiles Table** (Created on LINE signup)

```sql
CREATE TABLE user_profiles (
    line_user_id TEXT PRIMARY KEY,     -- LINE account
    name TEXT,
    username TEXT UNIQUE,
    role TEXT,
    society_name TEXT,                 -- From society_members
    society_id UUID,

    -- Golf course data (USER adds this, NOT organizer)
    home_course_id TEXT,               -- ← Rocky adds after signup
    home_course_name TEXT,             -- ← Rocky adds after signup

    profile_data JSONB,                -- Full profile
    ...
);
```

---

## What Data Is Preserved vs Added Later

### **✅ Preserved from society_members (Organizer Added):**

```
┌─────────────────────────────────────┐
│ DATA ORGANIZER ADDS:                │
│ (Stored in society_members)         │
├─────────────────────────────────────┤
│ ✅ Name: "Rocky Jones"              │
│ ✅ Handicap: +1.5                   │
│ ✅ Society: "Travelers Rest"        │
│ ✅ Member #: "TRGG-042"             │
│ ✅ Email (optional)                 │
│ ✅ Phone (optional)                 │
└─────────────────────────────────────┘
        ↓ (Carried over on LINE signup)
┌─────────────────────────────────────┐
│ ROCKY'S user_profiles RECORD:       │
├─────────────────────────────────────┤
│ ✅ line_user_id: "U1234567890"     │
│ ✅ name: "Rocky Jones"              │
│ ✅ username: "rockyjones"           │
│ ✅ society_name: "travelers_rest"   │
│ ✅ profile_data.golfInfo.handicap   │
└─────────────────────────────────────┘
```

### **⚠️ Added by User After Signup:**

```
┌─────────────────────────────────────┐
│ DATA ROCKY ADDS HIMSELF:            │
│ (In profile settings after signup)  │
├─────────────────────────────────────┤
│ ⚙️ Home Course / Club               │
│ ⚙️ Profile Photo (or from LINE)     │
│ ⚙️ Bio / About Me                   │
│ ⚙️ Playing Style                    │
│ ⚙️ Availability                     │
└─────────────────────────────────────┘
```

---

## Updated Confirmation Modal (Accurate)

```html
<!-- What Rocky Actually Sees -->
<div class="confirmation-modal">
    <h2>🎉 Welcome Back!</h2>
    <p>We found your existing member profile. Is this you?</p>

    <div class="match-card">
        <h3>Rocky Jones <span class="badge">95% match</span></h3>
        <div class="details">
            <p><strong>Society:</strong> Travelers Rest Golf Group</p>
            <p><strong>Member #:</strong> TRGG-042</p>
            <p><strong>Handicap:</strong> +1.5</p>
            <!-- NO HOME COURSE SHOWN - doesn't exist yet! -->
        </div>
        <p class="match-reason">💡 Exact name match</p>
    </div>

    <button onclick="confirmMemberLink()">✅ Yes, That's Me!</button>
    <button onclick="skipMemberLink()">❌ Not Me, Create New</button>

    <p class="note">
        By linking, your LINE account will be connected to your society
        membership, including your handicap and member number.
        You can add your home course in profile settings.
    </p>
</div>
```

---

## The Actual Benefits

### **For Rocky Jones:**
- ✅ One-click LINE login
- ✅ Handicap +1.5 automatically loaded
- ✅ Travelers Rest society access immediately
- ✅ Member # TRGG-042 preserved
- ✅ Can register for society events right away
- ⚙️ Adds home course later in profile settings

### **For Organizers:**
- ✅ Add members with name + handicap before they signup
- ✅ Assign society membership
- ✅ Assign member numbers
- ✅ No duplicate profiles when members login
- ✅ Don't need to know member's home course

### **For System:**
- ✅ Clean data model (societies ≠ golf courses)
- ✅ Members can play at multiple courses
- ✅ Home course is personal preference, not required
- ✅ Society membership is the primary relationship

---

## Key Clarification

### **Society vs Golf Course**

```
SOCIETY (e.g., "Travelers Rest Golf Group")
  - Social group of golfers
  - Organizes events at various courses
  - Members have handicaps and member numbers
  - Rocky IS a member of this

GOLF COURSE (e.g., "Pleasant Valley Country Club")
  - Physical location with holes
  - Has tee sheets, course ratings
  - Rocky PLAYS here but may not be a member
  - Rocky adds as "home course" if he wants
```

---

## Summary

**What Organizer Adds:**
- Name
- Handicap
- Society membership
- Member number

**What System Preserves on LINE Signup:**
- All of the above ✅

**What Rocky Adds Later:**
- Home course (optional)
- Profile details (optional)

**The Magic:**
Rocky logs in with LINE → sees "Are you Rocky Jones of Travelers Rest?" → clicks Yes → handicap +1.5 and society membership preserved → adds home course later if he wants → Done! ✨
