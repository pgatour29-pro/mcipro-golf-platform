// FIXED: Server-side merging with PERSISTENT storage using Netlify Blobs
// This replaces the in-memory storage that was causing data loss after 3-5 minutes

const { getStore } = require('@netlify/blobs');

// CRITICAL FIX: Use explicit configuration since auto-injection isn't working
async function getStorage() {
  const cfg = {
    name: 'mcipro-data',
    siteID: '27e7a460-3f3a-4be4-ba66-2ed82ccc5c8f', // Explicit site ID
    token: process.env.NETLIFY_ACCESS_TOKEN || process.env.NETLIFY_BLOBS_TOKEN
  };

  const store = getStore(cfg);
  const data = await store.get('storage', { type: 'json' });

  if (!data) {
    // Initialize with default structure
    return {
      bookings: [],
      version: 0,
      updatedAt: Date.now()
    };
  }

  // PURGE LEGACY FIELDS: Remove schedule_items that poison the UI (but KEEP user_profiles)
  delete data.schedule_items;
  delete data.schedule;
  delete data.emergency_alerts;
  delete data.caddies;
  delete data.waitlist;
  delete data.tombstones;

  return {
    bookings: data.bookings || [],
    user_profiles: data.user_profiles || [],
    version: data.version || 0,
    updatedAt: data.updatedAt || Date.now()
  };
}

async function setStorage(storage) {
  const cfg = {
    name: 'mcipro-data',
    siteID: '27e7a460-3f3a-4be4-ba66-2ed82ccc5c8f',
    token: process.env.NETLIFY_ACCESS_TOKEN || process.env.NETLIFY_BLOBS_TOKEN
  };

  const store = getStore(cfg);

  // Save bookings, user_profiles, version, updatedAt - strip everything else
  const cleanStorage = {
    bookings: storage.bookings || [],
    user_profiles: storage.user_profiles || [],
    version: storage.version || 0,
    updatedAt: storage.updatedAt || Date.now()
  };

  await store.setJSON('storage', cleanStorage);
  return cleanStorage;
}

