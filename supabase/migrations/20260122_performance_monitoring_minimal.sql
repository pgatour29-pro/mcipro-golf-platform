-- STEP 1: Drop existing table if it exists (clean start)
DROP TABLE IF EXISTS performance_logs CASCADE;

-- STEP 2: Create the performance_logs table
CREATE TABLE performance_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  metric_type text NOT NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- STEP 3: Create indexes
CREATE INDEX idx_performance_logs_created_at ON performance_logs(created_at DESC);
CREATE INDEX idx_performance_logs_type ON performance_logs(metric_type);

-- STEP 4: Enable RLS
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create policies
CREATE POLICY "Allow insert" ON performance_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow select" ON performance_logs FOR SELECT TO authenticated USING (true);

-- STEP 6: Create log function
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

GRANT EXECUTE ON FUNCTION log_api_latency TO authenticated;

-- STEP 7: Create db stats function
CREATE OR REPLACE FUNCTION get_db_stats()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'activeConnections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
    'maxConnections', (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
    'cacheHitRatio', 0.99
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_db_stats TO authenticated;

-- STEP 8: Create summary function
CREATE OR REPLACE FUNCTION get_performance_summary(p_hours int DEFAULT 24)
RETURNS jsonb AS $$
DECLARE
  since_time timestamptz;
  api_avg numeric;
  api_count int;
BEGIN
  since_time := now() - (p_hours || ' hours')::interval;

  SELECT
    COALESCE(avg(metric_value), 0),
    count(*)
  INTO api_avg, api_count
  FROM performance_logs
  WHERE metric_type = 'api_latency'
    AND created_at >= since_time;

  RETURN jsonb_build_object(
    'api', jsonb_build_object(
      'avgLatency', round(api_avg::numeric, 2),
      'totalRequests', api_count
    ),
    'period_hours', p_hours
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_performance_summary TO authenticated;

-- DONE
SELECT 'Performance monitoring setup complete!' as status;
