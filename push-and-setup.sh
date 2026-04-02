#!/bin/bash
# Run this once to push biometric auth and create the DB table
cd /tmp/mcipro

# Create Supabase table
curl -s "https://api.supabase.com/v1/projects/pyeeplwsnupmhgbguwqs/database/query" \
  -H "Authorization: Bearer sbp_20ee2065371749f594a86de0b708bc41998b7504" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE IF NOT EXISTS public.webauthn_credentials (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, user_id text NOT NULL, credential_id text NOT NULL UNIQUE, public_key text, user_name text, device_name text, created_at timestamptz DEFAULT now(), last_used_at timestamptz); CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON public.webauthn_credentials(user_id); CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON public.webauthn_credentials(credential_id);"}'

# Push code
git config credential.helper 'store --file=/mnt/c/Users/pete/.git-credentials'
git add -A
git commit -m "feat: biometric login (WebAuthn/Passkeys) for US/overseas market"
git push

echo "DONE"
