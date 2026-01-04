# Caddy Booking Notification Edge Function
## Date: 2026-01-04

---

## Summary

Created and deployed the `notify-caddy-booking` Supabase edge function that sends LINE push notifications for caddy booking events from the tee sheet and booking systems.

---

## Function Location

**Supabase Function:** `notify-caddy-booking`
**File:** `supabase/functions/notify-caddy-booking/index.ts`
**Dashboard:** https://supabase.com/dashboard/project/pyeeplwsnupmhgbguwqs/functions

---

## Supported Actions

| Action | Recipient | Description |
|--------|-----------|-------------|
| `new_booking` | Caddy | New booking request received |
| `approved` | Golfer | Caddy confirmed the booking |
| `denied` | Golfer | Caddy declined the booking |
| `cancelled` | Both | Booking was cancelled |
| `time_changed` | Both | Tee time was changed |
| `waitlist_added` | Golfer | Added to caddy's waitlist |
| `waitlist_promoted` | Golfer | Spot became available |

---

## Request Format

```javascript
supabase.functions.invoke('notify-caddy-booking', {
  body: {
    action: 'new_booking', // or other action
    booking: {
      id: 'booking-123',
      caddyId: 'pat001',
      caddyName: 'Somchai',
      caddyLocalName: 'สมชาย',
      golferId: 'U1234567890abcdef',
      golferName: 'John Doe',
      date: '2026-01-04',
      time: '08:00',
      course: 'pattana-golf-resort',
      courseDisplay: 'Pattana Golf Club & Resort',
      oldTime: '09:00', // For time_changed
      position: 2 // For waitlist_added
    }
  }
});
```

---

## Message Types

### New Booking (Flex Message)
- Green header with "🎒 NEW BOOKING"
- Shows golfer name, date, time, course
- Button to open app

### Approved
- Text message with ✅ confirmation
- Shows caddy name, date, time, course

### Denied
- Text message with ❌
- Suggests booking different caddy

### Cancelled
- Text message with 🚫
- Sent to both caddy and golfer

### Time Changed
- Text message with ⏰
- Shows old time vs new time

### Waitlist Added
- Text message with 📋
- Shows waitlist position

### Waitlist Promoted (Flex Message)
- Green header with "🎉 SPOT AVAILABLE!"
- Button to confirm booking

---

## Integration Points

### Tee Sheet (`proshop-teesheet.html`)

```javascript
// ParentBridge.notifyCaddyBooking() at line ~2147
async notifyCaddyBooking(booking, action) {
  const supabase = this.getParent().supabase;
  if (!supabase?.functions?.invoke) return;

  await supabase.functions.invoke('notify-caddy-booking', {
    body: { action, booking }
  });
}
```

### Main App (`index.html`)

Already called from:
- Line 67166: Booking approval
- Line 67228: Booking denial
- Line 67464: Booking cancellation
- Line 67518: Time change

---

## Deployment

```bash
npx supabase functions deploy notify-caddy-booking --no-verify-jwt
```

---

## Environment Variables (Supabase Vault)

- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Messaging API token
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for DB access

---

## Testing

1. Create a tee sheet booking with a caddy
2. Check Supabase function logs for `[Caddy Notify]` messages
3. Verify LINE notification received

---

## Related Files

- `proshop-teesheet.html` - ParentBridge with notifyCaddyBooking()
- `2026-01-04_TEESHEET_CADDY_BOOKING_INTEGRATION.md` - Tee sheet integration docs
- `line-push-notification/index.ts` - Reference for LINE API patterns

