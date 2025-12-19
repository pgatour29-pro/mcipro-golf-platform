# Society Organizer PIN Authentication - Integration Guide

## Overview
This adds PIN-based security for accessing the Society Organizer Dashboard.

## Files Created
1. `sql/society-organizer-pin-auth.sql` - Database migration
2. `society-organizer-pin-auth.html` - Complete HTML and JavaScript code

## Step 1: Run SQL Migration

**Important:** Run this SQL in your Supabase SQL Editor first!

Location: `C:/Users/pete/Documents/MciPro/sql/society-organizer-pin-auth.sql`

This creates:
- `society_organizer_access` table
- `verify_society_organizer_pin()` function
- RLS policies
- Default PIN: **1234** (change this!)

## Step 2: Integrate HTML Modal

Open `index.html` and find line **25287** (just before `<!-- Add Score Modal -->`).

Insert the PIN modal HTML from `society-organizer-pin-auth.html` (lines 1-56).

## Step 3: Add JavaScript Authentication Code

Open `index.html` and find the script section around line **28000+** (after the SocietyOrganizerManager class).

Insert the JavaScript code from `society-organizer-pin-auth.html` (starting at line 64).

## Step 4: Change Default PIN

**IMPORTANT SECURITY STEP!**

After testing, change the default PIN in Supabase:

```sql
UPDATE society_organizer_access
SET access_pin = 'YOUR_NEW_PIN'
WHERE id = (SELECT id FROM society_organizer_access LIMIT 1);
```

## How It Works

### User Flow:
1. User clicks "Society Organizer" button in Dev Mode
2. System checks sessionStorage for verification
3. If not verified, PIN modal appears
4. User enters PIN
5. System verifies against database using `verify_society_organizer_pin()` function
6. If correct:
   - sessionStorage flag set
   - User proceeds to dashboard
7. If incorrect:
   - Error message shown
   - User can retry

### Session Behavior:
- PIN verification persists during browser session
- Clears automatically when browser tab closes
- User must re-enter PIN after browser restart

### Security Features:
- PIN stored in database (can be hashed in future)
- Session-based verification
- Database function for secure PIN check
- RLS policies protect access table
- No PIN exposed in frontend code

## Testing Checklist

- [ ] SQL migration runs successfully
- [ ] PIN modal appears when accessing Society Organizer
- [ ] Correct PIN grants access
- [ ] Incorrect PIN shows error
- [ ] PIN persists during session
- [ ] PIN clears on browser close
- [ ] Enter key submits PIN
- [ ] Cancel button works
- [ ] Default PIN changed to secure value

## Future Enhancements

1. **Individual PINs per organizer**
   - Add line_user_id to table
   - Allow each organizer their own PIN

2. **PIN Hashing**
   - Store hashed PINs instead of plaintext
   - Use bcrypt or similar

3. **Admin UI for PIN Management**
   - Add PIN change interface
   - PIN reset functionality
   - Audit log of PIN changes

4. **Failed Attempt Lockout**
   - Track failed attempts
   - Temporarily lock after N failures

5. **PIN Expiry**
   - Force PIN change every N days
   - Add expiry date to database

## Troubleshooting

**Modal doesn't appear:**
- Check if `societyOrganizerPinModal` element exists in HTML
- Verify JavaScript loaded correctly
- Check browser console for errors

**PIN always fails:**
- Verify SQL migration ran successfully
- Check Supabase function exists: `verify_society_organizer_pin`
- Confirm default PIN inserted
- Check database connection

**Verification doesn't persist:**
- Verify sessionStorage is enabled in browser
- Check if `society_organizer_verified` key is set
- Clear browser cache and try again

## Contact
For issues or questions, check the implementation files:
- HTML/JS: `society-organizer-pin-auth.html`
- SQL: `sql/society-organizer-pin-auth.sql`
