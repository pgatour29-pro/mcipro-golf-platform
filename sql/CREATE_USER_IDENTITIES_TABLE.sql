-- =====================================================
-- CREATE user_identities MAPPING TABLE
-- =====================================================
-- Maps LINE user IDs to Supabase auth.users UUIDs
-- This allows the Edge Function to convert LINE OAuth
-- tokens to internal user IDs for registration

CREATE TABLE IF NOT EXISTS public.user_identities (
  line_user_id TEXT PRIMARY KEY,
  user_uuid UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for reverse lookups
CREATE INDEX IF NOT EXISTS user_identities_user_uuid_idx
  ON public.user_identities(user_uuid);

-- RLS: Service role only (Edge Function uses service role)
ALTER TABLE public.user_identities ENABLE ROW LEVEL SECURITY;

-- Verify table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_identities'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ user_identities table created successfully';
    RAISE NOTICE 'Next step: Seed Pete mapping with actual UUID from auth.users';
END $$;
