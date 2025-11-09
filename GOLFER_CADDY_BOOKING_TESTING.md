# Golfer Caddy Booking Module - Testing Guide

## Overview
The Golfer Caddy Booking module has been successfully implemented! This guide will help you test all features.

---

## 1. What Was Implemented

### Module Location
- **File**: `C:/Users/pete/Documents/MciPro/public/index.html`
- **Line Range**: ~48480 - 49348
- **Marker**: `// GOLFER CADDY BOOKING SYSTEM - Book Caddies from Database`

### Entry Point
- **Location**: Golfer Dashboard > Overview Tab
- **Button**: "Book Caddy" card (second card in Quick Actions grid)
- **Function**: `goToCaddieBooking()` at line 46401
- **Behavior**: Calls `GolferCaddyBooking.showCaddyBookingPage()`

---

## 2. Database Setup

### Required Tables
1. **caddies** - Stores caddy profiles
2. **caddy_bookings** - Stores booking requests

### Setup Instructions

#### Option A: Using Supabase SQL Editor
1. Login to your Supabase dashboard
2. Navigate to SQL Editor
3. Open: `C:/Users/pete/Documents/MciPro/golfer_caddy_booking_schema.sql`
4. Copy and paste the entire SQL script
5. Run the script

#### Option B: Check if tables already exist
```sql
-- Run this query in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('caddies', 'caddy_bookings');
```

If tables exist, you're good to go! If not, run the schema SQL.

---

## 3. Test Data (Optional)

### Add Sample Caddies
If you need test data, uncomment and run the INSERT statements at the bottom of `golfer_caddy_booking_schema.sql`.

Or manually add caddies using the Golf Course Admin caddy management system.

### Minimum Required Caddy Fields
```sql
INSERT INTO caddies (
    caddy_number,
    name,
    home_club_id,
    home_club_name,
    rating,
    experience_years,
    languages,
    availability_status
) VALUES (
    'C001',
    'Test Caddy',
    'test-course',
    'Test Golf Course',
    4.8,
    10,
    ARRAY['English', 'Thai'],
    'available'
);
```

---

## 4. Testing Flow

### Test 1: Access the Module
1. Login as a **Golfer**
2. Go to Golfer Dashboard (should be the default landing page)
3. On the Overview tab, you should see Quick Action cards
4. Click the **"Caddy"** card (teal colored, with person icon)
5. **Expected**: Course selection page appears with gradient background

### Test 2: Course Selection
1. After clicking "Book Caddy", you should see:
   - Page title: "Book a Professional Caddy"
   - Course cards showing golf courses that have caddies
   - Each card shows: Course name, number of available caddies
2. Click on a course card
3. **Expected**: Navigate to caddy browsing interface for that course

### Test 3: Browse Caddies
1. After selecting a course:
   - See all caddies for that course
   - Filter bar with 5 filters: Availability, Rating, Experience, Language, Specialty
   - Each caddy card shows:
     - Photo (or default icon)
     - Name and number
     - Rating (stars)
     - Experience years
     - Languages
     - Specialty (if any)
     - Total rounds and reviews
     - "View Profile" and "Book Now" buttons

### Test 4: Apply Filters
1. **Availability Filter**: Try "Available" / "Booked" / "All Caddies"
2. **Rating Filter**: Try "4.7+ Stars" - should filter out lower-rated caddies
3. **Experience Filter**: Try "10+ Years" - should show only experienced caddies
4. **Language Filter**: Try "English" - should show only English-speaking caddies
5. **Specialty Filter**: Try "Championship" - should filter by specialty

**Expected**: Grid updates immediately as filters change

### Test 5: View Caddy Profile
1. Click "View Profile" on any caddy card
2. **Expected**: Modal popup with:
   - Caddy photo
   - Full details (rating, experience, rounds, reviews)
   - Specialty, Languages, Personality, Strengths sections
   - "Book This Caddy" button (if available)
   - "Join Waitlist" button (if booked)
   - "Close" button

### Test 6: Book a Caddy
1. Click "Book Now" on an available caddy
2. **Expected**: Booking modal appears with:
   - Caddy name and number in header
   - Date picker (minimum: today)
   - Time picker for tee time
   - Holes dropdown (9 or 18)
   - Special requests textarea (optional)
   - "Cancel" and "Confirm Booking" buttons

3. Fill in the form:
   - Select a date
   - Enter a tee time (e.g., 08:00)
   - Select 18 holes
   - Add special request: "Please bring extra towels"

4. Click "Confirm Booking"

5. **Expected**:
   - Modal closes
   - Success notification: "Booking request sent for [Caddy Name]! Awaiting confirmation from golf course."
   - Booking saved to database

### Test 7: View My Bookings
1. From the caddy browsing page, click "My Bookings" button (top right)
2. **Expected**: Shows all your caddy bookings with:
   - Caddy photo, name, number
   - Course name
   - Status badge (Pending/Confirmed/Completed/Cancelled)
   - Date, time, holes, rating
   - Special requests (if any)
   - "Cancel" button for pending bookings

### Test 8: Cancel a Booking
1. Find a booking with "Pending" status
2. Click the "Cancel" button
3. Confirm the cancellation dialog
4. **Expected**:
   - Success notification: "Booking cancelled successfully"
   - Booking status changes to "Cancelled"
   - Cancel button disappears

### Test 9: Navigation
1. **Change Course**: Click "Change Course" → Returns to course selection
2. **Back to Dashboard**: Click "Back to Dashboard" → Returns to golfer overview
3. **Back to Caddies**: From My Bookings, click "Back to Caddies" → Returns to caddy grid

