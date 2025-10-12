// supabaseClient.js — robust client getter for the chat system
let _client = null;
let _ready = null;

function waitForSupabaseDB(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (window.SupabaseDB?.client) return resolve(window.SupabaseDB.client);
      if (Date.now() - start > timeoutMs) return reject(new Error('SupabaseDB not found on window within timeout'));
      setTimeout(check, 100);
    }
    check();
  });
}

async function createLocalClientIfPossible() {
  const url = window.SUPABASE_URL || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL);
  const key = window.SUPABASE_ANON_KEY || (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!url || !key) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  return createClient(url, key);
}

export async function getSupabaseClient() {
  if (_client) return _client;
  if (!_ready) {
    _ready = (async () => {
      try {
        _client = await waitForSupabaseDB();
        console.log('[Chat] Using window.SupabaseDB.client');
        return _client;
      } catch {
        const fallback = await createLocalClientIfPossible();
        if (!fallback) throw new Error('[Chat] Supabase client not found. Provide window.SupabaseDB.client OR set SUPABASE_URL/ANON_KEY.');
        _client = fallback;
        console.log('[Chat] Using local Supabase client (env-based)');
        return _client;
      }
    })();
  }
  return _ready;
}

export const supabase = new Proxy({}, {
  get(_t, prop) {
    return async (...args) => {
      const c = await getSupabaseClient();
      const v = c[prop];
      return typeof v === 'function' ? v.apply(c, args) : v;
    };
  },
});
