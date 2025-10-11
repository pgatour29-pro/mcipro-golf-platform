
# MyCaddyPro Chat — Fixed Drop-in

Updated: 2025-10-11T14:17:30.398912Z

## 0) Prereqs
- Supabase project with email/OAuth auth enabled
- Realtime enabled
- @supabase/supabase-js v2 on the client

## 1) Apply schema
Paste **chat_messages_schema.sql** in SQL Editor and run.
This creates profiles/conversations/participants/messages/receipts/cursors and strict RLS.

## 2) Seed profiles (optional)
Ensure each auth user has a row in `profiles` with `id = auth.users.id`.

## 3) Client files
Serve these:
- supabaseClient.js
- chat-database-functions.js
- chat-system-full.js
- chat-system-styles.css

HTML shell example:
```html
<link rel="stylesheet" href="/chat-system-styles.css" />
<div id="chat">
  <ul id="conversations"></ul>
  <div id="main">
    <div id="messages"></div>
    <div id="typing"></div>
    <div id="composerRow">
      <input id="composer" placeholder="Message…" />
      <button id="sendBtn">Send</button>
    </div>
  </div>
</div>
<script src="/supabaseClient.js" type="module"></script>
<script src="/chat-database-functions.js" type="module"></script>
<script src="/chat-system-full.js" type="module"></script>
<script>
  import { initChat } from '/chat-system-full.js';
  initChat();
</script>
```

## 4) Realtime subscriptions
We subscribe to Postgres changes on `messages` per conversation. No polling.

## 5) Security notes
- RLS allows reads/writes **only** for members of a conversation.
- Inserts require `sender_id = auth.uid()` and membership (not blocked).

## 6) Common pitfalls
- 403 on insert ⇒ user is not a participant, or RLS not applied.
- No realtime ⇒ check Realtime is ON and the channel filter matches column names.
- Blank bubbles ⇒ ensure you render `body` (not `text`/`content`).

## 7) Next
- Add push notifications via Edge Function webhook (optional).
- Add media uploads with a private bucket + signed URLs.
