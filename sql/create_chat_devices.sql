-- Create chat_devices table for push notification tokens
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.chat_devices (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT PRIMARY KEY,
  platform TEXT CHECK (platform IN ('ios','android','web')) DEFAULT 'android',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_devices ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only manage their own devices
CREATE POLICY "users_manage_own_devices" ON public.chat_devices
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chat_devices_user_id ON public.chat_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_devices_platform ON public.chat_devices(platform);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_devices_updated_at
BEFORE UPDATE ON public.chat_devices
FOR EACH ROW EXECUTE FUNCTION update_chat_devices_updated_at();

-- Verify
SELECT * FROM public.chat_devices LIMIT 1;
