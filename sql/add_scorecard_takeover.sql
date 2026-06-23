-- Mid-round takeover: track who currently controls (self-scores) a scorecard.
-- NULL = no one has taken over (host/creator controls it, default behaviour).
alter table public.scorecards
  add column if not exists controlled_by text,
  add column if not exists control_taken_at timestamptz;
