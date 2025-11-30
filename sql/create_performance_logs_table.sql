-- =====================================================================
-- SCHEMA: Performance Monitoring Logs
-- =====================================================================
-- This script creates a table to store application performance metrics.
-- This helps identify bottlenecks and excessive polling.
-- =====================================================================

CREATE TABLE IF NOT EXISTS performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    duration_ms INTEGER,
    user_id TEXT, -- LINE User ID or Supabase auth ID
    component TEXT, -- e.g., 'Chat', 'AdminDashboard', 'BookingSystem'
    screen TEXT, -- e.g., 'golferDashboard', 'adminDashboard'
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB -- Additional context like payload size, status, etc.
);

COMMENT ON TABLE public.performance_logs IS 'Stores application performance metrics for monitoring and optimization.';
COMMENT ON COLUMN public.performance_logs.event_name IS 'Name of the performance event (e.g., "chat_init", "fetch_users", "save_booking").';
COMMENT ON COLUMN public.performance_logs.duration_ms IS 'Duration of the event in milliseconds.';
COMMENT ON COLUMN public.performance_logs.user_id IS 'Identifier of the user performing the action.';
COMMENT ON COLUMN public.performance_logs.component IS 'Application component related to the event.';
COMMENT ON COLUMN public.performance_logs.screen IS 'Screen where the event occurred.';
COMMENT ON COLUMN public.performance_logs.metadata IS 'Additional JSON metadata for the event.';

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_performance_logs_event_name ON public.performance_logs(event_name);
CREATE INDEX IF NOT EXISTS idx_performance_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_logs_component ON public.performance_logs(component);
CREATE INDEX IF NOT EXISTS idx_performance_logs_timestamp ON public.performance_logs(timestamp DESC);

-- RLS Policy: Allow authenticated users to insert their own performance logs
-- Admin can view all logs
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to insert own performance logs" ON public.performance_logs;
CREATE POLICY "Allow authenticated users to insert own performance logs"
  ON public.performance_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id OR (SELECT role FROM public.user_profiles WHERE line_user_id = auth.uid()::text) = 'admin'); -- Assuming user_id is line_user_id or similar

DROP POLICY IF EXISTS "Admins can view all performance logs" ON public.performance_logs;
CREATE POLICY "Admins can view all performance logs"
  ON public.performance_logs FOR SELECT
  TO authenticated
  USING ((SELECT role FROM public.user_profiles WHERE line_user_id = auth.uid()::text) = 'admin');

DO $$
BEGIN
    RAISE NOTICE '✅ Migration successful: performance_logs table created.';
END $$;
