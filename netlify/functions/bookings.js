// Server-side merging with tombstones and conflict resolution
let storage = {
  bookings: [],
  user_profiles: [],
  schedule_items: [],
  emergency_alerts: [],
  caddies: [], // Added for completeness
  waitlist: [], // Added for completeness
  tombstones: {}, // Track deleted items: { entityType: { id: { deleted: true, updatedAt: timestamp } } }
  version: 1,
  updatedAt: Date.now()
};

// Server-side merge with last-write-wins by updatedAt
function mergeArrayWithTombstones(currentArray, incomingArray, entityType, idField = 'id') {
  const tombstoneMap = storage.tombstones[entityType] || {};
  const merged = new Map();

  // Add current items (filtering out tombstoned ones)
  currentArray.forEach(item => {
    const id = item[idField];
    if (id) {
      const tombstone = tombstoneMap[id];
      // Skip if tombstoned and tombstone is newer than item
      if (!tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt) {
        merged.set(id, item);
      }
    }
  });

  // Process incoming items
  incomingArray.forEach(item => {
    const id = item[idField];
    if (!id) return;

    // SERVER STAMPS updatedAt for clock skew safety
    item.updatedAt = Date.now(); // Always use server time

    if (item.deleted) {
      // Handle deletion: create tombstone and remove from merged
      if (!storage.tombstones[entityType]) storage.tombstones[entityType] = {};
      storage.tombstones[entityType][id] = {
        deleted: true,
        updatedAt: item.updatedAt
      };
      merged.delete(id);
      console.log(`[MERGE] Tombstoned ${entityType} ${id}`);
    } else {
      // Handle creation/update: check against existing and tombstones
      const tombstone = tombstoneMap[id];
      const existing = merged.get(id);

      // Skip if tombstoned and tombstone is newer
      if (tombstone && tombstone.deleted && item.updatedAt <= tombstone.updatedAt) {
        console.log(`[MERGE] Rejected ${entityType} ${id} - tombstoned`);
        return;
      }

      // Use last-write-wins if no existing or incoming is newer
      if (!existing || item.updatedAt >= existing.updatedAt) {
        merged.set(id, item);
        console.log(`[MERGE] Updated ${entityType} ${id} (${item.updatedAt})`);
      } else {
        console.log(`[MERGE] Kept existing ${entityType} ${id} (${existing.updatedAt} > ${item.updatedAt})`);
      }
    }
  });

  return Array.from(merged.values());
}

