-- =============================================================================
-- MIGRATE EXISTING ROUNDS TABLE TO CANONICAL SCHEMA (NON-DESTRUCTIVE)
-- -----------------------------------------------------------------------------
-- Goal: Ensure columns expected by canonical client and hardened RLS exist.
-- - Adds missing columns if they don't exist and backfills from legacy fields.
-- - Safe to run multiple times.
-- =============================================================================

BEGIN;

-- Add canonical identity/fields if missing
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS golfer_id TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS course_name TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS society_event_id UUID;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS total_gross INTEGER;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS total_net INTEGER;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS total_stableford INTEGER;
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS handicap_used DECIMAL(4,1);
ALTER TABLE public.rounds ADD COLUMN IF NOT EXISTS tee_marker TEXT;

-- Backfill from legacy columns where possible
UPDATE public.rounds
SET golfer_id = COALESCE(golfer_id, user_id::text)
WHERE golfer_id IS NULL AND user_id IS NOT NULL;

UPDATE public.rounds
SET completed_at = COALESCE(completed_at, played_at)
WHERE completed_at IS NULL AND played_at IS NOT NULL;

UPDATE public.rounds
SET total_gross = COALESCE(total_gross, total_score)
WHERE total_gross IS NULL AND total_score IS NOT NULL;

UPDATE public.rounds
SET tee_marker = COALESCE(tee_marker, tee_used)
WHERE tee_marker IS NULL AND tee_used IS NOT NULL;

-- Status default
UPDATE public.rounds
SET status = COALESCE(status, CASE WHEN is_tournament IS NOT NULL THEN 'completed' ELSE 'completed' END)
WHERE status IS NULL;

COMMIT;

-- Verify important columns exist now
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rounds'
  AND column_name IN ('golfer_id','completed_at','total_gross','tee_marker');

