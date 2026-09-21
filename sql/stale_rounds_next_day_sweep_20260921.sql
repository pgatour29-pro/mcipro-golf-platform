-- ===========================================================================================
-- 2026-09-21 — A ROUND BELONGS TO ONE CALENDAR DAY (Pete's rule)
--
--   "A round can be started, and if it is the next calendar day it's finished."
--
-- Until now the ONLY thing that retired a live card was the golfer re-opening the app on the
-- phone that started it (LiveScorecard.loadRoundState's 24h purge). If that never happened the
-- card sat in_progress for ever, holding the organizer board, Spectate Live and the event as
-- "live" — Paul Robertson, twice in five days (2026-09-17 Phoenix, 2026-09-21 Pattaya cc).
-- This moves the rule to the DB, where it fires whether or not anyone opens anything.
--
-- The day is Asia/Bangkok, not UTC (Postgres `current_date` is UTC and would retire Thai
-- afternoon rounds at 07:00 local). scorecards.started_at / scores.created_at are NAIVE UTC.
-- A card is only stale once BOTH its start and its last score are on an earlier Bangkok day,
-- so a round still being scored is never touched.
--
-- What "finished" means per card — exactly what the app's own FINISH/END buttons do:
--   * full round (every hole on the card scored), individual format -> COMPLETE it: write the
--     rounds row + round_holes from the score rows and mark the card completed. The rounds
--     INSERT fires the normal triggers (adopt_event, played_date, the handicap engine, buddy
--     stats) — the same path FINISH takes. Totals are SUMS of the stored per-hole values; no
--     score is recomputed or invented.
--   * anything less than a full round -> ABANDONED. The app already refuses to save these:
--     "Incomplete rounds are NOT saved to history and will NOT affect handicaps."
--   * full round but a TEAM format (scramble/waltz/…) -> card marked completed, NO rounds row.
--     Team scoring is not a per-player sum of hole points, so the sweep must not fabricate one;
--     the card stays on the event/results boards and is reported for a human to post properly.
--     (Team rounds never feed handicaps anyway — public.is_team_round.)
-- Duplicate guard: never writes a second rounds row for a golfer who already has one that
-- Bangkok day (the same golfer + played-day predicate saveRoundToHistory uses).
-- ===========================================================================================

CREATE OR REPLACE FUNCTION public.sweep_stale_scorecards(p_dry_run boolean DEFAULT false)
RETURNS TABLE (
  o_card_id  uuid,
  o_player   text,
  o_course   text,
  o_day_bkk  date,
  o_holes    int,
  o_action   text,
  o_round_id uuid
)
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
          FROM scores s WHERE s.scorecard_id = sc.id
      ) agg ON true
     WHERE sc.status = 'in_progress'
       AND ((GREATEST(sc.started_at, COALESCE(agg.last_at, sc.started_at))
             AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date) < v_today
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
        UPDATE scorecards SET status = 'abandoned', updated_at = (now() AT TIME ZONE 'UTC')
         WHERE id = c.id AND status = 'in_progress';
      END IF;

    ELSIF public.is_team_round(v_formats, NULL::int, NULL::jsonb, NULL::jsonb, v_event) THEN
      -- Full team round: close the card, but do NOT invent a per-player rounds row.
      v_action := 'completed_card_only_team_round';
      IF NOT p_dry_run THEN
        UPDATE scorecards SET status = 'completed', completed_at = c.last_at,
                              updated_at = (now() AT TIME ZONE 'UTC')
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
                              updated_at = (now() AT TIME ZONE 'UTC')
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
                              updated_at = (now() AT TIME ZONE 'UTC')
         WHERE id = c.id AND status = 'in_progress';
      END IF;
    END IF;

    o_card_id := c.id; o_player := c.player_name; o_course := c.course_name;
    o_day_bkk := v_day; o_holes := c.holes; o_action := v_action; o_round_id := v_round;
    RETURN NEXT;
  END LOOP;
END
$fn$;

-- Server-side only: the anon/browser key must never be able to retire someone's live round.
REVOKE ALL ON FUNCTION public.sweep_stale_scorecards(boolean) FROM PUBLIC, anon, authenticated;

-- Hourly, so a card is gone within an hour of the Bangkok day rolling over (and a cron outage
-- self-heals on the next tick instead of waiting a day).
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sweep_stale_scorecards';
SELECT cron.schedule('sweep_stale_scorecards', '11 * * * *', $c$SELECT public.sweep_stale_scorecards()$c$);
