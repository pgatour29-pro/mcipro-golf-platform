# JOA Golf Pattaya Society Setup Guide

## Overview
This guide will help you set up and access the JOA Golf Pattaya society organizer dashboard.

## Files Created
1. **setup-joa-access.html** - Interactive web tool to set up JOA society and grant access
2. **check-joa-society.html** - Diagnostic tool to check current status
3. **sql/create-joa-society.sql** - SQL script to create the JOA society profile
4. **sql/grant-joa-access.sql** - SQL script to grant user access
5. **societylogos/JOAgolf.jpeg** - JOA society logo (copied from JOA folder)

## Quick Start (Recommended)

### Option 1: Use the Interactive Web Tool (Easiest)

1. Open `setup-joa-access.html` in your browser
2. Click "Check Status" to see current state
3. Click "Create JOA Society Profile" (if not already created)
4. Enter your LINE user ID in Step 3
5. Click "Grant Society Organizer Access"
6. Click "Verify Access" to confirm everything is working
7. Reload the main MciPro app and access the Society Organizer dashboard

### Option 2: Use SQL Scripts (Direct Database Access)

1. **Create the JOA Society Profile:**
   - Open Supabase SQL Editor: https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/sql
   - Run the SQL in `sql/create-joa-society.sql`

2. **Grant Yourself Access:**
   - Open `sql/grant-joa-access.sql`
   - Replace `YOUR_LINE_USER_ID` with your actual LINE user ID
   - Run the SQL in Supabase SQL Editor

3. **Verify:**
   - Refresh the main MciPro app
   - You should now see "Society Organizer" in your profile menu

## What Was Set Up

### 1. Society Profile
- **Organizer ID:** JOAGOLFPAT
- **Society Name:** JOA Golf Pattaya
- **Logo:** ./societylogos/JOAgolf.jpeg
- **Description:** JOA Golf Pattaya Society - Weekly tournaments and events

### 2. Database Tables Used
- **society_profiles** - Stores society information and branding
- **user_profiles** - Updated with role='society_organizer' and society_id='JOAGOLFPAT'

### 3. User Profile Changes
When you grant access, your user profile is updated with:
- `role`: 'society_organizer'
- `society_id`: 'JOAGOLFPAT'
- `society_name`: 'JOA Golf Pattaya'

## How to Access the Dashboard

1. **Login to MciPro** - Use your LINE account
2. **Navigate to Profile** - Click on your profile icon
3. **Select Role** - Choose "Society Organizer" from the menu
4. **View Dashboard** - You should now see the Society Organizer Dashboard with:
   - Event creation
   - Player registration management
   - Results publishing
   - Society branding settings

## Troubleshooting

### Issue: "Society Organizer" option not showing
**Solution:**
1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Refresh the page
4. Login again

### Issue: Can't see JOA events
**Solution:**
1. Make sure the society profile was created (use check-joa-society.html)
2. Verify your user profile has society_id = 'JOAGOLFPAT'
3. Check console for any errors

### Issue: Logo not displaying
**Solution:**
1. Verify `societylogos/JOAgolf.jpeg` exists
2. Check the file path in the society_profiles table
3. Try clearing cache and reloading

## Database Schema Reference

### society_profiles Table
```sql
CREATE TABLE society_profiles (
    id UUID PRIMARY KEY,
    organizer_id TEXT UNIQUE,  -- 'JOAGOLFPAT'
    society_name TEXT,          -- 'JOA Golf Pattaya'
    society_logo TEXT,          -- './societylogos/JOAgolf.jpeg'
    description TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### user_profiles Table (relevant fields)
```sql
role TEXT,              -- 'society_organizer'
society_id TEXT,        -- 'JOAGOLFPAT'
society_name TEXT,      -- 'JOA Golf Pattaya'
```

## Next Steps

After gaining access, you can:

1. **Create Events**
   - Set event details (date, course, fees)
   - Configure registration limits
   - Set cutoff times

2. **Manage Registrations**
   - View registered players
   - Create pairings
   - Handle waitlist

3. **Publish Results**
   - Enter scores
   - Generate leaderboards
   - Export to LINE

4. **Customize Branding**
   - Upload custom logo
   - Update society description
   - Configure society settings

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Review the troubleshooting section above
3. Use the diagnostic tools (check-joa-society.html)
4. Verify database entries with SQL queries

## Related Documentation
- ADMIN_AND_DEVELOPMENT_STRATEGY.md
- SOCIETY_GOLF_INTEGRATION_GUIDE.md
- compacted/00-READ-ME-FIRST.md

---
**Created:** 2025-11-26
**Last Updated:** 2025-11-26
