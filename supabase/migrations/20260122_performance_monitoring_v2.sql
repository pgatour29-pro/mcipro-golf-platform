-- Performance Monitoring Tables and Functions (FIXED)
-- MyCaddiPro Database Monitoring Setup
-- Date: 2026-01-22 (v2 - removed problematic indexes)

-- =====================================================
-- 1. PERFORMANCE LOGS TABLE
-- Stores all performance metrics for analysis
-- =====================================================

CREATE TABLE IF NOT EXISTS performance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_performance_logs_created_at
  ON performance_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_logs_type
  ON performance_logs(metric_type);

CREATE INDEX IF NOT EXISTS idx_performance_logs_type_created
  ON performance_logs(metric_type, created_at DESC);

-- Add comment
COMMENT ON TABLE performance_logs IS 'Stores performance metrics for monitoring API latency, page load times, and system health';


-- =====================================================
-- 2. API LATENCY LOGGING FUNCTION
-- Called from Edge Functions to log request timings
-- =====================================================

CREATE OR REPLACE FUNCTION log_api_latency(
  p_endpoint text,
  p_method text,
  p_latency_ms numeric,
  p_status_code int,
  p_user_id uuid DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO performance_logs (metric_type, metric_name, metric_value, metadata)
  VALUES (
    'api_latency',
    p_endpoint,
    p_latency_ms,
    jsonb_build_object(
      'method', p_method,
      'status_code', p_status_code,
      'user_id', p_user_id
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION log_api_latency TO authenticated;
GRANT EXECUTE ON FUNCTION log_api_latency TO service_role;


-- =====================================================
-- 3. DATABASE STATS FUNCTION
-- Returns current database health metrics
-- =====================================================

CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  active_conns int;
  max_conns int;
  cache_hit numeric;
BEGIN
  -- Get connection counts
  SELECT count(*) INTO active_conns
  FROM pg_stat_activity
  WHERE state = 'active';

  -- Get max connections (from settings)
  SELECT setting::int INTO max_conns
  FROM pg_settings
  WHERE name = 'max_connections';

  -- Get cache hit ratio
  SELECT
    CASE WHEN (sum(blks_hit) + sum(blks_read)) > 0
      THEN sum(blks_hit)::numeric / (sum(blks_hit) + sum(blks_read))
      ELSE 1.0
    END INTO cache_hit
  FROM pg_stat_database
  WHERE datname = current_database();

  result := jsonb_build_object(
    'activeConnections', active_conns,
    'maxConnections', max_conns,
    'cacheHitRatio', round(cache_hit, 4)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_db_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_db_stats TO service_role;


-- =====================================================
-- 4. PERFORMANCE METRICS SUMMARY FUNCTION
-- Aggregates metrics for dashboard display
-- =====================================================

CREATE OR REPLACE FUNCTION get_performance_summary(p_hours int DEFAULT 24)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  api_stats jsonb;
  page_stats jsonb;
  error_count int;
  since_time timestamptz;
BEGIN
  -- Calculate cutoff time
  since_time := now() - (p_hours || ' hours')::interval;

  -- Get API latency stats
  SELECT jsonb_build_object(
    'avgLatency', round(COALESCE(avg(metric_value), 0)::numeric, 2),
    'p95Latency', round(COALESCE(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value), 0)::numeric, 2),
    'totalRequests', count(*)
  ) INTO api_stats
  FROM performance_logs
  WHERE metric_type = 'api_latency'
    AND created_at >= since_time;

  -- Get page load stats (web vitals)
  SELECT jsonb_build_object(
    'avgLCP', round(COALESCE(avg(CASE WHEN metric_name = 'LCP' THEN metric_value END), 0)::numeric, 2),
    'avgFCP', round(COALESCE(avg(CASE WHEN metric_name = 'FCP' THEN metric_value END), 0)::numeric, 2),
    'avgCLS', round(COALESCE(avg(CASE WHEN metric_name = 'CLS' THEN metric_value END), 0)::numeric, 4)
  ) INTO page_stats
  FROM performance_logs
  WHERE metric_type = 'web_vitals'
    AND created_at >= since_time;

  -- Get error count
  SELECT count(*) INTO error_count
  FROM performance_logs
  WHERE metric_type = 'api_latency'
    AND created_at >= since_time
    AND (metadata->>'status_code')::int >= 400;

  result := jsonb_build_object(
    'api', COALESCE(api_stats, '{}'::jsonb),
    'pageLoad', COALESCE(page_stats, '{}'::jsonb),
    'errorCount', COALESCE(error_count, 0),
    'period_hours', p_hours
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_summary TO service_role;


-- =====================================================
-- 5. CLEANUP FUNCTION (for scheduled jobs)
-- Deletes old performance logs to manage storage
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_performance_logs(p_days int DEFAULT 30)
RETURNS int AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM performance_logs
  WHERE created_at < now() - (p_days || ' days')::interval;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role can run cleanup
GRANT EXECUTE ON FUNCTION cleanup_old_performance_logs TO service_role;


-- =====================================================
-- 6. ROW LEVEL SECURITY FOR PERFORMANCE_LOGS
-- =====================================================

ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON performance_logs;
DROP POLICY IF EXISTS "Allow read for service role" ON performance_logs;
DROP POLICY IF EXISTS "Allow read via function" ON performance_logs;

-- Policy: Anyone can insert (for frontend logging)
CREATE POLICY "Allow insert for authenticated users"
  ON performance_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Service role can do everything
CREATE POLICY "Allow read for service role"
  ON performance_logs FOR SELECT
  TO service_role
  USING (true);

-- Policy: Authenticated users can read (for dashboard)
CREATE POLICY "Allow read via function"
  ON performance_logs FOR SELECT
  TO authenticated
  USING (true);


-- =====================================================
-- 7. OPTIONAL: CADDY_BOOKINGS INDEXES
-- Only create if table exists
-- =====================================================

DO $$
BEGIN
  -- Check if caddy_bookings table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'caddy_bookings') THEN
    -- Create index on date, time if columns exist
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'caddy_bookings' AND column_name = 'date')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'caddy_bookings' AND column_name = 'time') THEN
      CREATE INDEX IF NOT EXISTS idx_caddy_bookings_date_time ON caddy_bookings(date, time);
      RAISE NOTICE 'Created index idx_caddy_bookings_date_time';
    END IF;

    -- Create index on caddy_id, date if columns exist
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'caddy_bookings' AND column_name = 'caddy_id')
       AND EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'caddy_bookings' AND column_name = 'date') THEN
      CREATE INDEX IF NOT EXISTS idx_caddy_bookings_caddy_date ON caddy_bookings(caddy_id, date);
      RAISE NOTICE 'Created index idx_caddy_bookings_caddy_date';
    END IF;
  ELSE
    RAISE NOTICE 'Table caddy_bookings does not exist, skipping indexes';
  END IF;
END $$;


-- =====================================================
-- DONE
-- =====================================================

COMMENT ON FUNCTION log_api_latency IS 'Logs API request latency for monitoring';
COMMENT ON FUNCTION get_db_stats IS 'Returns current database connection and cache statistics';
COMMENT ON FUNCTION get_performance_summary IS 'Returns aggregated performance metrics for dashboard';
COMMENT ON FUNCTION cleanup_old_performance_logs IS 'Removes performance logs older than specified days';

-- Success message
DO $$ BEGIN RAISE NOTICE 'Performance monitoring setup complete!'; END $$;
