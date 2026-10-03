// In-page write guard. A persona may READ the live platform freely; any write to a live table or a
// write-shaped RPC is refused with 403 and recorded in window.__personaBlocked. Telemetry tables stay
// open (they are skipped for webdriver sessions anyway). The guard is re-armed after every navigation.
export const GUARD_JS = `(function(){
    if (window.__personaGuard) return 'armed';
    window.__personaBlocked = [];
    var RW = /(write|put|claim|set_|save|insert|update|delete|create|register|book|move|send|cancel|leave|assign|finish|start_|post|submit|mark|add_|remove|merge|upload|burn|checkin|sweep)/i;
    var ALLOW_TABLES = { client_errors: 1, app_section_views: 1 };
    var realFetch = window.fetch;
    window.fetch = function (input, init) {
        try {
            var url = (typeof input === 'string') ? input : ((input && input.url) || '');
            var m = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
            if (/supabase\\.co\\/(rest|storage|functions)\\//.test(url) && m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
                var rpc = /\\/rest\\/v1\\/rpc\\/([a-z0-9_]+)/i.exec(url);
                var tbl = /\\/rest\\/v1\\/([a-z0-9_]+)/i.exec(url);
                var body = (init && typeof init.body === 'string') ? init.body : '';
                var dmRead = /functions\\/v1\\/secure-dm/.test(url) && /"action":"(read|read_conversation|unread_count|list|count)"/.test(body);
                var ok = (tbl && ALLOW_TABLES[tbl[1]]) || (rpc && !RW.test(rpc[1])) || dmRead;
                if (!ok) {
                    window.__personaBlocked.push({ m: m, url: url.slice(0, 200), at: new Date().toISOString() });
                    return Promise.resolve(new Response('{"error":"persona write guard"}', { status: 403, headers: { 'content-type': 'application/json' } }));
                }
            }
        } catch (e) {}
        return realFetch.apply(this, arguments);
    };
    window.__personaGuard = true;
    return 'armed';
})()`;
