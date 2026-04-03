-- Passkey Recovery: Phone-based account recovery for device switches
-- Run this in Supabase SQL Editor

-- Add recovery_phone column to user_profiles if not exists
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS recovery_phone text;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS recovery_phone_verified boolean DEFAULT false;

-- Recovery verification codes (short-lived)
CREATE TABLE IF NOT EXISTS public.recovery_codes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text NOT NULL,
    code text NOT NULL,
    user_id text,  -- linked after verification
    created_at timestamptz DEFAULT now(),
    expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
    verified boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_phone ON public.recovery_codes(phone);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_code ON public.recovery_codes(code);

ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon recovery codes" ON public.recovery_codes FOR ALL TO anon USING (true) WITH CHECK (true);

-- Clean up expired codes periodically (optional - can be done via cron)
-- DELETE FROM public.recovery_codes WHERE expires_at < now();
