const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Use context from Netlify deployment
    const store = getStore({
      name: 'profiles',
      siteID: context.clientContext?.custom?.netlify?.site_id || '27e7a460-3f3a-4be4-ba66-2ed82ccc5c8f',
      deployID: context.clientContext?.custom?.netlify?.deploy_id,
      token: context.clientContext?.custom?.netlify?.token || process.env.NETLIFY_ACCESS_TOKEN
    });
    const method = event.httpMethod;

    // GET /profiles - Get all profiles OR check username
    if (method === 'GET') {
      const username = event.queryStringParameters?.username;

      if (username) {
        // Check if username exists
        const profile = await store.get(username, { type: 'json' });
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            available: !profile,
            exists: !!profile
          })
        };
      }

      // Get all profiles (for admin/management)
      const profiles = await store.list();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, profiles: profiles.blobs })
      };
    }

    // POST /profiles - Create new profile
    if (method === 'POST') {
      const profileData = JSON.parse(event.body);
      const { username } = profileData;

      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Username is required' })
        };
      }

      // Check if username already exists
      const existing = await store.get(username, { type: 'json' });
      if (existing) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ success: false, error: 'Username already taken' })
        };
      }

      // Create profile with timestamp
      const profile = {
        ...profileData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        id: `user_${username}_${Date.now()}`
      };

      // Save profile
      await store.setJSON(username, profile);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ success: true, profile })
      };
    }

    // PUT /profiles/:username - Update existing profile
    if (method === 'PUT') {
      const username = event.queryStringParameters?.username;
      const updates = JSON.parse(event.body);

      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Username is required' })
        };
      }

      // Get existing profile
      const existing = await store.get(username, { type: 'json' });
      if (!existing) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ success: false, error: 'Profile not found' })
        };
      }

      // Update profile
      const updated = {
        ...existing,
        ...updates,
        username, // Preserve username
        createdAt: existing.createdAt, // Preserve creation date
        updatedAt: new Date().toISOString()
      };

      await store.setJSON(username, updated);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, profile: updated })
      };
    }

    // DELETE /profiles/:username - Delete profile
    if (method === 'DELETE') {
      const username = event.queryStringParameters?.username;

      if (!username) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'Username is required' })
        };
      }

      await store.delete(username);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Profile deleted' })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: 'Not found' })
    };

  } catch (error) {
    console.error('Profiles function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      })
    };
  }
};
