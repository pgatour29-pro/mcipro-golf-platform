/**
 * Cloudflare Worker for MciPro Golf Platform Real-time Sync
 * Deploy this to your Cloudflare account (pgatour29@gmail.com)
 * Worker URL: https://mcipro-sync.pgatour29.workers.dev
 */

// Environment variables - set these in Cloudflare Dashboard
const API_KEY = 'mcipro-sync-key-2024';
const ALLOWED_ORIGINS = [
    'https://mcipro-golf-platform.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// KV namespace for data storage (create in Cloudflare Dashboard)
// Bind KV namespace "MCIPRO_SYNC" to this worker

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return handleCORS(origin);
    }

    // Validate origin
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response('Forbidden', { status: 403 });
    }

    // Validate API key
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey !== API_KEY) {
        return new Response('Unauthorized', { status: 401 });
    }

    // Route requests
    if (url.pathname === '/health') {
        return handleHealth(origin);
    }

    if (url.pathname.startsWith('/sync/users/')) {
        const userPath = url.pathname.replace('/sync/', '');

        if (request.method === 'PUT') {
            return handleSaveUserData(userPath, request, origin);
        } else if (request.method === 'GET') {
            return handleGetUserData(userPath, origin);
        }
    }

    return new Response('Not Found', { status: 404 });
}

function handleCORS(origin) {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
            'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            'Access-Control-Max-Age': '86400',
        },
    });
}

function handleHealth(origin) {
    const response = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        },
    });
}

async function handleSaveUserData(userPath, request, origin) {
    try {
        const userData = await request.json();

        // Add server timestamp
        userData.server_timestamp = new Date().toISOString();
        userData.sync_source = 'cloudflare_worker';

        // Save to KV store with TTL of 30 days
        await MCIPRO_SYNC.put(userPath, JSON.stringify(userData), {
            expirationTtl: 30 * 24 * 60 * 60 // 30 days
        });

        console.log(`[CloudflareWorker] Saved data for user: ${userPath}`);

        const response = {
            success: true,
            user_path: userPath,
            timestamp: userData.server_timestamp
        };

        return new Response(JSON.stringify(response), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
            },
        });

    } catch (error) {
        console.error('[CloudflareWorker] Save error:', error);

        return new Response(JSON.stringify({
            error: 'Failed to save data',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
            },
        });
    }
}

async function handleGetUserData(userPath, origin) {
    try {
        const userData = await MCIPRO_SYNC.get(userPath);

        if (!userData) {
            return new Response(JSON.stringify({
                error: 'User data not found',
                user_path: userPath
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
                },
            });
        }

        const parsedData = JSON.parse(userData);
        console.log(`[CloudflareWorker] Retrieved data for user: ${userPath}`);

        return new Response(JSON.stringify(parsedData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        });

    } catch (error) {
        console.error('[CloudflareWorker] Get error:', error);

        return new Response(JSON.stringify({
            error: 'Failed to retrieve data',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
            },
        });
    }
}