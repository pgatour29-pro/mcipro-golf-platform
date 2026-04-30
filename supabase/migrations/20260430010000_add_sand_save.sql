-- Add greenside bunker and sand save tracking to round_holes
alter table public.round_holes add column if not exists greenside_bunker boolean default null;
alter table public.round_holes add column if not exists sand_save boolean default null;
