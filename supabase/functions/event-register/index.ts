// Event Registration Edge Function - Bypasses RLS using service role
// Handles LINE OAuth users who don't have Supabase Auth sessions

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LINE_CHANNEL_ID = Deno.env.get('LINE_CHANNEL_ID') || '2008228481';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (b: any, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface RegistrationRequest {
  id_token: string;   // LINE id_token from OAuth exchange
  event_id: string;   // UUID from society_events.id
  want_transport?: boolean;
  want_competition?: boolean;
  total_fee: number;
  payment_status?: string;
}

// Minimal LINE id_token validation (production should verify with LINE JWKs)
function parseLineIdToken(id_token: string) {
  try {
    const [, payload] = id_token.split('.');
    if (!payload) throw new Error('Invalid token format');

    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded);

    if (parsed.aud !== LINE_CHANNEL_ID) {
      throw new Error('Invalid LINE audience');
    }
    if (!parsed.sub) {
      throw new Error('Missing subject');
    }

    return { line_user_id: parsed.sub, name: parsed.name || '', picture: parsed.picture || '' };
  } catch (error) {
    throw new Error(`Invalid id_token: ${error.message}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return json('ok', 200);
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const body: RegistrationRequest = await req.json();
    const { id_token, event_id, want_transport, want_competition, total_fee, payment_status } = body;

    // Validate required fields
    if (!id_token || !event_id) {
      return json({ error: 'Missing required fields: id_token and event_id' }, 400);
    }

    // Validate and extract LINE user ID from id_token
    const { line_user_id } = parseLineIdToken(id_token);

    // Create service role client (bypasses RLS)
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false }
    });

    // Map LINE user ID to internal UUID via user_profiles table
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('id, profile_data')
      .eq('line_user_id', line_user_id)
      .maybeSingle();

    if (profileError) {
      return json({ error: `Database error: ${profileError.message}` }, 500);
    }

    if (!profile) {
      return json({ error: 'User profile not found. Please complete onboarding first.' }, 404);
    }

    const user_uuid = profile.id;
    const profileData = profile.profile_data || {};
    const userName = `${profileData?.personalInfo?.firstName || ''} ${profileData?.personalInfo?.lastName || ''}`.trim() || 'User';

    // Verify event exists
    const { data: event, error: eventError } = await admin
      .from('society_events')
      .select('id, name, status')
      .eq('id', event_id)
      .maybeSingle();

    if (eventError) {
      return json({ error: `Database error: ${eventError.message}` }, 500);
    }

    if (!event) {
      return json({ error: 'Event not found' }, 404);
    }

    // Get user's handicap from profile
    const handicap = profileData?.golfInfo?.handicap ? parseFloat(profileData.golfInfo.handicap) : 0;

    // Check if already registered
    const { data: existing } = await admin
      .from('event_registrations')
      .select('id')
      .eq('event_id', event_id)
      .eq('player_id', user_uuid)
      .maybeSingle();

    if (existing) {
      return json({ error: 'Already registered for this event' }, 409);
    }

    // Validate payment status (map 'pending' to 'unpaid' to match DB constraint)
    const statusMap: Record<string, string> = {
      'pending': 'unpaid',
      'unpaid': 'unpaid',
      'paid': 'paid',
      'partial': 'partial'
    };
    const final_status = statusMap[payment_status || ''] || 'unpaid';

    // Generate unique ID for registration
    const regId = crypto.randomUUID();

    // Insert registration
    const payload = {
      id: regId,
      event_id,
      player_id: user_uuid,
      player_name: userName,
      handicap,
      want_transport: !!want_transport,
      want_competition: !!want_competition,
      total_fee: Number(total_fee) || 0,
      payment_status: final_status
    };

    const { error } = await admin
      .from('event_registrations')
      .insert(payload);

    if (error) {
      console.error('[EventRegister] Insert error:', error);
      return json({ error: `Database error: ${error.message}` }, 500);
    }

    console.log('[EventRegister] Success:', {
      registrationId: regId,
      lineUserId: line_user_id,
      userUuid: user_uuid,
      eventId: event_id,
      profileName: userName,
      eventName: event.name
    });

    return json({
      ok: true,
      id: regId,
      message: `Successfully registered ${userName} for ${event.name}`
    }, 201);

  } catch (error) {
    console.error('[EventRegister] Error:', error);
    return json({ error: String(error?.message ?? error) }, 500);
  }
});