---

## 5. Database Verification

### Check Bookings Were Created
```sql
-- Run in Supabase SQL Editor
SELECT
    cb.*,
    c.name as caddy_name,
    c.caddy_number
FROM caddy_bookings cb
LEFT JOIN caddies c ON cb.caddy_id = c.id
ORDER BY cb.created_at DESC;
```

### Check Booking Status
```sql
-- See all booking statuses
SELECT status, COUNT(*)
FROM caddy_bookings
GROUP BY status;
```

---

## 6. Browser Console Checks

### Open Developer Console
- Chrome/Edge: F12 or Ctrl+Shift+I
- Firefox: F12 or Ctrl+Shift+K

### Look for These Messages
When the module loads:
```
[GolferCaddyBooking] ✅ Module loaded
```

When opening caddy booking:
```
[GolferCaddyBooking] Opening caddy booking page...
```

When loading caddies:
```
[GolferCaddyBooking] Loading caddies for: [course-id]
[GolferCaddyBooking] Loaded X caddies
```

When loading bookings:
```
[GolferCaddyBooking] Loaded X bookings
```

---

## 7. Common Issues & Solutions

### Issue: No courses appear
**Solution**:
- Check if caddies table has data
- Verify caddies have `availability_status = 'available'`
- Check that caddies have valid `home_club_id` and `home_club_name`

### Issue: "Caddy not found" error
**Solution**:
- Refresh the page
- Check database for caddy record
- Verify caddy ID is correct

### Issue: Booking fails
**Solution**:
- Check if `window.currentUserId` is set (user must be logged in)
- Verify caddy_bookings table exists
- Check RLS policies allow insert
- Look at browser console for error details

### Issue: No bookings appear in "My Bookings"
**Solution**:
- Verify `window.currentUserId` matches the `golfer_id` in bookings
- Check RLS policy allows SELECT for current user
- Look at browser console for query errors

### Issue: Filters don't work
**Solution**:
- Check that caddies have the filter fields populated:
  - `rating` (decimal)
  - `experience_years` (integer)
  - `languages` (array)
  - `specialty` (text)

---

## 8. Feature Checklist

- [ ] Module loads without errors
- [ ] "Book Caddy" button appears on golfer dashboard
- [ ] Course selection page displays
- [ ] Courses with caddies are listed
- [ ] Clicking course shows caddy grid
- [ ] Caddies display with all information
- [ ] All 5 filters work correctly
- [ ] "View Profile" modal works
- [ ] "Book Now" modal appears
- [ ] Booking form validates (requires date & time)
- [ ] Booking saves to database
- [ ] Success notification appears
- [ ] "My Bookings" page works
- [ ] Bookings list displays correctly
- [ ] Can cancel pending bookings
- [ ] Navigation buttons work (back/change course)
- [ ] No console errors
- [ ] Database queries successful

---

## 9. Advanced Testing

### Test with Multiple Courses
1. Add caddies with different `home_club_id` values
2. Verify course selector shows all courses
3. Verify each course shows only its caddies

### Test Availability States
1. Set some caddies to `availability_status = 'booked'`
2. Verify they show "Booked" badge
3. Verify "Book Now" changes to "Join Waitlist"

### Test Filter Combinations
1. Combine multiple filters (e.g., "4.8+ Rating" + "English" + "10+ Years")
2. Verify only matching caddies appear

### Test Edge Cases
1. **No caddies available**: Set all to 'booked', verify empty state
2. **No filters match**: Apply filters that match no caddies
3. **No bookings**: Verify "My Bookings" shows empty state
4. **Past date**: Try booking with past date (should be blocked by min date)

---

## 10. Integration Testing

### Test with Tee Time Booking
1. Book a tee time first
2. Then book a caddy for the same date/time
3. Verify both systems work independently

### Test with Golf Course Admin
1. As admin, add/edit caddies in CourseAdminSystem
2. As golfer, verify changes appear in GolferCaddyBooking
3. As admin, view caddy bookings from golfers

---

## 11. Performance Testing

### Check Load Times
1. Load course selector - should be instant
2. Load caddy grid - should complete within 1-2 seconds
3. Apply filters - should update immediately (no lag)

### Check Database Queries
1. Open Network tab in dev tools
2. Filter to Supabase API calls
3. Verify efficient queries (no N+1 problems)

---

## 12. Mobile Testing

### Test on Mobile Viewport
1. Open Chrome DevTools
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test on iPhone, iPad, Android sizes
4. Verify responsive design:
   - Cards stack on mobile
   - Filters stay usable
   - Modals fit screen
   - Buttons remain clickable

---

## 13. Success Criteria

The module is working correctly if:

1. ✅ No console errors
2. ✅ All navigation flows work
3. ✅ Filters apply correctly
4. ✅ Bookings save to database
5. ✅ Bookings appear in "My Bookings"
6. ✅ Cancellation works
7. ✅ UI is responsive and attractive
8. ✅ Data persists across page refreshes

---

## 14. Next Steps

After testing, you may want to:

1. **Add more caddies**: Using Golf Course Admin system
2. **Customize styling**: Adjust colors, fonts in the HTML
3. **Add features**:
   - Email notifications when booking confirmed
   - SMS alerts
   - Caddy reviews/ratings
   - Favorite caddies
   - Recurring bookings
4. **Integrate with payments**: Add caddy fees
5. **Add analytics**: Track popular caddies, booking patterns

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify database schema is correct
3. Check Supabase logs
4. Review RLS policies
5. Verify user authentication is working