exports.handler = async (event) => {
  try {
    // SECURE ORIGIN RESTRICTION
    const origin = event.headers.origin || '';
    const allowOrigin = /^(https:\/\/(www\.)?mcipro(-golf-platform)?\.netlify\.app|http:\/\/localhost(:\d+)?|http:\/\/127\.0\.0\.1(:\d+)?)$/.test(origin) ? origin : '';

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin || 'https://mcipro-golf-platform.netlify.app',
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '3600'
    };

    if (event.httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // SECURE AUTH: Use env variable for production, fallback for dev
    const siteKey = event.headers.authorization || event.headers.Authorization || '';
    const expectedKey = `Bearer ${process.env.SITE_WRITE_KEY || 'mcipro-site-key-2024'}`;

    // REQUIRE AUTH FOR ALL REQUESTS (not just PUT)
    if (siteKey !== expectedKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    if (event.httpMethod === 'GET') {
      // Clean old tombstones (older than 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      Object.keys(storage.tombstones).forEach(entityType => {
        Object.keys(storage.tombstones[entityType]).forEach(id => {
          if (storage.tombstones[entityType][id].updatedAt < thirtyDaysAgo) {
            delete storage.tombstones[entityType][id];
          }
        });
      });

      console.log('GET request - returning storage:', {
        bookings: storage.bookings.length,
        profiles: storage.user_profiles.length,
        version: storage.version,
        tombstones: Object.keys(storage.tombstones).length
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(storage),
      };
    }

    if (event.httpMethod === 'PUT') {
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

      // VALIDATE ARRAY FIELDS
      ['bookings','user_profiles','schedule_items','emergency_alerts','caddies','waitlist'].forEach(k => {
        if (clientData[k] && !Array.isArray(clientData[k])) clientData[k] = [];
      });

      const baseVersion = clientData.baseVersion;

      // REQUIRE baseVersion ON EVERY PUT
      if (!Number.isFinite(baseVersion)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing or invalid baseVersion' })
        };
      }

      // FIXED CAS: Handle baseVersion=0 correctly
      if (baseVersion !== storage.version) {
        console.log(`[CONFLICT] Client baseVersion ${baseVersion} != server version ${storage.version}`);
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'Conflict',
            message: 'Data has been modified by another client',
            currentVersion: storage.version,
            serverData: storage
          })
        };
      }

      console.log('[MERGE] Starting server-side merge...');

      // SERVER TIMESTAMP: Use for all operations
      const serverNow = Date.now();

      // Server-side merge with tombstones
      storage.bookings = mergeArrayWithTombstones(storage.bookings, clientData.bookings || [], 'bookings', 'id');
      storage.user_profiles = mergeArrayWithTombstones(storage.user_profiles, clientData.user_profiles || [], 'user_profiles', 'userId');
      storage.schedule_items = mergeArrayWithTombstones(storage.schedule_items, clientData.schedule_items || [], 'schedule_items', 'id');
      storage.emergency_alerts = mergeArrayWithTombstones(storage.emergency_alerts, clientData.emergency_alerts || [], 'emergency_alerts', 'id');
      storage.caddies = mergeArrayWithTombstones(storage.caddies, clientData.caddies || [], 'caddies', 'id');
      storage.waitlist = mergeArrayWithTombstones(storage.waitlist, clientData.waitlist || [], 'waitlist', 'id');

      // CASCADE DELETES: Tombstone orphaned records
      const deletedBookingIds = new Set();
      Object.keys(storage.tombstones.bookings || {}).forEach(id => {
        if (storage.tombstones.bookings[id].deleted) {
          deletedBookingIds.add(id);
        }
      });

      if (deletedBookingIds.size > 0) {
        console.log(`[CASCADE] Checking ${deletedBookingIds.size} deleted bookings for cascades`);

        // Cascade to schedule items tied to deleted bookings
        storage.schedule_items.forEach(item => {
          if (item.bookingId && deletedBookingIds.has(item.bookingId)) {
            console.log(`[CASCADE] Tombstoning schedule item ${item.id} (orphaned by booking ${item.bookingId})`);
            if (!storage.tombstones.schedule_items) storage.tombstones.schedule_items = {};
            storage.tombstones.schedule_items[item.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });

        // Cascade to caddies tied to deleted bookings
        storage.caddies.forEach(caddy => {
          if (caddy.bookingId && deletedBookingIds.has(caddy.bookingId)) {
            console.log(`[CASCADE] Tombstoning caddy ${caddy.id} (orphaned by booking ${caddy.bookingId})`);
            if (!storage.tombstones.caddies) storage.tombstones.caddies = {};
            storage.tombstones.caddies[caddy.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });

        // Cascade to waitlist items tied to deleted bookings
        storage.waitlist.forEach(item => {
          if (item.bookingId && deletedBookingIds.has(item.bookingId)) {
            console.log(`[CASCADE] Tombstoning waitlist item ${item.id} (orphaned by booking ${item.bookingId})`);
            if (!storage.tombstones.waitlist) storage.tombstones.waitlist = {};
            storage.tombstones.waitlist[item.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });

        // Remove all tombstoned items after cascade
        storage.schedule_items = storage.schedule_items.filter(item => {
          const tombstone = storage.tombstones.schedule_items?.[item.id];
          return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
        });

        storage.caddies = storage.caddies.filter(item => {
          const tombstone = storage.tombstones.caddies?.[item.id];
          return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
        });

        storage.waitlist = storage.waitlist.filter(item => {
          const tombstone = storage.tombstones.waitlist?.[item.id];
          return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
        });

        // Note: In a real system, you'd also cascade waitlist items, caddy assignments, etc.
        // For now, focusing on schedule_items as the main cascade relationship
      }

      // Update metadata with server timestamp
      storage.version = (storage.version || 0) + 1;
      storage.updatedAt = serverNow;
      storage.serverUpdatedAt = new Date(serverNow).toISOString();

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

      // REFERENTIAL INTEGRITY: Validate cross-references
      const validBookingIds = new Set(storage.bookings.map(b => b.id));

      // Tombstone items that reference non-existent bookings
      [
        {array: storage.schedule_items, type: 'schedule_items'},
        {array: storage.caddies, type: 'caddies'},
        {array: storage.waitlist, type: 'waitlist'}
      ].forEach(({array, type}) => {
        array.forEach(item => {
          if (item.bookingId && !validBookingIds.has(item.bookingId)) {
            console.log(`[INTEGRITY] Orphaned ${type} item ${item.id} references missing booking ${item.bookingId}`);
            if (!storage.tombstones[type]) storage.tombstones[type] = {};
            storage.tombstones[type][item.id] = {
              deleted: true,
              updatedAt: serverNow
            };
          }
        });
      });

      // Re-filter all arrays after integrity check
      storage.schedule_items = storage.schedule_items.filter(item => {
        const tombstone = storage.tombstones.schedule_items?.[item.id];
        return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
      });

      storage.caddies = storage.caddies.filter(item => {
        const tombstone = storage.tombstones.caddies?.[item.id];
        return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
      });

      storage.waitlist = storage.waitlist.filter(item => {
        const tombstone = storage.tombstones.waitlist?.[item.id];
        return !tombstone || !tombstone.deleted || item.updatedAt > tombstone.updatedAt;
      });

      console.log('PUT request - merged data:', {
        bookings: storage.bookings.length,
        profiles: storage.user_profiles.length,
        schedules: storage.schedule_items.length,
        alerts: storage.emergency_alerts.length,
        version: storage.version
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          version: storage.version,
          updatedAt: storage.updatedAt,
          mergedData: storage // Return full merged state
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
      body: JSON.stringify({
        error: 'Function error',
        message: err && err.message ? err.message : String(err)
      })
    };
  }
};