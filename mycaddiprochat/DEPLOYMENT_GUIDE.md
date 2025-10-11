# Professional Chat System - Surgical Deployment Guide

## Overview
This guide walks you through replacing the basic chat system with the professional LINE-style chat system.

**Estimated Time:** 30-45 minutes
**Downtime:** None (deploy alongside existing system)

---

## Phase 1: Supabase Database Setup (10 minutes)

### Step 1.1: Run SQL Schema
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `chat_schema_comprehensive.sql`
3. Click "RUN"
4. Verify no errors in output

**Expected Result:**
- 9 tables created
- 18 RLS policies created
- 4 triggers created
- 1 helper function created

### Step 1.2: Migrate Existing Profiles
Run this in SQL Editor to sync existing users:

```sql
-- Sync existing users to profiles table
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT
    u.id,
    up.name as display_name,
    up.profile_data->>'linePictureUrl' as avatar_url
FROM auth.users u
LEFT JOIN user_profiles up ON up.line_user_id = u.id::text
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url;
```

**Verify:**
```sql
SELECT COUNT(*) FROM public.profiles;
-- Should return 2 (Pete Park + Donald Lump)
```

---

## Phase 2: Supabase Storage (5 minutes)

### Step 2.1: Create Private Bucket
1. Go to Storage → New Bucket
2. **Name:** `chat-media`
3. **Public:** ❌ UNCHECKED (must be private!)
4. **File size limit:** 50 MB
5. Click "Create bucket"

### Step 2.2: Verify Bucket Settings
- Bucket should show "Private" badge
- No public access policies should exist

---

## Phase 3: Deploy Edge Functions (10 minutes)

### Prerequisites
```bash
# Install Supabase CLI if not already installed
npm install -g supabase
```

### Step 3.1: Initialize Supabase Project (if needed)
```bash
cd C:\Users\pete\Documents\MciPro
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 3.2: Deploy chat-notify Function
```bash
# Create functions directory structure
mkdir -p supabase/functions/chat-notify
mkdir -p supabase/functions/chat-media

# Copy edge function files
cp mycaddiprochat/edge-chat-notify.js supabase/functions/chat-notify/index.ts
cp mycaddiprochat/edge-chat-media.js supabase/functions/chat-media/index.ts

# Deploy both functions
supabase functions deploy chat-notify
supabase functions deploy chat-media
```

### Step 3.3: Set FCM Server Key (Optional, for push notifications)
```bash
# Get FCM key from Firebase Console → Project Settings → Cloud Messaging
supabase functions secrets set FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY_HERE
```

**Verify Functions:**
```bash
supabase functions list
# Should show: chat-notify, chat-media (both deployed)
```

---

## Phase 4: Configure Database Webhooks (5 minutes)

### Step 4.1: Get Function URL
1. Supabase Dashboard → Edge Functions
2. Click "chat-notify"
3. Copy the function URL (looks like: `https://PROJECT_REF.supabase.co/functions/v1/chat-notify`)

### Step 4.2: Create Webhook
1. Go to Database → Webhooks
2. Click "Create a new hook"
3. **Name:** `chat-notify-on-message`
4. **Table:** `public.messages`
5. **Events:** ✅ INSERT only
6. **Type:** HTTP Request
7. **Method:** POST
8. **URL:** Paste the chat-notify function URL from above
9. **HTTP Headers:**
   ```json
   {
     "Content-Type": "application/json"
   }
   ```
10. Click "Create webhook"

**Test Webhook:**
```sql
-- Send test message (should trigger webhook)
INSERT INTO public.messages (conversation_id, sender_id, sender_name, type, body)
VALUES (
    gen_random_uuid(),
    (SELECT id FROM public.profiles LIMIT 1),
    'Test User',
    'text',
    'Test message'
);
```

Check Edge Function logs to verify webhook fired.

---

## Phase 5: Deploy Client Files (15 minutes)

### Step 5.1: Copy Client Files to Public Directory
```bash
cd C:\Users\pete\Documents\MciPro

# Copy JavaScript modules
cp mycaddiprochat/supabaseClient.js ./public/chat/
cp mycaddiprochat/"chat-database-functions (1).js" ./public/chat/chat-database-functions.js
cp mycaddiprochat/"chat-system-full (1).js" ./public/chat/chat-system-full.js

# Copy CSS
cp mycaddiprochat/"chat-system-styles (1).css" ./public/chat/chat-system-styles.css
```

**Note:** If you don't have a `public/` directory, these files can be served from any web-accessible location.

### Step 5.2: Update index.html - Add CSS
Add this in the `<head>` section:

```html
<!-- Professional Chat System Styles -->
<link rel="stylesheet" href="/public/chat/chat-system-styles.css" />
```

