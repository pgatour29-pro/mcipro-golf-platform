-- ===========================================================================================
-- 2026-10-03 — A LIVE ROUND WITH 2 HOURS OF NO ACTIVITY IS CLOSED (Pete)
--
--   "after 2 hours of inactivity close any live rounds so that it is not showing as a round in
--    progress, but as a failsafe if activity comes back before the 2 hour threshold then leave
--    and start the clock over again"
--
-- Trigger case: Carl Barklund, Treasure Hill, started 11:13 Thai, 0 scores, still "in progress"
-- on Spectate Live 9 hours later (the v1306 sweep only retired cards once the Bangkok day rolled).
--
-- Activity = the LATEST of: card start, any write to the card (updated_at), any score entered
-- (scores.created_at), any score edited (scores.updated_at). Every new score moves it, so the
-- 2-hour clock restarts on its own. What a closed card becomes is unchanged from v1306
-- (full individual round -> posted to history; incomplete -> abandoned; full team -> closed).
--
-- Failsafe AFTER the cut-off: paper-card golfers often key all 18 holes in at the end, long after
-- the 2 hours. A card the SWEEP closed carries auto_closed_at; a score landing on it while it is
-- 'abandoned' puts it straight back to in_progress (trg_scores_revive_idle_card). Cards a person
-- ended (END/discard) have no auto_closed_at and are never revived.
--
-- Sweep runs every 5 min (was hourly) so a card goes within ~2h05m of its last activity.
-- Body below = LIVE prosrc of 2026-10-03 (identical to sql/stale_rounds_next_day_sweep_20260921.sql)
-- with only the WHERE, the last_edit aggregate and the auto_closed_at stamps changed.
-- ===========================================================================================

ALTER TABLE public.scorecards ADD COLUMN IF NOT EXISTS auto_closed_at timestamp without time zone;

