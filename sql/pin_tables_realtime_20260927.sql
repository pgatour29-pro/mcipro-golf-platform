-- v1392 (2026-09-27): the Maintenance crew's pin moves reach golfers' PIN pills live
-- (PinSheetManager._subscribeLive) and keep two crew phones in step (MaintPins._subscribe).
-- Additive: only publishes row changes of two small, low-write tables.
ALTER PUBLICATION supabase_realtime ADD TABLE public.pin_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pin_locations;
