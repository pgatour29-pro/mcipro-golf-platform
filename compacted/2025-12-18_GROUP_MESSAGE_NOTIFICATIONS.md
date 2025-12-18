# Group Message LINE Push Notifications - December 18, 2025

## Summary
Implemented LINE push notifications for group chat messages. Individual direct messages were already working, but group messages in `group_chat_messages` table were not triggering notifications.

---

## Problem
1. Direct messages worked via Edge Function trigger on `direct_messages` table
2. Group messages in `group_chat_messages` table had no notification trigger
3. Multiple failed attempts trying to call LINE API directly from database trigger
4. Edge Function was using wrong table name (`profiles` instead of `user_profiles`)

---

## Root Cause
1. The `MessagesSystem` uses `group_chat_messages` table (not `chat_messages`)
2. No trigger existed on `group_chat_messages` table
3. Initial attempts to call LINE API directly from pg_net failed
4. The working pattern uses: database trigger → Edge Function → LINE API

---

## Solution

### 1. Database Trigger (SQL)
Creates trigger on `group_chat_messages` that calls Edge Function:

```sql
CREATE OR REPLACE FUNCTION notify_group_chat_message()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/line-push-notification',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5ZWVwbHdzbnVwbWhnYmd1d3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTg0MzY2OSwiZXhwIjoyMDc1NDE5NjY5fQ.Gin1bCpBR_xCgDPzYsOPbNqIN-fBsd68lW1OBbi_wcA'
        ),
        body := jsonb_build_object(
            'type', 'group_message',
            'record', jsonb_build_object(
                'group_id', NEW.group_id,
                'sender_line_id', NEW.sender_line_id,
                'message_text', NEW.message_text
            )
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_group_message_notification
    AFTER INSERT ON group_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_group_chat_message();
```

### 2. Edge Function Changes
**File:** `supabase/functions/line-push-notification/index.ts`

Added new case in switch statement:
```typescript
case "group_message":
    result = await handleGroupMessage(supabase, payload.record);
    break;
```

Added new handler function `handleGroupMessage()`:
- Queries `group_chats` table for group name
- Queries `group_chat_members` for all members except sender
- Looks up `messaging_user_id` from `user_profiles` (critical fix!)
- Sends LINE push notification via multicast

### 3. Table Name Fix
Changed `profiles` to `user_profiles` in `handleNewMessage()` function (lines 431-434 and 510-514).

---

## Key Tables

| Table | Purpose |
|-------|---------|
| `group_chat_messages` | Stores group messages (id, group_id, sender_line_id, message_text, created_at) |
| `group_chat_members` | Stores group membership (group_id, member_line_id, joined_at, role) |
| `group_chats` | Stores group info (id, name, created_by, created_at) |
| `user_profiles` | Maps line_user_id to messaging_user_id |

---

## Critical Lesson: messaging_user_id vs line_user_id

The LINE push notification MUST use `messaging_user_id` from `user_profiles` table, NOT the raw `line_user_id` or `member_line_id`.

Direct messages already did this lookup. Group messages initially failed because we were sending to `member_line_id` directly.

**Fix:**
```typescript
// Look up messaging_user_id from user_profiles
const { data: profiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", memberLineIds);

// Use messaging_user_id if available
const lineUserIds = (profiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));
```

---

## Failed Approaches

### 1. Direct LINE API call from database trigger
Tried calling `https://api.line.me/v2/bot/message/push` directly from pg_net. The trigger appeared to fire but notifications didn't arrive.

### 2. Wrong table for trigger
Initially created trigger on `chat_messages` table, but `MessagesSystem` uses `group_chat_messages` table.

### 3. Using line_user_id instead of messaging_user_id
Even when Edge Function received correct data and LINE API returned 200, notifications didn't arrive because we weren't using `messaging_user_id`.

---

## Notification Flow

```
User sends group message
    ↓
INSERT into group_chat_messages
    ↓
trigger_group_message_notification fires
    ↓
notify_group_chat_message() calls Edge Function via pg_net
    ↓
Edge Function receives { type: 'group_message', record: {...} }
    ↓
handleGroupMessage() queries group_chat_members
    ↓
Looks up messaging_user_id from user_profiles
    ↓
Sends LINE multicast to all members except sender
    ↓
Members receive push notification
```

---

## Commits

| Commit | Message |
|--------|---------|
| `961ce0f0` | feat: Add group message LINE push notifications |

---

## Files Modified

- `supabase/functions/line-push-notification/index.ts` - Added handleGroupMessage(), fixed table names

---

## Verification

Edge Function logs show:
```
[LINE Push] Group message - group_id: 51d90b6a-8d35-48dd-ad2c-bf6b151efb25 sender: U2b6d976f19bca4b2f4374ae0e10ed873
[LINE Push] Group member LINE IDs: ["U9e64d5456b0582e81743c87fa48c21e2"]
[LINE Push] Found profiles: 1
[LINE Push] Final target IDs: ["U9e64d5456b0582e81743c87fa48c21e2"]
[LINE Push] Multicast SUCCESS to 1 users
[LINE Push] Multicast response: 200 {}
```

---

## Does NOT Affect

- Direct message notifications (separate code path)
- Event notifications
- Announcement notifications
- Platform announcements

Each notification type has its own handler function and they don't share code that was modified.
