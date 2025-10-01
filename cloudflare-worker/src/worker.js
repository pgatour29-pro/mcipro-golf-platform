/**
 * Cloudflare Worker for MciPro Golf Platform Real-time Sync
 */

const ALLOWED_ORIGINS = [
    'https://mcipro-golf-platform.netlify.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const origin = request.headers.get('Origin');

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return handleCORS(origin);
        }

        // Validate API key for non-health endpoints
        if (url.pathname !== '/health') {
            const apiKey = request.headers.get('X-API-Key');
            if (apiKey !== env.API_KEY) {
                return new Response('Unauthorized', { status: 401 });
            }
        }

        // Route requests
        if (url.pathname === '/health') {
            return handleHealth(origin);
        }

        if (url.pathname.startsWith('/sync/users/')) {
            const userPath = url.pathname.replace('/sync/', '');

            if (request.method === 'PUT') {
                return handleSaveUserData(userPath, request, origin, env);
            } else if (request.method === 'GET') {
                return handleGetUserData(userPath, origin, env);
            }
        }

        if (url.pathname === '/global/emergency-alerts') {
            if (request.method === 'PUT') {
                return handleSaveGlobalAlerts(request, origin, env);
            } else if (request.method === 'GET') {
                return handleGetGlobalAlerts(origin, env);
            }
        }

        return new Response('Not Found', { status: 404 });
    }
};

function handleCORS(origin) {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
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
        version: '1.0.0',
        service: 'MciPro Golf Sync'
    };

    return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        },
    });
}

async function handleSaveUserData(userPath, request, origin, env) {
    try {
        const userData = await request.json();
        userData.server_timestamp = new Date().toISOString();
        userData.sync_source = 'cloudflare_worker';

        // Save to KV store with 30-day TTL
        await env.MCIPRO_SYNC.put(userPath, JSON.stringify(userData), {
            expirationTtl: 30 * 24 * 60 * 60
        });

        console.log(`[MciPro] Saved data for: ${userPath}`);

        return new Response(JSON.stringify({
            success: true,
            user_path: userPath,
            timestamp: userData.server_timestamp
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            },
        });

    } catch (error) {
        console.error('[MciPro] Save error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to save data',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            },
        });
    }
}

async function handleGetUserData(userPath, origin, env) {
    try {
        const userData = await env.MCIPRO_SYNC.get(userPath);

        if (!userData) {
            return new Response(JSON.stringify({
                error: 'User data not found',
                user_path: userPath
            }), {
                status: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                },
            });
        }

        const parsedData = JSON.parse(userData);
        console.log(`[MciPro] Retrieved data for: ${userPath}`);

        return new Response(JSON.stringify(parsedData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('[MciPro] Get error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve data',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            },
        });
    }
}

async function handleSaveGlobalAlerts(request, origin, env) {
    try {
        const alertsData = await request.json();
        alertsData.server_timestamp = new Date().toISOString();
        alertsData.sync_source = 'cloudflare_worker';

        // Save to KV store with property-specific key for location-based alerts
        const propertyKey = `global_emergency_alerts_${alertsData.property_id || 'default'}`;
        await env.MCIPRO_SYNC.put(propertyKey, JSON.stringify(alertsData), {
            expirationTtl: 7 * 24 * 60 * 60
        });

        console.log(`[MciPro] Saved global emergency alerts for ${alertsData.property_name || 'property'}: ${alertsData.alerts?.length || 0} alerts`);

        return new Response(JSON.stringify({
            success: true,
            property_id: alertsData.property_id,
            alert_count: alertsData.alerts?.length || 0,
            timestamp: alertsData.server_timestamp
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            },
        });

    } catch (error) {
        console.error('[MciPro] Global alerts save error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to save global alerts',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            },
        });
    }
}

async function handleGetGlobalAlerts(origin, env) {
    try {
        // For now, check default property - in production this would use property_id from query params
        const propertyKey = 'global_emergency_alerts_default';
        const alertsData = await env.MCIPRO_SYNC.get(propertyKey);

        if (!alertsData) {
            return new Response(JSON.stringify({
                alerts: [],
                message: 'No global alerts found'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                },
            });
        }

        const parsedData = JSON.parse(alertsData);
        console.log(`[MciPro] Retrieved global emergency alerts: ${parsedData.alerts?.length || 0} alerts`);

        return new Response(JSON.stringify(parsedData), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Cache-Control': 'no-cache',
            },
        });

    } catch (error) {
        console.error('[MciPro] Global alerts get error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to retrieve global alerts',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : '*',
                'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
            },
        });
    }
}