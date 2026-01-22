/**
 * Latency Tracking Wrapper for Edge Functions
 * Automatically logs API request performance to the database
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function withLatencyTracking(
  handler: (req: Request) => Promise<Response>,
  endpoint: string
) {
  return async (req: Request): Promise<Response> => {
    const startTime = performance.now();

    try {
      const response = await handler(req);
      const latencyMs = performance.now() - startTime;

      // Log to database (fire and forget)
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        supabase
          .rpc('log_api_latency', {
            p_endpoint: endpoint,
            p_method: req.method,
            p_latency_ms: latencyMs,
            p_status_code: response.status,
          })
          .then(() => {})
          .catch((err) => console.error('[LatencyTracking] Log error:', err));
      } catch (e) {
        // Don't let logging errors affect the response
        console.error('[LatencyTracking] Setup error:', e);
      }

      // Add latency header for debugging
      const headers = new Headers(response.headers);
      headers.set('X-Response-Time', `${latencyMs.toFixed(2)}ms`);

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      console.error(`[${endpoint}] Error after ${latencyMs}ms:`, error);

      // Log error to database
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        supabase
          .rpc('log_api_latency', {
            p_endpoint: endpoint,
            p_method: req.method,
            p_latency_ms: latencyMs,
            p_status_code: 500,
          })
          .then(() => {})
          .catch(() => {});
      } catch (e) {
        // Ignore
      }

      throw error;
    }
  };
}
