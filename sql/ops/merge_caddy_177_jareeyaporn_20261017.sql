-- 2026-10-17 ops: Barcelona Golf caddy #177 (Pete's manual roster row "Nim", Green Valley, photo)
-- registered herself via LINE (U4e54…, "625 Jareeyaporn") → two empty duplicate caddy_profiles rows.
-- Survivor = manual row a250ebcb (holds booking, review, desk PIN, photo). Her LINE login owns it.
-- 1. drop the two empty LINE-made duplicates (no bookings/reviews/jobs reference them)
delete from caddy_profiles
 where id in ('1fb2cc06-34bb-4bd1-a58e-dc296ab0f066','8c1ab086-292e-4f16-aec8-a2caa643b901')
   and user_id = 'U4e54f55dcb0f61563de10570f6772c63';
-- 2. her LINE account claims the real row; photo/name/number/course kept, her registration fills blanks
update caddy_profiles set
  user_id = 'U4e54f55dcb0f61563de10570f6772c63',
  languages = coalesce(languages, array['Thai','English','Korean']),
  experience_years = case when coalesce(experience_years,0) = 0 then 18 else experience_years end,
  updated_at = now()
 where id = 'a250ebcb-8688-4957-baa8-38d6b2d6aa4c';
-- 3. her desk PIN now logs into the same (LINE) account; retire the auto CADDY- shell
update caddy_pin_logins set user_id = 'U4e54f55dcb0f61563de10570f6772c63'
 where user_id = 'CADDY-a250ebcb86884957baa838d6b2d6aa4c';
delete from user_profiles where line_user_id = 'CADDY-a250ebcb86884957baa838d6b2d6aa4c' and role = 'caddie';
-- 4. her account: avatar = the uploaded roster photo (only if she has none), home club = the roster row's course
update user_profiles set
  home_course_name = 'Green Valley Rayong Country Club',
  profile_data = jsonb_set(jsonb_set(jsonb_set(profile_data,
      '{media}', coalesce(profile_data->'media','{}'::jsonb) ||
        case when coalesce(profile_data#>>'{media,profilePhoto}','') = ''
             then jsonb_build_object('profilePhoto', (select photo_url from caddy_profiles where id='a250ebcb-8688-4957-baa8-38d6b2d6aa4c'))
             else '{}'::jsonb end),
      '{roleSpecific,homeClub}', '"green_valley_rayong"'),
      '{roleSpecific,homeClubName}', '"Green Valley Rayong Country Club"')
 where line_user_id = 'U4e54f55dcb0f61563de10570f6772c63';
