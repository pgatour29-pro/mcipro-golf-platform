-- "Add Shannon Bar into the system": he was a live-scoring guest (player_1782269716630) with NO
-- user_profiles row → invisible/unclaimable. Create a findable guest profile keyed on his existing
-- player id (so his rounds stay tied to it) so he shows in the directory and can claim on first login.
insert into public.user_profiles (line_user_id, name, role, profile_data)
values (
  'player_1782269716630', 'Shannon Bar', 'golfer',
  jsonb_build_object('name','Shannon Bar','golfInfo',jsonb_build_object('handicap',4),'isGuest',true,'addedVia','live-scoring')
)
on conflict (line_user_id) do update set name=excluded.name, profile_data = public.user_profiles.profile_data || excluded.profile_data;
