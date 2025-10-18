# Recalculate Event Fees - Instructions

## Purpose
This script recalculates the `total_fee` for all registrations in an event based on:
- Event's member_fee and non_member_fee
- Player's society membership status
- Optional fees selected (transport, competition)

## When to Use
- After adding member/non-member fee structure to existing events
- When fees were not calculated during initial registration
- When membership status has changed
- When event fees have been updated

## How to Run

### Step 1: Find the Event ID
1. Login as Society Organizer
2. Go to Events tab
3. Click on the event you want to recalculate
4. Open browser console (F12)
5. Look for the event ID in the URL or console logs

OR

Run this in the console to list all events:
```javascript
const events = await SocietyGolfDB.getOrganizerEvents(AppState.currentUser.lineUserId);
events.forEach(e => console.log(e.id, e.name, e.date));
```

### Step 2: Run the Recalculation
In the browser console, run:
```javascript
const result = await SocietyGolfDB.recalculateEventFees('EVENT_ID_HERE');
console.table(result.results);
```

Example:
```javascript
// For the "10-24-25 Budapaw Two-Man Scramble" event
const result = await SocietyGolfDB.recalculateEventFees('evt_123abc');
console.table(result.results);
```

### Step 3: Review Results
The function will output:
- Event name
- Member fee and non-member fee
- Each player's membership status
- Calculated total fee for each player
- Success/error status for each update

Example output:
```
[FeeRecalculation] Event: 10-24-25 Budapaw Two-Man Scramble
[FeeRecalculation] Member Fee: ฿2250
[FeeRecalculation] Non-Member Fee: ฿1000
[FeeRecalculation] Found 4 registrations
[FeeRecalculation] Pete Park: MEMBER → ฿2250.00
[FeeRecalculation] Bill Shepley: NON-MEMBER → ฿3250.00
[FeeRecalculation] Billy Shepley: NON-MEMBER → ฿3250.00
[FeeRecalculation] Tristan Gilbert: MEMBER → ฿2250.00
[FeeRecalculation] ✅ Complete! Updated: 4, Skipped: 0
```

### Step 4: Verify Changes
1. Close and reopen the roster view
2. Check that total fees are now displayed correctly
3. Verify revenue calculations are accurate

## What the Function Does

1. **Fetches Event Details**: Gets member_fee, non_member_fee, and optional fees
2. **Checks Membership**: Queries society_members table for each player
3. **Calculates Fee**:
   - Members: member_fee + optional fees
   - Non-Members: member_fee + non_member_fee + optional fees
4. **Updates Database**: Sets total_fee for each registration
5. **Returns Report**: Details about each player updated

## Important Notes

- ✅ Safe to run multiple times (idempotent)
- ✅ Does NOT affect payment_status or amount_paid
- ✅ Only updates total_fee field
- ✅ Respects optional fee selections (transport, competition)
- ⚠️ Requires event to have member_fee set (or falls back to base_fee)
- ⚠️ Must be run as logged-in organizer

## Batch Processing Multiple Events

To recalculate fees for ALL events:
```javascript
const events = await SocietyGolfDB.getOrganizerEvents(AppState.currentUser.lineUserId);
for (const event of events) {
    console.log('\n=== Processing:', event.name, '===');
    await SocietyGolfDB.recalculateEventFees(event.id);
}
```

## SQL Alternative (Manual)

If you prefer to set fees manually via SQL:

```sql
-- Update all registrations for a specific event
-- Replace EVENT_ID and TOTAL_FEE with actual values
UPDATE event_registrations
SET total_fee = 2250.00  -- Set your fee here
WHERE event_id = 'EVENT_ID_HERE'
  AND (total_fee IS NULL OR total_fee = 0);

-- Example: Set all fees to ฿2,250 for Budapaw event
UPDATE event_registrations
SET total_fee = 2250.00
WHERE event_id = 'evt_123abc'
  AND (total_fee IS NULL OR total_fee = 0);
```

⚠️ **WARNING**: SQL approach does NOT differentiate between members and non-members.
Use the JavaScript function for accurate member/non-member pricing.

## Troubleshooting

**"Event not found"**
- Check the event ID is correct
- Ensure you're logged in as the organizer

**"Error updating [player name]"**
- Check database permissions
- Verify event_registrations table structure
- Check console for detailed error message

**Fees still showing ฿0.00**
- Hard refresh the page (Ctrl+Shift+R)
- Clear browser cache
- Check if service worker is updated

**Non-members showing member price**
- Verify player is NOT in society_members table
- Check society_name matches exactly
- Ensure membership status is 'active'

## After Recalculation

1. **Refresh Views**: Close and reopen roster/events to see updated fees
2. **Verify Revenue**: Check that revenue display shows correct totals
3. **Test Payment Flow**: Try marking a player as paid
4. **Update Event**: If needed, edit event fees using the new member/non-member fields