### Step 5.3: Update index.html - Add JavaScript Modules

Replace the OLD ChatSystem code (lines 14911-17668) with:

```html
<script type="module">
// Import new chat system modules
import { initChat, ensureDirectConversation } from '/public/chat/chat-system-full.js';

// Initialize chat when chat button is clicked
window.openProfessionalChat = async function() {
    // Hide old chat if open
    const oldChat = document.querySelector('#chatModal');
    if (oldChat) oldChat.style.display = 'none';

    // Show new chat container
    const chatContainer = document.querySelector('#professionalChatContainer');
    if (!chatContainer) {
        console.error('[Chat] Container not found');
        return;
    }

    chatContainer.style.display = 'flex';

    // Initialize chat (loads conversations)
    await initChat();
};

// Keep backwards compatibility - wire to existing chat button
const existingChatBtn = document.querySelector('[onclick*="ChatSystem"]');
if (existingChatBtn) {
    existingChatBtn.onclick = window.openProfessionalChat;
}

// Expose for testing
window.__professionalChat = { initChat, ensureDirectConversation };
</script>
```

### Step 5.4: Add Chat Container HTML

Add this container before closing `</body>`:

```html
<!-- Professional Chat Container -->
<div id="professionalChatContainer" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 10000; background: white;">
    <div style="display: flex; height: 100%; max-width: 1400px; margin: 0 auto; box-shadow: 0 0 40px rgba(0,0,0,0.1);">
        <!-- Sidebar -->
        <div style="width: 300px; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column;">
            <div style="padding: 1rem; border-bottom: 1px solid #e5e7eb;">
                <h2 style="margin: 0; font-size: 1.25rem; font-weight: 600;">Messages</h2>
                <button onclick="document.querySelector('#professionalChatContainer').style.display='none'"
                        style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer;">
                    ✕
                </button>
            </div>
            <ul id="conversations" style="flex: 1; overflow-y: auto; list-style: none; padding: 0; margin: 0;">
                <!-- Conversations will be rendered here -->
            </ul>
        </div>

        <!-- Main Chat Area -->
        <div id="main" style="flex: 1; display: flex; flex-direction: column;">
            <!-- Messages -->
            <div id="messages" style="flex: 1; overflow-y: auto; padding: 1rem; background: #f9fafb;">
                <!-- Messages will be rendered here -->
            </div>

            <!-- Typing Indicator -->
            <div id="typing" style="padding: 0.5rem 1rem; min-height: 1.5rem; color: #6b7280; font-size: 0.875rem;">
                <!-- "typing..." will appear here -->
            </div>

            <!-- Composer -->
            <div id="composerRow" style="padding: 1rem; border-top: 1px solid #e5e7eb; display: flex; gap: 0.5rem; align-items: center;">
                <label id="attachLabel" for="fileInput" style="cursor: pointer; padding: 0.5rem 1rem; background: #f3f4f6; border-radius: 0.5rem;">
                    📎 Attach
                </label>
                <input id="fileInput" type="file" multiple style="display: none;" />
                <input id="composer" placeholder="Type a message..."
                       style="flex: 1; padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none;" />
                <button id="sendBtn" style="padding: 0.5rem 1.5rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 500;">
                    Send
                </button>
            </div>
        </div>
    </div>
</div>
```

---

## Phase 6: Testing (5-10 minutes)

### Test 1: Open Chat Interface
1. Login as Pete Park
2. Click chat icon
3. **Expected:** New chat interface opens
4. **Expected:** Conversations list loads

### Test 2: Start 1:1 Chat
```javascript
// In browser console:
const donaldId = 'U9e64d5456b0582e81743c87fa48c21e2'; // Donald's LINE user ID
const convoId = await window.__professionalChat.ensureDirectConversation(donaldId);
console.log('Conversation ID:', convoId);
```

**Expected:**
- Conversation created in database
- Shows in conversations list

### Test 3: Send Text Message
1. Select conversation from list
2. Type message: "Testing new chat system!"
3. Press Send
4. **Expected:** Message appears immediately
5. **Expected:** Console shows `[Chat] ✅ Message saved to Supabase`

### Test 4: Real-time Sync
1. Login as Donald Lump (different device/browser)
2. Open chat
3. **Expected:** See message from Pete in real-time (no refresh needed!)

### Test 5: Media Upload
1. Click "Attach" button
2. Select an image file
3. **Expected:** Image uploads to storage
4. **Expected:** Image message appears in chat
5. **Expected:** Image displays correctly (via signed URL)

### Test 6: Typing Indicator
1. Pete starts typing
2. **Expected:** Donald sees "typing..." indicator
3. After 8 seconds of no typing: indicator disappears

