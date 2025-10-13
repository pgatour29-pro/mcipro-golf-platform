# MciPro Chat Fix Kit

This kit removes the broken RPC dependency, fixes RLS, and makes message send fast & reliable.

## What's inside
- `sql/setup_chat.sql` — tables, indexes, and row‑level security.
- `js/auth-bridge.patch.js` — safe profile upsert by `line_user_id` to stop 409/23505s.
- `js/chat-system-full.patch.js` — open/create DM rooms and send messages with direct inserts.
- `js/chat-realtime-snippet.js` — example realtime subscription per room.

## Apply steps (10–15 minutes)
1. **Run SQL**: Open Supabase SQL Editor → paste and run `sql/setup_chat.sql`.
2. **Patch `auth-bridge.js`**: Replace your profile upsert block with `js/auth-bridge.patch.js` code.
3. **Patch `chat-system-full.js`**:
   - Replace the `rpc/ensure_direct_conversation` usage with `openOrCreateDM()` from `js/chat-system-full.patch.js`.
   - Replace any RPC send with `sendMessage()` from the same file.
   - (Optional) Add the subscription helper from `js/chat-realtime-snippet.js`.
4. **Deploy** and test: open Pete ↔ Donald DM; type and send — messages should appear instantly.

Tip: If you still have legacy duplicate rows in `profiles.line_user_id`, run the SQL dedupe separately later; the new upsert already tolerates it.
