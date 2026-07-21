-- 2026-07-21: make "3 Man Waltz" a selectable event FORMAT (organizer Registration / event setup,
-- golfer-mode create, and the Scoring leaderboard picker). society_events.format had a CHECK that
-- excluded 'waltz', so saving a Waltz-format event would 400. Add 'waltz' to the allowed set.
-- Applied to prod via `supabase db query --linked` on 2026-07-21.
-- (Waltz is also still auto-detected by event NAME; this just lets it be set explicitly.)

ALTER TABLE public.society_events DROP CONSTRAINT IF EXISTS society_events_format_check;
ALTER TABLE public.society_events ADD CONSTRAINT society_events_format_check
  CHECK (format = ANY (ARRAY['stroke_play','stableford','match_play','scramble','best_ball','waltz']));
