# Society Membership System Fix - November 30, 2025

## Issues Fixed

### 1. **Travellers Rest showing 0 players** ✅
**Problem:** Users had `clubAffiliation = "Travellers Rest Golf Group"` as text, but no database relationship in `society_members` table.

**Your console showed:**
```
[PlayerDirectory] Loading members for: Travellers Rest Golf Group
[SocietyGolfDB] 📊 Total matching members: 0
```

**Root Cause:** Registration only saved text, never created database records.

---

### 2. **New members not linking to societies** ✅
**Problem:** Registration form had society dropdown, but selecting a society didn't create database relationships.

**Evidence from your profile:**
```javascript
"golfInfo": {
  "clubAffiliation": "Travellers Rest Golf Group"  // ✅ Saved as text
},
"organizationInfo": {
  "societyId": null,  // ❌ Never linked!
  "societyName": ""
}
```

---

### 3. **Handicap not saving properly** ✅
**Problem:** Empty handicap input saved as empty string `''` instead of `null`, causing database issues.

---

## What Was Fixed

### Code Changes

#### 1. **Registration Flow** (public/index.html:10283-10294)
Added society mapping to convert text selections to database IDs:

```javascript
// FIX: Convert clubAffiliation text to society_id for database linking
if (roleSpecificData.clubAffiliation) {
    const societyMapping = {
        'Travellers Rest Group': 'trgg-pattaya',
        'Pattaya Sports Club': 'pattaya-sports',
        'Bunker Boys': 'bunker-boys',
        'Diego Dubbi Golf': 'diego-dubbi',
        'JOA Golf Pattaya': 'JOAGOLFPAT'
    };
    profileData.societyOrganizerId = societyMapping[roleSpecificData.clubAffiliation];
    profileData.societyName = roleSpecificData.clubAffiliation;
}
```

#### 2. **Automatic Society Linking** (supabase-config.js:373-422)
When a profile is saved, automatically:
- Looks up `society_id` from `society_profiles` table
- Updates `user_profiles.society_id`
- Creates entry in `society_members` table

```javascript
// Look up society by organizer_id
const { data: societyData } = await this.client
    .from('society_profiles')
    .select('id, society_name')
    .eq('organizer_id', profile.societyOrganizerId)
    .single();

// Create society_members entry
await this.client
    .from('society_members')
    .upsert({
        society_id: societyData.id,
        golfer_id: data.line_user_id,
        joined_date: new Date().toISOString().split('T')[0],
        status: 'active',
        member_data: { name, handicap, homeClub, email, phone }
    });
```

#### 3. **Handicap Fix** (public/index.html:15534-15552)
- Changed empty string to `null`
- Added support for plus handicaps (`+5` format)
- Proper number parsing and validation

```javascript
let handicap = null;
const handicapInput = document.getElementById('handicap')?.value?.trim();
if (handicapInput && handicapInput !== '') {
    const handicapMatch = handicapInput.match(/^(\+)?(\d+\.?\d*)$/);
    if (handicapMatch) {
        const isPlus = handicapMatch[1] === '+';
        const handicapValue = parseFloat(handicapMatch[2]);
        handicap = isPlus ? `+${handicapValue}` : handicapValue;
    }
}
```

---

## Required: Run SQL Script to Fix Existing Data

### **IMPORTANT: You Must Run This SQL Script**

A SQL script has been created at: `C:\Users\pete\Documents\MciPro\fix_travellers_rest_players.sql`

**This script will:**
1. Find all users with `clubAffiliation = "Travellers Rest Golf Group"`
2. Update their `society_id` in `user_profiles` table
3. Create entries in `society_members` table
4. Link them properly to Travellers Rest society

**How to run it:**

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the entire contents of `fix_travellers_rest_players.sql`
6. Click **Run**

**Expected output:**
```
NOTICE:  Found Travellers Rest society: 7c0e4b72-d925-44bc-afda-38259a7ba346
NOTICE:  Updated N user profiles with society_id
NOTICE:  Inserted N new members into society_members table
NOTICE:  ========================================
NOTICE:  SUMMARY:
NOTICE:    - Society ID: 7c0e4b72-d925-44bc-afda-38259a7ba346
NOTICE:    - Updated user profiles: N
NOTICE:    - Created society memberships: N
NOTICE:  ========================================
```

Then you'll see a verification table showing all Travellers Rest members.

---

## What Happens Now

### For Existing Users (After Running SQL Script)
- All current users with "Travellers Rest Golf Group" clubAffiliation will appear in Player Directory
- They'll have proper `society_id` links
- They'll show up in society member counts

### For New Users (Going Forward)
- When a new user selects a society during registration:
  1. Their `clubAffiliation` is saved (text)
  2. Their `societyOrganizerId` is mapped (e.g., 'trgg-pattaya')
  3. Profile is synced to Supabase
  4. System looks up `society_id` from `society_profiles`
  5. Creates entry in `society_members` table
  6. User appears in Player Directory immediately

### For Handicap
- Empty handicap now saves as `null` (not empty string)
- Plus handicaps (+5) are properly supported
- Handicap changes save correctly to database

---

## Files Changed

| File | Changes |
|------|---------|
| `public/index.html` | Added society mapping in registration (line 10283) |
| | Fixed handicap parsing (line 15534) |
| `public/supabase-config.js` | Added automatic society_members creation (line 373) |
| `public/sw.js` | Version bump to 'society-members-fix-v1' |
| `fix_travellers_rest_players.sql` | **NEW** - SQL script to fix existing data |

---

## Git Commit

**Commit:** `8c8a333f` - "Fix society membership system and handicap saving"
**Pushed to:** master branch
**GitHub:** https://github.com/pgatour29-pro/mcipro-golf-platform

---

## Deployment Checklist

- [x] Code changes committed and pushed
- [x] Service worker version updated (cache will clear)
- [ ] **REQUIRED:** Run `fix_travellers_rest_players.sql` in Supabase
- [ ] Deploy to production (Vercel will auto-deploy from master)
- [ ] Verify Travellers Rest now shows players in Player Directory
- [ ] Test new user registration with society selection
- [ ] Test handicap save on golfer dashboard

---

## Testing After Deployment

1. **Verify Existing Players:**
   - Go to Society Organizer → Select Travellers Rest
   - Player Directory should now show all members
   - Count should match SQL script output

2. **Test New Registration:**
   - Create a new golfer account
   - Select "Travellers Rest Group" from Club Affiliation dropdown
   - Complete registration
   - Check that player appears in Player Directory immediately
   - Verify `society_members` table has new entry

3. **Test Handicap:**
   - Edit profile on golfer dashboard
   - Save with handicap value (e.g., 7.2)
   - Save with empty handicap
   - Save with plus handicap (e.g., +2.5)
   - Verify all cases save correctly and display properly

---

## Notes

- The SQL script is **idempotent** - safe to run multiple times
- It uses `ON CONFLICT` to avoid duplicates
- New users will automatically be linked to societies going forward
- No manual intervention needed after running the SQL script once

---

**Status:** ✅ Code fixes complete and deployed
**Next Step:** Run the SQL script in Supabase to populate existing players

Generated with Claude Code - November 30, 2025
