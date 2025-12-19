# Complete Chat System - File Locations & Overview

## All Chat Files

### 1. Frontend JavaScript Files (in `/chat/` folder)
- **`/chat/chat-system-full.js`** - Main chat UI (renders messages, contact list, handles clicks)
- **`/chat/chat-database-functions.js`** - Database operations (send message, create conversation, fetch messages)
- **`/chat/supabaseClient.js`** - Lazy-loading Supabase client wrapper
- **`/chat/auth-bridge.js`** - Links LINE user ID to Supabase anonymous auth

### 2. HTML/CSS (embedded in index.html)
- **Lines 36560-36750 in `index.html`** - Chat container HTML and CSS
- **Lines 36692-36750 in `index.html`** - Chat initialization JavaScript

### 3. Database Files
- **`/chat/bridge-line-auth.sql`** - SQL migration to set up chat tables and RLS policies

### 4. Documentation
- **`CHAT_LINE_AUTH_SETUP.md`** - Setup instructions (mostly complete)
- **`CHAT_TESTING_GUIDE.md`** - Testing guide

---

## How the Chat System Works

### Architecture Flow

```
User clicks chat button
    ↓
index.html: window.openProfessionalChat()
    ↓
chat-system-full.js: initChat()
    ↓
auth-bridge.js: ensureSupabaseSessionWithLIFF()
    ↓ (creates anonymous Supabase session linked to LINE ID)
    ↓
Load user list from profiles table
    ↓
Render contact list
    ↓
User clicks contact → ensureDirectConversation(userId)
    ↓
chat-database-functions.js: calls RPC ensure_direct_conversation(partner)
    ↓
Supabase creates conversation + participants
    ↓
openConversation(conversationId)
    ↓
Load messages, subscribe to real-time updates
    ↓
User types message → sendMessage()
    ↓
chat-database-functions.js: calls RPC send_message(conv_id, body)
    ↓
Message stored in database
    ↓
Real-time subscription fires → message appears
```

---

## Database Schema (Production)

### Tables

**conversations**
- id (uuid, primary key)
- created_by (uuid)
- created_at (timestamptz)

**conversation_participants**
- conversation_id (uuid, FK to conversations)
- profile_id (uuid)
- PRIMARY KEY (conversation_id, profile_id)

**messages**
- id (uuid, primary key)
- conversation_id (uuid, FK to conversations)
- sender_id (uuid)
- body (text, not null)
- created_at (timestamptz)

**profiles** (existing table, modified)
- id (uuid, primary key) ← Supabase Auth UUID
- line_user_id (text, unique) ← LINE user ID (e.g., U9e64d5...)
- display_name (text)
- username (text)
- avatar_url (text)

### RPC Functions

**ensure_direct_conversation(partner uuid) → uuid**
- Finds or creates 1:1 conversation between current user and partner
- Returns conversation_id

**send_message(p_conversation_id uuid, p_body text) → uuid**
- Creates message in conversation
- Returns message_id

---

## Current Status

### ✅ Working
1. Anonymous Supabase auth linked to LINE ID
2. Chat opens on mobile (split-screen, doesn't block nav tabs)
3. Chat loads fast on mobile (<1 second)
4. Contact list loads (shows Pete)
5. Clicking contact creates conversation
6. Conversation ID returned successfully

### ❌ Not Yet Tested
1. Message sending
2. Message display in UI
3. Real-time message updates

### 🎯 Last Successful Test
```
Console log from mobile:
[Chat] ✅ Authenticated: 07dc3f53-468a-4a2a-9baf-c8dfaa4ca365
[Chat] Loaded 1 users
[Chat] Creating/opening conversation with a1111111-1111-1111-1111-111111111111
[Chat] Conversation ID: a56fc51c-af9e-4b3c-9cbf-10fa2d4e4f57
```

---

## Mobile Layout (Current)

- **Top:** 80px from top (leaves space for header + nav tabs)
- **Layout:** Split-screen
  - Top 40%: Contact list (scrollable)
  - Bottom 60%: Chat messages + composer
- **Backdrop:** Semi-transparent, click to close
- **Design:** Simple text list (no avatars, no fancy styling for speed)

---

## Next Steps to Complete

1. **Test message sending** - Type "test" and press Enter
2. **Verify message appears** in chat area
3. **Test Pete sending reply** from his device
4. **Verify real-time delivery** works

---

## Key Configuration

### Supabase Dashboard Settings (Already Done)
- ✅ Anonymous auth enabled
- ✅ Database migration run (all 4 SQL blocks)
- ✅ RLS policies fixed (no more infinite recursion)

### Environment
- **Production URL:** https://mcipro-golf-platform.netlify.app
- **Supabase Project:** pyeeplwsnupmhgbguwqs.supabase.co
- **LINE LIFF ID:** 2008228481

---

## Troubleshooting Commands (Desktop Only)

**Open chat manually:**
```javascript
window.openProfessionalChat();
```

**Check current user:**
```javascript
await window.SupabaseDB.client.auth.getUser();
```

**Test RPC directly:**
```javascript
const { data, error } = await window.SupabaseDB.client.rpc('ensure_direct_conversation', {
  partner: 'a1111111-1111-1111-1111-111111111111'
});
console.log('Conversation:', data, error);
```

**Test message sending:**
```javascript
const { data, error } = await window.SupabaseDB.client.rpc('send_message', {
  p_conversation_id: 'a56fc51c-af9e-4b3c-9cbf-10fa2d4e4f57',
  p_body: 'test message'
});
console.log('Message:', data, error);
```
