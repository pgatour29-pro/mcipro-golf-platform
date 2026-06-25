-- Give each society a user_profiles "sender" identity so messages sent from a society
-- dashboard (shared PIN session) have a valid sender and show the society's name.
insert into public.user_profiles (line_user_id, name, role)
select s.id::text, s.name, 'organizer'
from public.societies s
where s.name is not null
  and not exists (select 1 from public.user_profiles up where up.line_user_id = s.id::text);
