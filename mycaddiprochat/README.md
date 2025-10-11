# MyCaddyPro Chat — Revised with Push + Private Media
Updated: 2025-10-11T14:29:48.501743Z

## 0) Prereqs
- Supabase project (Auth + Realtime enabled)
- Storage bucket `chat-media` (private = **true**)
- Deploy the two Edge Functions:
  - `chat-notify` (push notifications via FCM)
  - `chat-media` (signed URLs for private media)

## 1) Apply schema
Run **chat_messages_schema.sql** in the SQL Editor.

## 2) Storage
Create bucket **chat-media** (private). No public read.
We will use the **chat-media** edge function to mint short-lived signed URLs after validating membership.

## 3) Edge Functions
Deploy both (from your repo root if using the Supabase CLI):
```
supabase functions deploy chat-notify
supabase functions deploy chat-media
supabase functions secrets set FCM_SERVER_KEY=YOUR_FCM_SERVER_KEY
```
Map Database → Webhooks → On INSERT to `public.messages` → **chat-notify** URL (POST JSON).

## 4) Client files
Serve these modules:
- supabaseClient.js
- chat-database-functions.js
- chat-system-full.js
- chat-system-styles.css

HTML shell:
```html
<link rel="stylesheet" href="/chat-system-styles.css" />
<div id="chat">
  <ul id="conversations"></ul>
  <div id="main">
    <div id="messages"></div>
    <div id="typing"></div>
    <div id="composerRow">
      <label id="attachLabel" for="fileInput">Attach</label>
      <input id="fileInput" type="file" multiple />
      <input id="composer" placeholder="Message…" />
      <button id="sendBtn">Send</button>
    </div>
  </div>
</div>
<script src="/supabaseClient.js" type="module"></script>
<script src="/chat-database-functions.js" type="module"></script>
<script src="/chat-system-full.js" type="module"></script>
<script>
  import {{ initChat }} from '/chat-system-full.js';
  initChat();
</script>
```

## 5) How private media works
- Client uploads file to **chat-media** bucket under `conversationId/userId/uuid.ext`.
- Client inserts a message `{ type: 'image'|'video'|'audio'|'file', metadata: {{ bucket, object_path, mime, name, size }} }`.
- When displaying, client calls **/functions/v1/chat-media** with `{ conversation_id, bucket, object_path }`.
- The function verifies the caller is a participant **before** issuing a short-lived signed URL.

## 6) Push notifications
- The **chat-notify** function receives DB webhooks for new messages, fetches participant tokens (except sender), and sends FCM notifications.

## 7) Troubleshooting
- 403 on media sign: user isn't a participant of `conversation_id`.
- 403 on message insert: user isn't participant or RLS not applied.
- No push: set `FCM_SERVER_KEY` secret and verify webhook mapping.
