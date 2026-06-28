-- =====================================================================
-- Chiang Mai Classic 2026 — multi-round Order-of-Merit special event setup
--   1) event_series table (reusable multi-round series model) + RLS
--   2) 4 round events in society_events (notification-safe: trigger disabled)
--   3) the series record linking the 4 rounds
-- Idempotent: re-running does nothing if the series already exists
-- (guarded on event_series.id) so live registrations/scores are never nuked.
-- =====================================================================

-- ---------- 1) event_series table ----------
CREATE TABLE IF NOT EXISTS public.event_series (
    id               text PRIMARY KEY,
    name             text NOT NULL,
    subtitle         text,
    society          text,
    title_prefix     text,                       -- matches the rounds' society_events.title
    round_event_ids  jsonb NOT NULL DEFAULT '[]'::jsonb,  -- ordered society_events.id list
    point_allocation jsonb NOT NULL DEFAULT '{}'::jsonb,  -- position -> points (shared ladder)
    config           jsonb NOT NULL DEFAULT '{}'::jsonb,  -- banner/schedule/prizes/contacts
    organizers       jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{name, phone, email}]
    status           text DEFAULT 'active',
    created_by       text,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.event_series ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_series' AND policyname='event_series_read') THEN
        CREATE POLICY event_series_read ON public.event_series FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_series' AND policyname='event_series_insert') THEN
        CREATE POLICY event_series_insert ON public.event_series FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='event_series' AND policyname='event_series_update') THEN
        CREATE POLICY event_series_update ON public.event_series FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END$$;

GRANT SELECT, INSERT, UPDATE ON public.event_series TO anon, authenticated;

-- ---------- 2 + 3) rounds + series record (notification-safe, guarded) ----------
BEGIN;

ALTER TABLE public.society_events DISABLE TRIGGER trigger_new_event_notification;

WITH guard AS (
    SELECT NOT EXISTS (SELECT 1 FROM public.event_series WHERE id = 'chiang_mai_classic_2026') AS go
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
        '{"1":100,"2":90,"3":80,"4":72,"5":66,"6":60,"7":55,"8":50,"9":46,"10":42,"11":38,"12":34,"13":30,"14":26,"15":22,"16":18,"17":14,"18":10,"19":6,"20":3}'::jsonb,
        '[]'::jsonb
    FROM (VALUES
        ('TRGG - Chiang Mai Classic 2026 — R1 Summit Green Valley', '2026-06-29', '09:00',
            'Summit Green Valley CC (Chiang Mai)', 'Round 1 of 4 — Chiang Mai Classic Order of Merit.'),
        ('TRGG - Chiang Mai Classic 2026 — R2 North Hill', '2026-06-30', '09:00',
            'North Hill Golf Club (Chiang Mai)', 'Round 2 of 4 — Chiang Mai Classic Order of Merit.'),
        ('TRGG - Chiang Mai Classic 2026 — R3 Highlands', '2026-07-02', '09:00',
            'Highlands Golf & Spa Resort (Chiang Mai)', 'Round 3 of 4 — Chiang Mai Classic Order of Merit.'),
        ('TRGG - Chiang Mai Classic 2026 — R4 Alpine', '2026-07-03', '09:00',
            'Alpine Golf Club & Resort (Chiang Mai)', 'Round 4 of 4 — Chiang Mai Classic Order of Merit. Gala dinner & presentation to follow.')
    ) AS v(title, event_date, start_time, course_name, descr)
    CROSS JOIN guard
    WHERE guard.go
    RETURNING id, event_date
)
INSERT INTO public.event_series
    (id, name, subtitle, society, title_prefix, round_event_ids,
     point_allocation, config, organizers, status, created_by)
SELECT
    'chiang_mai_classic_2026',
    'Chiang Mai Classic',
    'Chiang Mai · 28 Jun – 3 Jul 2026',
    'TRGG',
    'TRGG - Chiang Mai Classic 2026',
    (SELECT jsonb_agg(id ORDER BY event_date) FROM new_events),
    '{"1":100,"2":90,"3":80,"4":72,"5":66,"6":60,"7":55,"8":50,"9":46,"10":42,"11":38,"12":34,"13":30,"14":26,"15":22,"16":18,"17":14,"18":10,"19":6,"20":3}'::jsonb,
    jsonb_build_object(
        'dates', '28 Jun - 3 Jul 2026',
        'location', 'Chiang Mai, Thailand',
        'prizePool', 120000,
        'currency', 'THB',
        'package', jsonb_build_array(
            jsonb_build_object('label','Per person','price',23500),
            jsonb_build_object('label','Incl. 6 nights @ Sleep Mai Thapae','price',31600)
        ),
        'includes', jsonb_build_array(
            'Four rounds: green fee, cart, caddie',
            'Hole-in-one prizes',
            'Food at welcome function & daily presentations',
            '3-course gala dinner at final presentation'
        ),
        'schedule', jsonb_build_array(
            jsonb_build_object('date','2026-06-28','label','Welcome Function','detail','from 1800 hours','type','function'),
            jsonb_build_object('date','2026-06-29','label','Round 1','detail','Summit Green Valley Country Club','type','round'),
            jsonb_build_object('date','2026-06-30','label','Round 2','detail','North Hill Golf Club','type','round'),
            jsonb_build_object('date','2026-07-01','label','Rest Day','detail','','type','rest'),
            jsonb_build_object('date','2026-07-02','label','Round 3','detail','Highlands Golf & Spa Resort','type','round'),
            jsonb_build_object('date','2026-07-03','label','Round 4','detail','Alpine Golf Club & Resort','type','round'),
            jsonb_build_object('date','2026-07-03','label','Gala Dinner & Presentation','detail','Le Crystal French Restaurant','type','function')
        ),
        'scoring', 'Stableford each round; Order of Merit points awarded by finishing position. Running total over 4 rounds; most points wins.',
        'tiebreak', 'Ties broken by best single-round points, then countback',
        'website', 'www.parandaway.com'
    ),
    jsonb_build_array(
        jsonb_build_object('name','Bill','phone','061 594 9699'),
        jsonb_build_object('name','Derek','phone','080 673 3118','email','derek@veejays.com.au')
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
WHERE s.id = 'chiang_mai_classic_2026';
