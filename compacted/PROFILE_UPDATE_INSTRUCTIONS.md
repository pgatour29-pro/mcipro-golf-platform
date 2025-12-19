# Profile Update Instructions - Society Affiliation & Home Course

## Step 1: Update supabase-config.js

**File:** `C:/Users/pete/Documents/MciPro/supabase-config.js`
**Line:** 254 (after `language: profile.language || 'en',`)

Add these lines:

```javascript
            language: profile.language || 'en',

            // ===== NEW: Society Affiliation Fields =====
            society_id: profile.society_id || profile.societyId || null,
            society_name: profile.society_name || profile.societyName || profile.organizationInfo?.societyName || '',
            member_since: profile.member_since || profile.memberSince || null,

            // ===== NEW: Home Course Fields =====
            home_course_id: profile.home_course_id || profile.homeCourseId || profile.golfInfo?.homeCourseId || '',
            home_course_name: profile.home_course_name || profile.homeCourseName || profile.golfInfo?.homeClub || '',
```

Also update line ~265 to add `organizationInfo`:

```javascript
            profile_data: {
                personalInfo: profile.personalInfo || {},
                golfInfo: profile.golfInfo || {},
                organizationInfo: profile.organizationInfo || {},  // ← ADD THIS LINE
                professionalInfo: profile.professionalInfo || {},
```

## Step 2: Run SQL Migrations in Supabase

Run these 3 files in order in Supabase SQL Editor:

1. `sql/add_society_affiliation_to_user_profiles.sql`
2. `sql/add_home_course_to_user_profiles.sql`
3. `sql/migrate_existing_profile_data.sql`

## Step 3: Update index.html (automated - see below)

## Step 4: Deploy to Netlify (automated - see below)

## Step 5: Verify

Run `sql/check_pete_profile.sql` to verify Pete's profile has the data.
