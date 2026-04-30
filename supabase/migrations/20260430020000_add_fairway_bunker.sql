-- Add fairway bunker tracking to round_holes
alter table public.round_holes add column if not exists fairway_bunker boolean default null;