### Test 7: Read Receipts
```javascript
// Mark conversation as read
await window.__professionalChat.markRead(conversationId);
```

Check database:
```sql
SELECT * FROM message_receipts WHERE user_id = 'YOUR_USER_ID';
-- Should show read_at timestamp
```

---

## Phase 7: Migration from Old System (Optional)

### Migrate Existing Messages
```sql
-- Convert old chat_messages to new messages format
INSERT INTO public.messages (conversation_id, sender_id, sender_name, type, body, created_at)
SELECT
    -- Map room_id to conversation_id (you'll need to create conversations first)
    (SELECT id FROM conversations WHERE created_by = cm.user_id LIMIT 1),
    -- Map user_id to sender_id (UUID from profiles)
    p.id as sender_id,
    cm.user_name as sender_name,
    cm.type,
    cm.message as body,
    cm.created_at
FROM chat_messages cm
LEFT JOIN profiles p ON p.display_name = cm.user_name
WHERE cm.deleted_at IS NULL;
```

**Note:** Adjust this query based on your specific `room_id` to `conversation_id` mapping.

---

## Troubleshooting

### Issue: "Supabase client not found"
**Fix:** Ensure `supabase-config.js` loads BEFORE chat modules

```html
<script src="/supabase-config.js"></script>
<script type="module" src="/public/chat/chat-system-full.js"></script>
```

### Issue: "403 Forbidden" on message insert
**Cause:** User not added to `conversation_participants`

**Fix:**
```sql
-- Add user to conversation
INSERT INTO conversation_participants (conversation_id, user_id, role)
VALUES ('CONVERSATION_ID', 'USER_ID', 'member');
```

### Issue: "Media URL not signing"
**Cause:** Edge function not deployed or user not participant

**Check:**
1. Verify `chat-media` function deployed
2. Check user is in `conversation_participants`
3. Check Edge Function logs for errors

### Issue: "Push notifications not sending"
**Cause:** FCM_SERVER_KEY not set or webhook not configured

**Fix:**
```bash
# Set FCM key
supabase functions secrets set FCM_SERVER_KEY=YOUR_KEY

# Verify webhook exists
# Supabase Dashboard → Database → Webhooks → Should see chat-notify-on-message
```

### Issue: "Typing indicator not updating"
**Cause:** WebSocket subscription not established

**Fix:**
- Check browser console for Realtime connection errors
- Verify Supabase Realtime is enabled in project settings

---

## Performance Optimization

### Add Database Indexes
```sql
-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user_read ON public.message_receipts(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_cursors_user_conv ON public.read_cursors(user_id, conversation_id);
```

### Enable Query Optimization
```sql
-- Analyze tables for query planner
ANALYZE public.messages;
ANALYZE public.conversations;
ANALYZE public.conversation_participants;
```

---

## Rollback Plan

If something goes wrong, you can quickly rollback:

1. **Hide new chat, show old:**
```javascript
document.querySelector('#professionalChatContainer').style.display = 'none';
document.querySelector('#chatModal').style.display = 'block';
```

2. **Keep both systems running in parallel** during testing period

3. **Database is non-destructive** - old `chat_messages` table remains unchanged

---

## Post-Deployment Checklist

- [ ] SQL schema created successfully
- [ ] Profiles synced from `user_profiles`
- [ ] Storage bucket `chat-media` created (private)
- [ ] Edge Functions deployed (chat-notify, chat-media)
- [ ] Webhook configured for messages INSERT
- [ ] Client files copied to server
- [ ] HTML updated with new chat container
- [ ] Chat module imports added
- [ ] Test: 1:1 conversation created
- [ ] Test: Text messages send/receive in real-time
- [ ] Test: Media uploads work
- [ ] Test: Typing indicators appear
- [ ] Test: Read receipts update
- [ ] Old chat system can be removed (after testing period)

---

## Success Criteria

✅ **Working real-time chat** - Messages appear instantly without refresh
✅ **Media uploads** - Images/videos upload and display correctly
✅ **Typing indicators** - Shows when other user is typing
✅ **Read receipts** - Shows message delivery status
✅ **Secure** - RLS policies enforce access control
✅ **Fast** - No polling, pure WebSocket updates

---

## Next Steps After Deployment

1. **Add push notification tokens** - Implement token registration
2. **Add group chat UI** - Create group creation interface
3. **Add message search** - Implement full-text search
4. **Add reactions** - Implement emoji reactions
5. **Add voice messages** - Implement audio recording
6. **Add stickers** - Create sticker library

---

**Deployment Date:** 2025-10-11
**Version:** 1.0.0
**System:** Professional LINE-style Chat
**Status:** Ready for production deployment
