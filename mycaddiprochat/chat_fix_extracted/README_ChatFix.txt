MCiPro Chat Fix Bundle
======================

What this is
------------
A minimal, battle-tested set of Supabase SQL and frontend patches that fix:
- 403/42501 RLS errors when opening a chat
- Messages not sending because inserts are blocked by RLS
- ensure_direct_conversation RPC failing to create participants

Files
-----
1) supabase_chat_fix.sql
   - Enables RLS on conversations, conversation_participants, messages
   - Adds safe indexes
   - Creates precise RLS policies allowing users to read/write only in conversations they belong to
   - Installs SECURITY DEFINER RPC: ensure_direct_conversation(p_user_id uuid, p_other_user_id uuid)

2) frontend_patches.js
   - sendMessage(): inserts a message and surfaces any Supabase/PostgREST errors
   - openDirectChat(): calls the RPC with the current authenticated user + target user

How to use
----------
1) Open Supabase → SQL Editor → Run the contents of supabase_chat_fix.sql
2) In your chat UI:
   - Use openDirectChat(supabase, otherUserId) to get a conversation_id
   - Call sendMessage(supabase, conversationId, text, me.id) to post messages
3) Watch the browser console for any "[Chat] ... error:" lines if something still fails.
   Those errors now bubble up with human-readable context.

Notes
-----
- If your conversations table does not have a "type" column with value 'direct', remove the filter or adjust it.
- These policies assume auth.uid() is the Supabase user UUID you associate with each message/user_id.
- Your LIFF flow can keep using anonymous sign-in or custom JWTs; as long as the session is "authenticated",
  EXECUTE on the RPC is permitted.
