-- =====================================================================
-- King of the Mountain — Hua Hin 2026 — multi-round Order-of-Merit setup
-- Mirrors sql/chiang_mai_classic_setup.sql (event_series table + RLS
-- already exist from that run, so this is just rounds + series record).
--   1) 5 round events in society_events (notification-safe: trigger disabled)
--   2) the series record linking the 5 rounds
-- Idempotent: guarded on event_series.id = 'king_of_the_mountain_2026'.
-- Points ladder = F1-style, matching the CM Classic's current live ladder.
-- Courses are NOT yet in courses/course_holes — scorecard profiles for the
-- four Hua Hin venues must be added before live scoring in September.
-- =====================================================================

BEGIN;

ALTER TABLE public.society_events DISABLE TRIGGER trigger_new_event_notification;

WITH guard AS (
    SELECT NOT EXISTS (SELECT 1 FROM public.event_series WHERE id = 'king_of_the_mountain_2026') AS go
),
new_events AS (
    INSERT INTO public.society_events
        (title, event_date, start_time, format, status, course_name,
         entry_fee, member_fee, non_member_fee, is_private, counts_for_season,
         creator_type, organizer_name, description, point_allocation, divisions)
    SELECT
        v.title, v.event_date::date, v.start_time::time, 'stableford', 'published', v.course_name,
        0, 0, 0, false, false,
        'organizer', 'Bill & Derek (Par & Away)', v.descr,
        '{"1":25,"2":18,"3":15,"4":12,"5":10,"6":8,"7":6,"8":4,"9":2,"10":1}'::jsonb,
        '[]'::jsonb
    FROM (VALUES
        ('TRGG - King of the Mountain 2026 — R1 Black Mountain', '2026-09-14', '10:24',
            'Black Mountain Golf Club (Hua Hin)',
            'Round 1 of 5 — King of the Mountain Order of Merit. Presentation at TRGG Hua Hin from 1900.'),
        ('TRGG - King of the Mountain 2026 — R2 Palm Hills', '2026-09-15', '11:36',
            'Palm Hills Golf Resort & Country Club (Hua Hin)',
            'Round 2 of 5 — King of the Mountain Order of Merit. Presentation at Surf & Sand from 1900.'),
        ('TRGG - King of the Mountain 2026 — R3 Springfield', '2026-09-17', '09:46',
            'Springfield Royal Country Club (Hua Hin)',
            'Round 3 of 5 — King of the Mountain Order of Merit. Presentation at Billabong directly after golf.'),
        ('TRGG - King of the Mountain 2026 — R4 Pineapple Valley', '2026-09-18', '07:40',
            'Pineapple Valley Golf Club (Hua Hin)',
            'Round 4 of 5 — King of the Mountain Order of Merit. Presentation at Cheers Restaurant from 1800.'),
        ('TRGG - King of the Mountain 2026 — R5 Black Mountain', '2026-09-20', '10:00',
            'Black Mountain Golf Club (Hua Hin)',
            'Round 5 of 5 — King of the Mountain Order of Merit. Gala dinner & presentation at Prime Steakhouse from 1900.')
    ) AS v(title, event_date, start_time, course_name, descr)
    CROSS JOIN guard
    WHERE guard.go
    RETURNING id, event_date
)
INSERT INTO public.event_series
    (id, name, subtitle, society, title_prefix, round_event_ids,
     point_allocation, config, organizers, status, created_by)
SELECT
    'king_of_the_mountain_2026',
    'King of the Mountain',
    'Hua Hin · 13 – 20 Sep 2026',
    'TRGG',
    'TRGG - King of the Mountain 2026',
    (SELECT jsonb_agg(id ORDER BY event_date) FROM new_events),
    '{"1":25,"2":18,"3":15,"4":12,"5":10,"6":8,"7":6,"8":4,"9":2,"10":1}'::jsonb,
    jsonb_build_object(
        'dates', '13 - 20 Sep 2026',
        'location', 'Hua Hin, Thailand',
        'prizePool', 120000,
        'currency', 'THB',
        'package', jsonb_build_array(
            jsonb_build_object('label','Per person — nil accommodation','price',23600),
            jsonb_build_object('label','+ 8 nights @ Baan Nilrath','price',11600),
            jsonb_build_object('label','+ 8 nights @ Smile Resort','price',8800)
        ),
        'includes', jsonb_build_array(
            'Welcome function at Prime Steakhouse',
            'Meals at all presentations',
            'Gala dinner & presentation at Prime Steakhouse'
        ),
        'schedule', jsonb_build_array(
            jsonb_build_object('date','2026-09-13','label','Welcome Function','detail','Prime Steakhouse, from 1800 hours','type','function'),
            jsonb_build_object('date','2026-09-14','label','Round 1','detail','Black Mountain Golf Club · first tee 10:24','type','round'),
            jsonb_build_object('date','2026-09-15','label','Round 2','detail','Palm Hills Golf Resort & Country Club · first tee 11:36','type','round'),
            jsonb_build_object('date','2026-09-16','label','Rest Day','detail','','type','rest'),
            jsonb_build_object('date','2026-09-17','label','Round 3','detail','Springfield Royal Country Club · first tee 09:46','type','round'),
            jsonb_build_object('date','2026-09-18','label','Round 4','detail','Pineapple Valley Golf Club · first tee 07:40','type','round'),
            jsonb_build_object('date','2026-09-19','label','Rest Day','detail','','type','rest'),
            jsonb_build_object('date','2026-09-20','label','Round 5','detail','Black Mountain Golf Club · first tee 10:00','type','round'),
            jsonb_build_object('date','2026-09-20','label','Gala Dinner & Presentation','detail','Prime Steakhouse, from 1900 hours','type','function')
        ),
        'scoring', 'Stableford each round; Order of Merit points awarded by finishing position. Running total over 5 rounds; most points wins.',
        'tiebreak', 'Ties broken by best single-round points, then countback',
        'website', 'www.parandaway.com'
    ),
    jsonb_build_array(
        jsonb_build_object('name','Bill','phone','061 594 9699'),
        jsonb_build_object('name','Derek','phone','080 673 3118','email','info@parandaway.com')
    ),
    'active',
    'system-setup'
WHERE EXISTS (SELECT 1 FROM new_events);

ALTER TABLE public.society_events ENABLE TRIGGER trigger_new_event_notification;

COMMIT;

-- ---------- verify ----------
SELECT s.id AS series, s.name, s.round_event_ids,
       (SELECT count(*) FROM public.society_events e
        WHERE e.id::text IN (SELECT jsonb_array_elements_text(s.round_event_ids))) AS linked_events
FROM public.event_series s
WHERE s.id = 'king_of_the_mountain_2026';
