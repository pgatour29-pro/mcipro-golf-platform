// netlify/functions/bookings.js
export default async (req, context) => {
  const { blobs } = context; // Netlify Blobs
  const bucket = blobs.getBucket({ name: 'mcipro' });
  const key = 'all.json';

  // Add CORS headers for cross-origin requests
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method === 'GET') {
    try {
      const blob = await bucket.get(key);
      if (!blob) {
        // Return empty data structure if no data exists
        const emptyData = {
          bookings: [],
          user_profiles: [],
          schedule_items: [],
          emergency_alerts: [],
          updatedAt: Date.now()
        };
        return new Response(JSON.stringify(emptyData), {
          headers: corsHeaders
        });
      }

      const text = await blob.text();
      return new Response(text, {
        headers: corsHeaders
      });
    } catch (error) {
      console.error('GET error:', error);
      return new Response(JSON.stringify({ error: 'Failed to get data' }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = await req.json();

      // Add server timestamp
      body.updatedAt = Date.now();
      body.serverUpdatedAt = new Date().toISOString();

      // Validate basic structure
      if (!body.bookings) body.bookings = [];
      if (!body.user_profiles) body.user_profiles = [];
      if (!body.schedule_items) body.schedule_items = [];
      if (!body.emergency_alerts) body.emergency_alerts = [];

      console.log('Saving data:', {
        bookings: body.bookings.length,
        profiles: body.user_profiles.length,
        schedules: body.schedule_items.length,
        alerts: body.emergency_alerts.length
      });

      await bucket.set(key, JSON.stringify(body));

      return new Response(JSON.stringify({
        ok: true,
        updatedAt: body.updatedAt,
        itemCounts: {
          bookings: body.bookings.length,
          profiles: body.user_profiles.length,
          schedules: body.schedule_items.length,
          alerts: body.emergency_alerts.length
        }
      }), {
        headers: corsHeaders
      });
    } catch (error) {
      console.error('PUT error:', error);
      return new Response(JSON.stringify({ error: 'Failed to save data' }), {
        status: 500,
        headers: corsHeaders
      });
    }
  }

  return new Response('Method Not Allowed', {
    status: 405,
    headers: corsHeaders
  });
};