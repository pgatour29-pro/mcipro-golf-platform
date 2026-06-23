-- 2-man scramble 4-ball tee groups + the pairing format were never persisted (savePairings dropped
-- fourBallGroups; no column existed) so they evaporated on reload. Add nullable columns.
alter table public.event_pairings
  add column if not exists four_ball_groups jsonb,
  add column if not exists format text;
