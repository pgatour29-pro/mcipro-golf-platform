-- Enable Supabase realtime (postgres_changes) on the scorecards table.
-- Powers INSTANT updates on Spectate Live (public/live.html): the scorecards
-- row is UPDATEd on every hole via updateScorecardTotals(), so spectators get
-- a push the moment a score is tapped instead of waiting up to 30s for the poll.
-- Applied to project pyeeplwsnupmhgbguwqs on 2026-06-23. Additive + idempotent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'scorecards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scorecards;
  END IF;
END $$;
