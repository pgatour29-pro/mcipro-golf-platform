-- 2026-08-25 (v993): staff must be able to register + log in with LINE.
-- The old CHECK only allowed golfer/caddy/organizer/admin/golf_course_manager/guest,
-- while the client writes 'caddie' (and manager/proshop/maintenance for other staff) —
-- so ANY staff registration was rejected by the DB. Widen the list to the union of
-- both vocabularies. Purely additive: existing rows (golfer/organizer only) untouched.
ALTER TABLE user_profiles DROP CONSTRAINT user_profiles_role_check;
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (
  role = ANY (ARRAY[
    'golfer','guest','organizer','society_organizer','admin',
    'caddy','caddie','caddymaster',
    'manager','golf_course_manager','proshop','maintenance','restaurant'
  ]::text[])
);
