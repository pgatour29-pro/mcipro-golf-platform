-- ROLLBACK for v1558 MESSAGES HUB. Removes the hub's RPCs and tables and the roster caddy placeholder accounts.
-- Kept on purpose (do NOT restore): the key-free notification triggers, the dropped duplicate group push and the
-- dropped no-op direct_messages push (none of them ever delivered anything the edge functions don't already send),
-- the Tap-In Course folder fix and ecm_handle writing 'active'.
-- caddy_profile_write keeps its placeholder clause: harmless once no 'CADDY-<hex>' accounts exist.
begin;
drop trigger if exists caddy_account_trg on public.caddy_profiles;
drop function if exists public.caddy_account_trg();
alter table public.caddy_profiles disable trigger course_change_log_trg;
update public.caddy_profiles set user_id = null where user_id ~ '^CADDY-[0-9a-f]{32}$';
alter table public.caddy_profiles enable trigger course_change_log_trg;
delete from public.caddy_pin_logins where user_id ~ '^CADDY-[0-9a-f]{32}$';
delete from public.group_chat_members where member_line_id ~ '^CADDY-[0-9a-f]{32}$';
delete from public.user_profiles where line_user_id ~ '^CADDY-[0-9a-f]{32}$';
drop function if exists public.mh_inbox(text), public.mh_thread(text, text), public.mh_read(text, text),
  public.mh_send(text, text, text, text, text), public.mh_caddies(text, boolean), public.mh_add_caddy(text, text, text, uuid, text),
  public.mh_caddy_send(text, text, text, text, uuid[], text, text), public.mh_pref(text, text, text, text), public.mh_folder(text, text, text, uuid),
  public.msg_prefs(text), public.msg_pref(text, text, text, text), public.msg_folder(text, text, text, uuid),
  public._msg_prefs_of(text), public._msg_pref_set(text, text, text, text), public._msg_folder_set(text, text, text, uuid),
  public._desk_owner(text), public._mh_course_profile(text, text), public._caddy_account(uuid), public._caddy_handover(text, text);
drop table if exists public.msg_thread_prefs, public.msg_folders, public.course_broadcasts;
commit;
