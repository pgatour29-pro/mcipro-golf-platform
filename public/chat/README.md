# Chat Module Integration Guide

This folder contains the production chat UI controller (`chat-system-full.js`) and its supporting helpers. Use this guide to wire the chat pane quickly and reliably.

## DOM requirements
Place these elements in the chat pane before calling `initChat()`:
- `#conversations` — `<ul>` for the sidebar list of rooms and contacts
- `#messages` — container for the message thread
- `#composer` — `<textarea>` or `<input>` for message entry
- `#sendBtn` — button to send the current message

Optional:
- `#contactsSearch` — input for server-backed contact search
- `#openGroupBuilder` — button to open the group creation modal
- `#typing` — small status area that shows "typing…"
- `#professionalChatContainer` — wrapper used to toggle contacts/thread on mobile

## Lifecycle API
- `initChat()` — call after the chat DOM exists and the user is authenticated. Idempotent and safe to call multiple times.
- `subscribeGlobalMessages()` — call once after login to start realtime delivery. Resilient to disconnects; falls back to polling.
- `teardownChat()` — call on logout or account switch. Cleans all websocket channels and event listeners.

These are exposed for convenience under `window.__chat` in development:
```
window.__chat.initChat()
window.__chat.subscribeGlobalMessages()
window.__chat.teardownChat()
window.__chat.openConversation(roomId)
```

## Behavior notes
- Realtime: Per-room subscriptions are established by `openConversation(roomId)` and are cleaned up when switching rooms.
- Backfill: Missed messages are backfilled adaptively on visibility/focus/online events.
- Unread: Badges are updated in the sidebar and a global count helper is invoked in the background.
- Idempotency: UI listeners are removed and reattached on `initChat()` to avoid duplicates during re-renders.

## Mobile UX
- Composer focus automatically engages after opening a room. On mobile, the messages pane adds padding to avoid keyboard overlap using the Visual Viewport API when available.
- If you maintain a header, you can implement `window.chatShowConversation(title)` to show the active room name when a room is selected.

## Persistence
- The last opened room is saved to `localStorage` and automatically reopened on the next visit if the user is still a member. Key: `chat:lastRoomId`.

## Data helpers
`chat-database-functions.js` provides:
- `openOrCreateDM(userId)`
- `fetchMessages(roomId, limit)`
- `sendMessage(roomId, content)`
- `subscribeToConversation(roomId, onInsert, onChange)`
- `subscribeTyping(roomId, onTyping)`
- `updateUnreadBadge()` and related utilities

These helpers expect a configured Supabase client from `supabaseClient.js` and an authenticated session.

## Troubleshooting
- If `initChat()` logs that required DOM elements are missing, ensure the IDs above exist before calling it.
- If realtime encounters repeated `CHANNEL_ERROR`s, the system retries with exponential backoff and falls back to polling automatically.
- Use `window.__chat` in the console for quick manual actions during development.
