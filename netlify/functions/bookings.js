// CommonJS Netlify Function using Netlify Blobs
const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  try {
    const store = getStore('mcipro'); // named bucket
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

      console.log('GET request - returning data');
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

      console.log('PUT request - saving data:', {
        bookings: body.bookings?.length || 0,
        profiles: body.user_profiles?.length || 0,
        schedules: body.schedule_items?.length || 0,
        alerts: body.emergency_alerts?.length || 0
      });

      await store.set(key, JSON.stringify(body), { addRandomSuffix: false });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          updatedAt: body.updatedAt,
          saved: true
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };

  } catch (err) {
    // Make the actual error visible in browser & Netlify logs
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Function error',
        message: err && err.message ? err.message : String(err),
        stack: err && err.stack ? err.stack : undefined
      })
    };
  }
};