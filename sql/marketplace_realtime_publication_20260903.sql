-- v1078 (2026-09-03): 19th Hole badges subscribe to listing inserts + offer changes.
-- Adds the two marketplace tables to the realtime publication (same as rounds in v947).
-- RLS SELECT on both tables is `true`, so every logged-in golfer receives the events.
-- Reversible: ALTER PUBLICATION supabase_realtime DROP TABLE public.marketplace_listings, public.marketplace_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_listings, public.marketplace_offers;
