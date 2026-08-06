-- Pumz #183 is a PLUTALUANG caddy (Pete, 2026-08-06) — her notebook row and the v802-synced
-- roster row were saved with course "Bangpra International" (wrong). Repair, don't delete.
-- Before-values: caddy_notebook 26d13664 course_name='Bangpra International';
--                caddy_profiles d38a45fd course_id='bangpra',
--                course_name='Bangpra International Golf Club'.
-- Canonical Plutaluang strings taken from Numin #395's rows (notebook 'Plutaluang',
-- roster course_id 'plutaluang' / 'Plutaluang Royal Thai Navy Golf Course').
-- Order matters: roster first, so the notebook UPDATE's sync trigger (keyed
-- number + resolved course_id) matches this row instead of creating a second one.

UPDATE caddy_profiles
   SET course_id = 'plutaluang',
       course_name = 'Plutaluang Royal Thai Navy Golf Course'
 WHERE id = 'd38a45fd-95e6-4ab9-8a7f-491f72fd9f6e'
   AND caddy_number = '183' AND user_id IS NULL;

UPDATE caddy_notebook
   SET course_name = 'Plutaluang'
 WHERE id = '26d13664-318a-4fa3-941e-3dd2ffa5438e'
   AND golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- NOT touched: the blank "#183 · Pattaya CC" notebook row (25cf710d) and its roster
-- placeholder (f90f28d9) — they trace to the real 2026-05-23 Pattaya CC event
-- registration with caddy 183: a different physical caddy, same number.
