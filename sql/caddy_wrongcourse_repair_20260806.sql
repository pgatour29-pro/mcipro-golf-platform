-- Cross-course caddy contamination repair — 2026-08-06
-- Root cause: My Caddies "Book" sheet (openPickerForNotebook) called assignFromPicker
-- WITHOUT the caddy's course, so the v411 cross-course guard never fired. Pete's Green
-- Valley caddies (#177 Nim, #363) got written onto St Andrews 2000 registrations,
-- producing duplicate "same caddy, wrong course" cards in My Caddies History.
-- Code fix ships in the same session (guard now un-bypassable on all assign paths).

-- 1) Clear the contaminated caddy numbers from the three St Andrews regs.
--    Before-values (for recovery): 8f24a40a='177' (Jul 10), a3242cf8='363' (Jul 25),
--    0596aa7b='177' (Aug 4).
UPDATE event_registrations SET caddy_numbers = ''
 WHERE id IN ('8f24a40a-7231-4f96-8bdb-5fa17e006c25',
              'a3242cf8-60ae-4f5e-a087-057b38fc0285',
              '0596aa7b-4ae9-4e74-8aab-f9c35e9342f9')
   AND player_id = 'U2b6d976f19bca4b2f4374ae0e10ed873';

-- 2) Delete the ghost "pending" caddy_bookings the same mis-assigns created
--    (createCaddyBookingFromEvent side-writes; they resurface in history/pickers).
--    Rows: #177 St Andrews Jul 10, #363 St Andrews Jul 10, #363 St Andrews Jul 25.
DELETE FROM caddy_bookings
 WHERE id IN ('edcf2c50-7598-490c-a6ed-3ba49097407e',
              '3579c82a-2055-47f9-911e-44d7cb5262ac',
              'a93dd762-2350-44c3-9164-48d37b9fbd25')
   AND golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
   AND status = 'pending';

-- 3) Course-less "Ja #72" notebook row (Add form allowed empty course; created 2026-08-01).
--    Ja IS the Royal Lakeside #72: Dec 17 Royal Lakeside event reg + the v802 real
--    caddy_profiles row at Royal Lakeside. REPAIR the course, never delete the row.
UPDATE caddy_notebook SET course_name = 'Royal Lakeside'
 WHERE golfer_id = 'U2b6d976f19bca4b2f4374ae0e10ed873'
   AND caddy_number = '72'
   AND (course_name IS NULL OR course_name = '');
