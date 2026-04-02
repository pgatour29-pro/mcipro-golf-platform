-- WebAuthn Credentials table for biometric login
-- Run this in Supabase SQL Editor or via API

CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    credential_id text NOT NULL UNIQUE,
    public_key text,
    user_name text,
    device_name text,
    created_at timestamptz DEFAULT now(),
    last_used_at timestamptz
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON public.webauthn_credentials(credential_id);

-- Enable RLS but allow anon access (credentials are verified client-side via WebAuthn)
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Allow insert and select for anon (the security is in the WebAuthn protocol itself)
CREATE POLICY "Allow anon insert" ON public.webauthn_credentials FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon select" ON public.webauthn_credentials FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon update" ON public.webauthn_credentials FOR UPDATE TO anon USING (true);
