/**
 * Performance Logger
 * Logs performance metrics to Supabase for monitoring
 */

// Get Supabase client (from global or import)
function getSupabase() {
  // Try to get from global SupabaseManager (used in legacy code)
  if (typeof window !== 'undefined' && window.SupabaseManager) {
    return window.SupabaseManager.client;
  }
  // Fallback to window.supabase if available
  if (typeof window !== 'undefined' && window.supabase) {
    return window.supabase;
  }
  console.warn('[PerformanceLogger] No Supabase client available');
  return null;
}

// Log API latency to database
export async function logApiLatency(endpoint, method, latencyMs, statusCode, userId = null) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('log_api_latency', {
      p_endpoint: endpoint,
      p_method: method,
      p_latency_ms: latencyMs,
      p_status_code: statusCode,
      p_user_id: userId,
    });

    if (error) {
      console.warn('[PerformanceLogger] Failed to log latency:', error.message);
    }
  } catch (err) {
    // Silently fail - don't let monitoring break the app
    console.warn('[PerformanceLogger] Error logging latency:', err.message);
  }
}

// Log a generic performance metric
export async function logMetric(metricType, metricName, metricValue, metadata = {}) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('performance_logs')
      .insert({
        metric_type: metricType,
        metric_name: metricName,
        metric_value: metricValue,
        metadata: metadata,
      });

    if (error) {
      console.warn('[PerformanceLogger] Failed to log metric:', error.message);
    }
  } catch (err) {
    console.warn('[PerformanceLogger] Error logging metric:', err.message);
  }
}

// Measure and log a function's execution time
export async function measureAndLog(name, fn) {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    // Log to database (fire and forget)
    logMetric('function_timing', name, duration, {
      success: true,
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    // Log error with timing
    logMetric('function_timing', name, duration, {
      success: false,
      error: error.message,
    });

    throw error;
  }
}

// Create a fetch wrapper that logs performance
export function createTimedFetch(baseName = 'api') {
  return async function timedFetch(url, options = {}) {
    const start = performance.now();
    const method = options.method || 'GET';

    try {
      const response = await fetch(url, options);
      const duration = performance.now() - start;

      // Extract endpoint from URL
      const urlObj = new URL(url, window.location.origin);
      const endpoint = urlObj.pathname;

      // Log latency (fire and forget)
      logApiLatency(endpoint, method, duration, response.status);

      return response;
    } catch (error) {
      const duration = performance.now() - start;

      // Extract endpoint from URL
      try {
        const urlObj = new URL(url, window.location.origin);
        const endpoint = urlObj.pathname;
        logApiLatency(endpoint, method, duration, 0); // 0 for network error
      } catch (e) {
        // Ignore URL parsing errors
      }

      throw error;
    }
  };
}

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  try {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcp) {
      logMetric('web_vitals', 'FCP', fcp.startTime, {
        page: window.location.pathname,
      });
    }
  } catch (e) {
    // Performance API not available
  }

  // Largest Contentful Paint (requires PerformanceObserver)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          logMetric('web_vitals', 'LCP', lastEntry.startTime, {
            page: window.location.pathname,
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((entryList) => {
        let clsValue = 0;
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        if (clsValue > 0) {
          logMetric('web_vitals', 'CLS', clsValue, {
            page: window.location.pathname,
          });
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((entryList) => {
        const firstInput = entryList.getEntries()[0];
        if (firstInput) {
          logMetric('web_vitals', 'FID', firstInput.processingStart - firstInput.startTime, {
            page: window.location.pathname,
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // PerformanceObserver not supported for these types
    }
  }
}

// Get database performance stats
export async function getDbStats() {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.rpc('get_db_stats');
    if (error) {
      console.warn('[PerformanceLogger] Failed to get DB stats:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[PerformanceLogger] Error getting DB stats:', err.message);
    return null;
  }
}

// Get recent performance metrics
export async function getRecentMetrics(metricType, hours = 24) {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('performance_logs')
      .select('created_at, metric_name, metric_value, metadata')
      .eq('metric_type', metricType)
      .gte('created_at', since)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[PerformanceLogger] Failed to get metrics:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[PerformanceLogger] Error getting metrics:', err.message);
    return [];
  }
}
