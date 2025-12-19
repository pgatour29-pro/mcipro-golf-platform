# LINE Push Notifications - Complete Implementation
**Date:** 2025-12-11
**Status:** WORKING

## Summary
Implemented LINE push notifications so users get instant notifications on LINE when:
- They receive direct messages
- New events are created in their society
- Events are updated (date, time, venue, cancellation)
- Society announcements are posted

## The Problem
LINE Login and LINE Messaging API use **different user IDs** for the same person:
- LINE Login channel (2008228481): `U2b6d976f19bca4b2f4374ae0e10ed873` (Pete's login ID)
- Messaging API channel (2008222838): `U3a1e201b64695f2bde2e72d97e8adc61` (Pete's messaging ID)

Push notifications can only be sent using the Messaging API user ID.

## Solution
Added `messaging_user_id` column to `user_profiles` table and created an account linking flow.

### User Flow (One-Time Setup)
1. User goes to **Profile**
2. Scrolls to **LINE Push Notifications** section
3. Taps **Enable LINE Notifications** button
4. LINE opens with pre-filled message: `LINK:U9e64d5456b0582e81743c87fa48c21e2`
5. User taps **Send**
6. Bot links accounts and confirms - done forever

## Files Modified/Created

### Edge Functions (Supabase)

**`supabase/functions/line-push-notification/index.ts`**
- Handles sending push notifications
- Types: `new_event`, `event_update`, `new_message`, `announcement`
- Looks up `messaging_user_id` from `user_profiles`
- Uses LINE Messaging API multicast for bulk sends

**`supabase/functions/line-webhook/index.ts`**
- Handles incoming messages from LINE bot
- Processes `LINK:xxx` messages to link accounts
- Updates `messaging_user_id` in database
- Sends confirmation message back to user

### Frontend (`public/index.html`)

**ProfileSystem.enableLineNotifications()**
```javascript
enableLineNotifications(lineUserId) {
    const linkCode = `LINK:${lineUserId}`;
    const lineUrl = `https://line.me/R/oaMessage/@283zvkfn/?${encodeURIComponent(linkCode)}`;
    window.location.href = lineUrl;
}
```

**ProfileSystem.updateLineNotificationsSection()**
- Shows "Notifications Enabled" if `messaging_user_id` is set
- Shows "Enable LINE Notifications" button if not linked

**MessagesSystem.sendLinePushNotification()**
- Called when DM is sent (both from compose modal AND from open conversation)
- Calls Edge Function directly for instant notifications

### Database

**SQL to run:**
```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS messaging_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_messaging_user_id
ON user_profiles(messaging_user_id);
```

### Supabase Secrets Required
```
LINE_CHANNEL_ACCESS_TOKEN - from LINE Messaging API channel (2008222838)
```

## Key Code Locations

| Feature | File | Line/Function |
|---------|------|---------------|
| Send LINE push on DM | public/index.html | `sendMessage()` ~59813 |
| Send LINE push on compose | public/index.html | `sendComposeMessage()` ~60182 |
| LINE push helper | public/index.html | `sendLinePushNotification()` ~60234 |
| Enable notifications button | public/index.html | `enableLineNotifications()` ~16572 |
| Check notification status | public/index.html | `updateLineNotificationsSection()` ~16581 |
| Push notification handler | supabase/functions/line-push-notification/index.ts | entire file |
| Account linking webhook | supabase/functions/line-webhook/index.ts | entire file |

## Mistakes Made

1. **Tried to switch LINE Login channels** - Caused users to appear as new users, had to revert everything

2. **Missing sendLinePushNotification call** - Only added it to compose modal, forgot to add it to the `sendMessage()` function used when typing in an open conversation

3. **Asked users to manually type LINK code** - Stupid idea, fixed by using LINE's oaMessage URL scheme to pre-fill the message

4. **HTML download instead of display** - Webhook returning HTML was being downloaded on mobile, switched to in-app modal approach then finally to direct LINE URL

## LINE Configuration Required

In LINE Developers Console for Messaging API channel (2008222838):
1. Set Webhook URL: `https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-webhook`
2. Enable "Use webhook"

## Testing

To verify a user is linked:
```sql
SELECT line_user_id, messaging_user_id, name
FROM user_profiles
WHERE messaging_user_id IS NOT NULL;
```

To manually link a user (if needed):
```sql
UPDATE user_profiles
SET messaging_user_id = 'Uxxxx_messaging_id'
WHERE line_user_id = 'Uxxxx_login_id';
```

## Auto-Read Bug Fix (Same Session)

Also fixed bug where message badges disappeared after 5 seconds:
- Issue: `loadMessages()` was marking messages as read on every auto-refresh (15 seconds)
- Fix: Added `markAsRead` parameter, auto-refresh passes `false`
- Messages now only marked as read when user explicitly opens a conversation
