-- Make event messaging instant (like live scoring) instead of the 15s poll: put the message tables
-- in the realtime publication so open thread/notice views get INSERTs pushed immediately.
alter table public.event_private_messages replica identity full;
alter table public.event_announcements   replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.event_private_messages; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.event_announcements;   exception when duplicate_object then null; end;
end$$;
