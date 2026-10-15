-- Rollback for sql/im_v1577.sql (IM conversion). Drops the RPCs and the helper; keeps the
-- attachments columns (data) and the announcements realtime publication (harmless).
drop function if exists public.im_search(text, text);
drop function if exists public.im_read(text, text);
drop function if exists public.im_thread(text, text, int);
drop function if exists public.im_inbox(text);
drop function if exists public._im_by(text);
-- optional, destructive: uncomment to remove the photo columns
-- alter table public.direct_messages      drop column if exists attachments;
-- alter table public.group_chat_messages  drop column if exists attachments;
-- alter table public.event_group_messages drop column if exists attachments;
