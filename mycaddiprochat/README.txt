
MciPro Chat Fix Pack
====================

1) Run `sql/chat_schema_rls_rpc.sql` in Supabase SQL editor.
   - Creates rooms/participants/messages tables
   - Adds RLS policies so only participants can see/write
   - Adds RPC ensure_direct_conversation(other_user uuid)

2) In your web app, include `js/chat_patch.js` and replace your DM open logic:
   - Do NOT use placeholder ids (a1111111-...).
   - User list items should carry either data-username or data-line-user-id.
   - Call openOrCreateDM(...) then subscribe/load.

3) (Optional) Add `sw/sw_hint.txt` logic to bypass caching for `/rest/v1` in your Service Worker.

4) Performance reminders:
   - Debounce dashboard re-renders to >= 1s or only on data changes.
   - Narrow message selects to needed columns.
   - Ensure `idx_msgs_room_created` exists (included).

If you already created bogus "dm:a111..." slugs, clean them using the commented SQL at the bottom of the SQL file.
