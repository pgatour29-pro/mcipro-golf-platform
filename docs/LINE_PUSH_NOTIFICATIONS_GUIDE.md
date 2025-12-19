# LINE Push Notifications Setup Guide

## Overview

This system sends LINE push notifications to users when:
- **New events** are created in their society
- **Events are updated** (date, time, venue changes, or cancellations)
- **Direct messages** are received
- **Announcements** are posted to their society

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FLOW                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Database Action (INSERT/UPDATE)                                 │
│         ↓                                                        │
│  PostgreSQL Trigger                                              │
│         ↓                                                        │
│  Supabase Edge Function (line-push-notification)                 │
│         ↓                                                        │
│  LINE Messaging API                                              │
│         ↓                                                        │
│  User's LINE App 📱                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **LINE Official Account** with Messaging API enabled
2. **LINE Channel Access Token** (long-lived)
3. **Supabase Pro Plan** (for Edge Functions)
4. **Supabase CLI** installed

## Setup Instructions

### Step 1: Install Supabase CLI

```bash
# Windows (PowerShell)
scoop install supabase

# Or using npm
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

```bash
cd C:\Users\pete\Documents\MciPro
supabase link --project-ref pyeeplwsnupmhgbguwqs
```

### Step 4: Set LINE Channel Access Token as Secret

```bash
supabase secrets set LINE_CHANNEL_ACCESS_TOKEN="CUp++a4Rdt4zmGFzOV9qCX4d/G5SEO6c+WoeSo/UcZjFp6lYT2ghR38itiGhGn8nMvaSt1B33mJoaVVeVwwZeMJxLUs3jg40HD6sgoSSxtBzt0xpzXAODGvE2kz/IVS7ev0s+8Ruk3CEDrk9NPPWSAdB04t89/1O/w1cDnyilFU="
```

### Step 5: Deploy the Edge Function

```bash
supabase functions deploy line-push-notification
```

### Step 6: Run the SQL Setup Script

Go to Supabase Dashboard → SQL Editor → Run the contents of:
`sql/LINE_PUSH_NOTIFICATIONS_SETUP.sql`

This creates:
- `notification_preferences` table
- `notification_log` table
- Database triggers on `society_events`, `direct_messages`, `announcements`

### Step 7: Enable pg_net Extension (Recommended)

For async (non-blocking) notifications:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
```

## Configuration

### LINE Developer Console Settings

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Select your channel
3. Ensure **Messaging API** is enabled
4. Note your **Channel Access Token** (long-lived)
5. Webhook URL is NOT needed (we use push, not receive)

### Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `new_event` | Event INSERT (status = published/open) | All society members |
| `event_update` | Event UPDATE (date/time/venue/cancel) | Registered players only |
| `new_message` | Direct message INSERT | Message recipient |
| `announcement` | Announcement INSERT | All society members |

### User Preferences

Users can opt-out of notifications via the `notification_preferences` table:

```sql
-- Disable event notifications for a user
UPDATE notification_preferences
SET notify_new_events = false
WHERE user_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';
```

## Testing

### Test Edge Function Directly

```bash
curl -X POST https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "type": "new_event",
    "record": {
      "id": "test-123",
      "title": "Test Event",
      "date": "2025-12-20",
      "venue": "Test Golf Club",
      "society_id": "7c0e4b72-d925-44bc-afda-38259a7ba346"
    }
  }'
```

### Test via SQL Function

```sql
SELECT send_line_notification(
    'new_event',
    jsonb_build_object(
        'id', 'test-123',
        'title', 'Test Event from SQL',
        'date', '2025-12-20',
        'venue', 'Test Golf Club',
        'society_id', '7c0e4b72-d925-44bc-afda-38259a7ba346'
    )
);
```

### Check Notification Logs

```sql
SELECT * FROM notification_log ORDER BY created_at DESC LIMIT 10;
```

## Message Formats

### New Event (Flex Message)
Beautiful card with:
- Event title
- Date and venue
- "View Event" button

### Event Update (Text)
```
📢 Event Update: TRGG December Open

📅 New Date: December 20, 2025
⏰ New Time: 08:00
📍 New Venue: Phoenix Golf Club

Check the app for details.
```

### Direct Message (Text)
```
💬 New message from Pete Park

"Hey, are you playing tomorrow?"

Open MyCaddiPro to reply.
```

### Announcement (Text)
```
📣 Travellers Rest Golf Group Announcement

December Tournament Rules Update

All players must check in 30 minutes before...

Open MyCaddiPro for details.
```

## Troubleshooting

### Notifications Not Sending

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs line-push-notification
   ```

2. **Verify LINE token:**
   ```bash
   supabase secrets list
   ```

3. **Check notification_log table:**
   ```sql
   SELECT * FROM notification_log WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

4. **Verify user has LINE ID:**
   ```sql
   SELECT line_user_id FROM user_profiles WHERE line_user_id LIKE 'U%';
   ```

### LINE API Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 400 | Invalid request | Check message format |
| 401 | Invalid token | Refresh channel access token |
| 429 | Rate limited | Reduce notification frequency |
| 500 | LINE server error | Retry later |

### Common Issues

1. **"User not found" error:**
   - User hasn't added your LINE Official Account as friend
   - User blocked your account

2. **Duplicate notifications:**
   - Check trigger conditions aren't overlapping
   - Verify trigger isn't firing multiple times

3. **Slow notifications:**
   - Enable pg_net for async calls
   - Check Edge Function cold start times

## Cost Considerations

### LINE Messaging API
- **Free:** 500 messages/month
- **Light Plan:** 15,000 messages/month (~$50)
- **Standard Plan:** 45,000 messages/month (~$150)

### Supabase Edge Functions
- **Pro Plan:** 500K invocations/month included
- Additional: $2 per 1M invocations

## Future Enhancements

1. **Quiet Hours:** Respect user's quiet hours setting
2. **Digest Mode:** Bundle multiple notifications
3. **Rich Messages:** More Flex Message templates
4. **Read Receipts:** Track if user opened the app
5. **Localization:** Thai/English message templates

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/functions/line-push-notification/index.ts` | Edge Function code |
| `sql/LINE_PUSH_NOTIFICATIONS_SETUP.sql` | Database setup |
| `docs/LINE_PUSH_NOTIFICATIONS_GUIDE.md` | This guide |