CREATE OR REPLACE FUNCTION public.sweep_stale_scorecards(p_dry_run boolean DEFAULT false)
 RETURNS TABLE(o_card_id uuid, o_player text, o_course text, o_day_bkk date, o_holes integer, o_action text, o_round_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $fn$
DECLARE
  v_today   date := (now() AT TIME ZONE 'Asia/Bangkok')::date;
  c         record;
  v_formats jsonb;
  v_day     date;
  v_event   uuid;
  v_need    int;
  v_round   uuid;
  v_action  text;
BEGIN
  FOR c IN
    SELECT sc.id, sc.player_id, sc.player_name, sc.event_id, sc.course_id, sc.course_name,
           sc.tee_marker, sc.handicap, sc.playing_handicap, sc.scoring_format, sc.started_at,
           COALESCE(NULLIF(jsonb_array_length(
             CASE WHEN jsonb_typeof(sc.course_holes) = 'array' THEN sc.course_holes ELSE '[]'::jsonb END), 0), 18) AS need,
           COALESCE(agg.holes, 0) AS holes, agg.gross, agg.net, agg.pts, agg.ninth_at, agg.last_at
      FROM scorecards sc
      LEFT JOIN LATERAL (
        SELECT count(*)::int                    AS holes,
               sum(s.gross_score)::int          AS gross,
               sum(s.net_score)::int            AS net,
               sum(s.stableford_points)::int    AS pts,
               -- the 9th hole PLAYED, by time — hole_number = 9 is wrong off a back-nine start
               (array_agg(s.created_at ORDER BY s.created_at))[9] AS ninth_at,
               max(s.created_at)                AS last_at
             , max(s.updated_at)                AS last_edit
          FROM scores s WHERE s.scorecard_id = sc.id
      ) agg ON true
     WHERE sc.status = 'in_progress'
       AND (
         -- 2 hours with no activity at all: no new score, no edited score, no write to the card
         GREATEST(sc.started_at, COALESCE(sc.updated_at, sc.started_at),
                  COALESCE(agg.last_at, sc.started_at), COALESCE(agg.last_edit, sc.started_at))
           < (now() AT TIME ZONE 'UTC') - interval '2 hours'
         -- v1306 day rule stays as the backstop
         OR ((GREATEST(sc.started_at, COALESCE(agg.last_at, sc.started_at))
              AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date) < v_today
       )
     ORDER BY sc.started_at
  LOOP
    v_round  := NULL;
    v_need   := c.need;
    v_day    := (c.started_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date;
    -- scorecards.event_id is TEXT and 22 legacy cards hold non-uuid junk — cast only a real uuid
    v_event  := CASE WHEN c.event_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
                     THEN c.event_id::uuid ELSE NULL END;
    v_formats := CASE
                   WHEN c.scoring_format IS NULL OR btrim(c.scoring_format) = '' THEN '["stableford"]'::jsonb
                   WHEN left(btrim(c.scoring_format), 1) = '[' THEN c.scoring_format::jsonb
                   ELSE jsonb_build_array(c.scoring_format)
                 END;

    IF c.holes < v_need THEN
      -- Incomplete: the app never saves these either.
      v_action := 'abandoned';
      IF NOT p_dry_run THEN
        UPDATE scorecards SET status = 'abandoned', updated_at = (now() AT TIME ZONE 'UTC'), auto_closed_at = (now() AT TIME ZONE 'UTC')
         WHERE id = c.id AND status = 'in_progress';
      END IF;

    ELSIF public.is_team_round(v_formats, NULL::int, NULL::jsonb, NULL::jsonb, v_event) THEN
      -- Full team round: close the card, but do NOT invent a per-player rounds row.
      v_action := 'completed_card_only_team_round';
      IF NOT p_dry_run THEN
        UPDATE scorecards SET status = 'completed', completed_at = c.last_at,
                              updated_at = (now() AT TIME ZONE 'UTC'), auto_closed_at = (now() AT TIME ZONE 'UTC')
         WHERE id = c.id AND status = 'in_progress';
      END IF;

    ELSIF EXISTS (
      SELECT 1 FROM rounds r
       WHERE r.golfer_id = c.player_id
         AND (r.played_at AT TIME ZONE 'Asia/Bangkok')::date = v_day
    ) THEN
      -- Already in history for that day — close the card, never double-post.
      v_action := 'completed_card_only_round_exists';
      IF NOT p_dry_run THEN
        UPDATE scorecards SET status = 'completed', completed_at = c.last_at,
                              updated_at = (now() AT TIME ZONE 'UTC'), auto_closed_at = (now() AT TIME ZONE 'UTC')
         WHERE id = c.id AND status = 'in_progress';
      END IF;

    ELSE
      -- Full individual round that never got its FINISH tap: post it, exactly as FINISH would.
      v_action := 'completed';
      IF NOT p_dry_run THEN
        INSERT INTO rounds (
          golfer_id, course_id, course_name, type, society_event_id, primary_society_id, organizer_id,
          played_at, started_at, completed_at, status, total_gross, total_net, total_stableford,
          handicap_used, tee_marker, course_rating, slope_rating, holes_played, scoring_formats,
          player_name, front9_seconds, back9_seconds, total_seconds, game_config, format_scores)
        VALUES (
          c.player_id, c.course_id, c.course_name,
          CASE WHEN v_event IS NOT NULL THEN 'society' ELSE 'practice' END,
          v_event,
          (SELECT e.society_id FROM society_events e WHERE e.id = v_event),
          NULL,
          c.started_at AT TIME ZONE 'UTC', c.started_at AT TIME ZONE 'UTC', c.last_at AT TIME ZONE 'UTC',
          'completed', c.gross, c.net, c.pts,
          COALESCE(c.playing_handicap::numeric, c.handicap),
          COALESCE(NULLIF(c.tee_marker, ''), 'white'),
          72, 113,                      -- the same defaults saveRoundToHistory posts when the
                                        -- course table carries no rating/slope
          c.holes, v_formats, c.player_name,
          round(extract(epoch FROM (c.ninth_at - c.started_at)))::int,
          round(extract(epoch FROM (c.last_at  - c.ninth_at)))::int,
          round(extract(epoch FROM (c.last_at  - c.started_at)))::int,
          jsonb_build_object('formats', v_formats, 'points', '{}'::jsonb, 'scramble', NULL),
          CASE WHEN v_formats ? 'stableford' THEN jsonb_build_object('stableford', c.pts) ELSE '{}'::jsonb END
        )
        RETURNING id INTO v_round;

        INSERT INTO round_holes (round_id, hole_number, par, stroke_index, gross_score, net_score,
                                 stableford_points, handicap_strokes)
        SELECT v_round, s.hole_number, s.par, s.stroke_index, s.gross_score, s.net_score,
               s.stableford_points, s.handicap_strokes
          FROM scores s WHERE s.scorecard_id = c.id;

        UPDATE scorecards SET status = 'completed', completed_at = c.last_at,
                              updated_at = (now() AT TIME ZONE 'UTC'), auto_closed_at = (now() AT TIME ZONE 'UTC')
         WHERE id = c.id AND status = 'in_progress';
      END IF;
    END IF;

    o_card_id := c.id; o_player := c.player_name; o_course := c.course_name;
    o_day_bkk := v_day; o_holes := c.holes; o_action := v_action; o_round_id := v_round;
    RETURN NEXT;
  END LOOP;
END
$fn$
;
REVOKE ALL ON FUNCTION public.sweep_stale_scorecards(boolean) FROM PUBLIC, anon, authenticated;

-- A score arriving on a card the sweep closed (as incomplete) reopens it: the golfer is still playing.
CREATE OR REPLACE FUNCTION public.trg_scores_revive_idle_card()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  UPDATE scorecards
     SET status = 'in_progress', auto_closed_at = NULL, updated_at = (now() AT TIME ZONE 'UTC')
   WHERE id = NEW.scorecard_id
     AND status = 'abandoned'
     AND auto_closed_at IS NOT NULL;
  RETURN NEW;
END
$fn$;
REVOKE ALL ON FUNCTION public.trg_scores_revive_idle_card() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS scores_revive_idle_card ON public.scores;
CREATE TRIGGER scores_revive_idle_card
  AFTER INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.trg_scores_revive_idle_card();

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sweep_stale_scorecards';
SELECT cron.schedule('sweep_stale_scorecards', '*/5 * * * *', $c$SELECT public.sweep_stale_scorecards()$c$);
