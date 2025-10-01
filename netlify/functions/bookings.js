// CommonJS version to avoid ESM pitfalls
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('mcipro'); // a named bucket
    const key = 'all.json';

    // Add CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle OPTIONS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (event.httpMethod === 'GET') {
      const text = await store.get(key, { type: 'text' });
      const body = text || JSON.stringify({
        bookings: [],
        user_profiles: [],
        schedule_items: [],
        emergency_alerts: [],
        updatedAt: Date.now()
      });

      return {
        statusCode: 200,
        headers,
        body,
      };
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');

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

      await store.set(key, JSON.stringify(body), { addRandomSuffix: false });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          updatedAt: body.updatedAt,
          itemCounts: {
            bookings: body.bookings.length,
            profiles: body.user_profiles.length,
            schedules: body.schedule_items.length,
            alerts: body.emergency_alerts.length
          }
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Function error: ${err.message}` })
    };
  }
};