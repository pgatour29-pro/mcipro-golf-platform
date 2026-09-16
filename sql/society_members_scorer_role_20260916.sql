-- 2026-09-16 — "scorer" membership role (v1217 Score Assistant)
-- A society member who is NOT an organizer but enters other players' paper cards from their
-- phone (Pete: "Bob is like an assistant"). society_members.role gains the value 'scorer';
-- the app shows such a member a PAPER CARDS tab inside Round History scoped to THAT society.
-- Nothing else in the app filters on role='member', so a scorer stays a member everywhere.
ALTER TABLE society_members DROP CONSTRAINT society_members_role_check;
ALTER TABLE society_members ADD CONSTRAINT society_members_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'organizer'::text, 'member'::text, 'scorer'::text]));

-- Bob Newman → TRGG scorer
UPDATE society_members SET role = 'scorer'
 WHERE golfer_id = 'U43e3109323dbc898f1357b5f6cc2078e'
   AND society_id = '7c0e4b72-d925-44bc-afda-38259a7ba346';
