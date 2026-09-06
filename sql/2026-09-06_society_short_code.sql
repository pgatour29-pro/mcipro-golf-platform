-- =====================================================
-- Society SHORT CODE (v1119)
-- A 2-4 character code the ORGANIZER sets on their own society profile.
-- It labels the society everywhere space is tight — first use is the
-- "This week" society filter chips on the golfer's desktop overview,
-- which has to stay readable with 10+ societies on the platform.
--
-- Why a real column instead of deriving initials: g3-desk.js `shortSoc()`
-- only knew TRGG and JOA by name and fell back to auto-initials for
-- everything else, which collides as soon as two societies share them
-- ("Pattaya Golf Society" and "Phuket Golf Society" both -> PGS).
-- Pete, 2026-09-06: "Use the 4 character from the organizers."
-- =====================================================

ALTER TABLE public.society_profiles
    ADD COLUMN IF NOT EXISTS short_code TEXT;

-- 2-4 chars, letters and digits only. NULL stays legal (falls back to initials).
ALTER TABLE public.society_profiles
    DROP CONSTRAINT IF EXISTS society_profiles_short_code_fmt;
ALTER TABLE public.society_profiles
    ADD CONSTRAINT society_profiles_short_code_fmt
    CHECK (short_code IS NULL OR short_code ~ '^[A-Z0-9]{2,4}$');

-- One society per code — the whole point is that a chip is unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS idx_society_profiles_short_code
    ON public.society_profiles (short_code)
    WHERE short_code IS NOT NULL;

COMMENT ON COLUMN public.society_profiles.short_code IS
    'Organizer-set 2-4 char society code (A-Z0-9, unique). Used wherever the full society name will not fit — filter chips, tight table columns.';

-- Seed the two the code already hardcoded in g3-desk.js shortSoc(), so nothing
-- regresses on deploy. Only fills blanks; never overwrites an organizer choice.
UPDATE public.society_profiles SET short_code = 'TRGG'
    WHERE short_code IS NULL AND society_name ILIKE 'Travellers Rest%'
      AND NOT EXISTS (SELECT 1 FROM public.society_profiles p2 WHERE p2.short_code = 'TRGG');

UPDATE public.society_profiles SET short_code = 'JOA'
    WHERE short_code IS NULL AND society_name ILIKE 'JOA%'
      AND NOT EXISTS (SELECT 1 FROM public.society_profiles p2 WHERE p2.short_code = 'JOA');

UPDATE public.society_profiles SET short_code = 'JGTS'
    WHERE short_code IS NULL AND (society_name ILIKE 'JGTS%' OR society_name ILIKE 'Jomtien%')
      AND NOT EXISTS (SELECT 1 FROM public.society_profiles p2 WHERE p2.short_code = 'JGTS');
