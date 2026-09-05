-- v1118 — scorecards.starting_nine: which tee the round STARTED from.
--   'front' = holes 1-9 played first (normal), 'back' = holes 10-18 first (2-way / shotgun start).
--
-- WHY: the starter at the course can send a group off the 10th AFTER the scorecard is already
-- open, so the live scoring screen carries a "START 1st | 10th" switch (legal only before the
-- first tee shot). Whoever flips it writes this column on every card in the group; the other
-- devices already watch scorecards UPDATE by group_id, so they re-order with it.
--
-- Before this column a device joining a live round had to GUESS the order from which holes
-- already had scores — a guess that is only exact once someone has scored, and never right at
-- the start, which is exactly when a tee change happens.
--
-- Additive + nullable: NULL means "written before this existed" and the reader falls back to
-- the old scored-holes heuristic.
alter table public.scorecards add column if not exists starting_nine text;
comment on column public.scorecards.starting_nine is
  'Tee the round started from: front = holes 1-9 first, back = holes 10-18 first (2-way/shotgun). NULL = unknown (pre-v1118 cards).';