// CRITICAL FIX: Item-level last-write-wins merge (never replaces, only upserts)
function mergeArrays(currentArray = [], incomingArray = [], idField = 'id') {
  const map = new Map();

  // Helper: parse updatedAt to timestamp for comparison
  const getTimestamp = (item) => {
    if (!item) return 0;
    const ts = item.updatedAt;
    if (!ts) return 0;
    return typeof ts === 'number' ? ts : +new Date(ts);
  };

  // Add all current items to map
  currentArray.forEach(item => {
    const id = item[idField];
    if (id) map.set(id, item);
  });

  // Merge incoming items using last-write-wins
  incomingArray.forEach(item => {
    const id = item[idField];
    if (!id) return;

    // SERVER STAMPS updatedAt for clock skew safety
    item.updatedAt = Date.now();

    const existing = map.get(id);

    // Handle deletion via tombstone
    if (item.deleted) {
      map.delete(id);
      console.log(`[MERGE] Deleted ${id}`);
      return;
    }

    // Last-write-wins: use incoming if newer or if no existing
    const existingTs = getTimestamp(existing);
    const incomingTs = getTimestamp(item);

    if (!existing || incomingTs >= existingTs) {
      map.set(id, item);
      console.log(`[MERGE] Upserted ${id} (${incomingTs} >= ${existingTs})`);
    } else {
      console.log(`[MERGE] Kept existing ${id} (${existingTs} > ${incomingTs})`);
    }
  });

  return Array.from(map.values());
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600'
  };

  try {
    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // SECURE AUTH: Use env variable for production, fallback for dev
    const siteKey = event.headers.authorization || event.headers.Authorization || '';
    const expectedKey = `Bearer ${process.env.SITE_WRITE_KEY || 'mcipro-site-key-2024'}`;

    // REQUIRE AUTH FOR ALL REQUESTS (not just PUT)
    if (siteKey !== expectedKey) {
      console.error('[AUTH] Unauthorized request');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    if (event.httpMethod === 'GET') {
      // FIXED: Load from persistent storage
      const storage = await getStorage();

      console.log('GET request - returning storage:', {
        bookings: storage.bookings.length,
        version: storage.version
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(storage),
      };
    }

    if (event.httpMethod === 'PUT') {
      // FIXED: Load current storage from persistent store
      const storage = await getStorage();

      // INPUT VALIDATION: Parse and validate JSON
      let clientData;
      try {
        clientData = JSON.parse(event.body || '{}');
      } catch {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON' })
        };
      }

      // VALIDATE bookings and user_profiles arrays
      if (clientData.bookings && !Array.isArray(clientData.bookings)) {
        clientData.bookings = [];
      }
      if (clientData.user_profiles && !Array.isArray(clientData.user_profiles)) {
        clientData.user_profiles = [];
      }

      // VERSION CHECK: Return 409 if baseVersion doesn't match (client will rebase)
      const baseVersion = clientData.baseVersion ?? -1;
      if (baseVersion !== storage.version) {
        console.log(`[409] Client baseVersion ${baseVersion} != server ${storage.version}, returning conflict`);
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify(storage)
        };
      }

      // EMPTY PAYLOAD GUARD: If client sends nothing, do nothing (avoid wipe from race)
      const incoming = Array.isArray(clientData.bookings) ? clientData.bookings.filter(Boolean) : [];
      if (incoming.length === 0 && storage.bookings.length > 0) {
        console.log('[GUARD] Empty payload blocked, returning current state');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            ok: true,
            version: storage.version,
            updatedAt: storage.updatedAt,
            mergedData: storage
          })
        };
      }

      console.log('[MERGE] Starting item-level merge...');

      // SERVER TIMESTAMP: Use for all operations
      const serverNow = Date.now();

      // Item-level merge (non-destructive, last-write-wins) - BOOKINGS AND PROFILES
      storage.bookings = mergeArrays(storage.bookings, clientData.bookings || [], 'id');

      // Merge user profiles by lineUserId or username
      if (clientData.user_profiles && Array.isArray(clientData.user_profiles)) {
        storage.user_profiles = mergeArrays(
          storage.user_profiles || [],
          clientData.user_profiles,
          'lineUserId'
        );
        console.log('[MERGE] Merged user profiles:', storage.user_profiles.length);
      }

      // Remove tombstoned items
      const deletedCount = storage.bookings.filter(b => b.deleted).length;
      storage.bookings = storage.bookings.filter(b => !b.deleted);

      if (deletedCount > 0) {
        console.log(`[MERGE] Removed ${deletedCount} deleted bookings`);
      }

      // Update metadata with server timestamp
      storage.version = (storage.version || 0) + 1;
      storage.updatedAt = serverNow;

      // BLOB SIZE PROTECTION: Check if data is getting too large
      const dataSize = JSON.stringify(storage).length;
      const MAX_SIZE = 1024 * 1024; // 1MB limit

      if (dataSize > MAX_SIZE) {
        console.log(`[SIZE] Data size ${dataSize} bytes exceeds limit ${MAX_SIZE}`);
        return {
          statusCode: 413,
          headers,
          body: JSON.stringify({
            error: 'Data too large',
            message: `Data size ${Math.round(dataSize/1024)}KB exceeds ${Math.round(MAX_SIZE/1024)}KB limit`,
            suggestion: 'Archive old bookings or reduce data volume'
          })
        };
      }

      // FIXED: Save to persistent storage
      await setStorage(storage);

      console.log('PUT request - merged data:', {
        bookings: storage.bookings.length,
        version: storage.version
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(storage), // Return clean storage: bookings, version, updatedAt only
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  } catch (err) {
    console.error('[FUNCTION ERROR]', err);
    console.error('[FUNCTION ERROR] Stack:', err.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Function error',
        message: err && err.message ? err.message : String(err),
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      })
    };
  }
};
