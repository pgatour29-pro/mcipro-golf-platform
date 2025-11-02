// Event Registration Edge Function - SIMPLIFIED
// Uses LINE user ID directly as player_id (TEXT column)
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LINE_CHANNEL_ID = Deno.env.get("LINE_CHANNEL_ID") || "2008228481";

const supaAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false }});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}

// Simple LINE id_token parser (extracts sub without full JWT verification)
function parseLineIdToken(idToken: string) {
  try {
    const [, payload] = idToken.split('.');
    if (!payload) throw new Error('Invalid token format');

    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);

    if (parsed.aud !== LINE_CHANNEL_ID) {
      throw new Error(`Invalid audience: ${parsed.aud}`);
    }
    if (!parsed.sub) {
      throw new Error('Missing subject');
    }

    return {
      ok: true,
      line_user_id: parsed.sub,
      name: parsed.name || 'User'
    };
  } catch (e) {
    return {
      ok: false,
      detail: `Token parse failed: ${e.message}`
    };
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: CORS });
    }

    if (req.method !== "POST") {
      return json({ ok: false, where: "method", detail: "POST required" }, 405);
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { id_token, event_id, want_transport, want_competition, total_fee, payment_status } = body;

    if (!id_token) {
      return json({ ok: false, where: "auth", detail: "missing id_token in request body" }, 400);
    }

    if (!event_id) {
      return json({ ok: false, where: "validate", detail: "missing event_id" }, 400);
    }

    // Parse LINE id_token to get user ID
    const tokenResult = parseLineIdToken(id_token);
    if (!tokenResult.ok) {
      return json({ ok: false, where: "verify", detail: tokenResult.detail }, 401);
    }

    const { line_user_id, name } = tokenResult;

    // Get user profile for additional info
    const { data: profile } = await supaAdmin
      .from('user_profiles')
      .select('profile_data')
      .eq('line_user_id', line_user_id)
      .maybeSingle();

    const profileData = profile?.profile_data || {};
    const userName = `${profileData?.personalInfo?.firstName || ''} ${profileData?.personalInfo?.lastName || ''}`.trim() || name;

    // Check if already registered
    const { data: existing } = await supaAdmin
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('player_id', line_user_id)
      .maybeSingle();

    if (existing) {
      return json({ ok: false, where: "duplicate", detail: "Already registered for this event" }, 409);
    }

    // Validate payment status - match database CHECK constraint
    // Database allows: 'pending', 'paid', 'failed', 'refunded'
    const allowed = new Set(['pending', 'paid', 'failed', 'refunded']);
    const finalStatus = allowed.has(payment_status) ? payment_status : 'pending';

    // Insert registration
    const payload = {
      id: crypto.randomUUID(),
      event_id,
      player_id: line_user_id,  // TEXT column - use LINE user ID directly
      player_name: userName,
      want_transport: !!want_transport,
      want_competition: !!want_competition,
      total_fee: Number(total_fee) || 0,
      payment_status: finalStatus,
    };

    console.log('[EventRegister] Inserting:', JSON.stringify(payload, null, 2));

    const { data, error } = await supaAdmin
      .from('event_registrations')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('[EventRegister] Insert error:', error);
      return json({
        ok: false,
        where: "insert",
        detail: error.message,
        hint: error.hint,
        code: error.code
      }, 400);
    }

    console.log('[EventRegister] ✅ Success:', data.id);

    return json({
      ok: true,
      id: data.id,
      message: `Successfully registered ${userName}`
    }, 201);

  } catch (e) {
    console.error('[EventRegister] UNCAUGHT:', e);
    return json({
      ok: false,
      where: "uncaught",
      detail: String(e.message || e)
    }, 500);
  }
});
