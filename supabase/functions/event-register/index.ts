// Event Registration Edge Function - Bypasses RLS using service role
// Handles LINE OAuth users who don't have Supabase Auth sessions

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationRequest {
  profileId: string;  // UUID from profiles.id
  eventId: string;    // UUID from society_events.id
  wantTransport?: boolean;
  wantCompetition?: boolean;
  totalFee: number;
  paymentStatus?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RegistrationRequest = await req.json();
    const { profileId, eventId, wantTransport, wantCompetition, totalFee, paymentStatus } = body;

    // Validate required fields
    if (!profileId || !eventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: profileId and eventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(profileId) || !uuidRegex.test(eventId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid UUID format for profileId or eventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false }
    });

    // Verify profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify event exists
    const { data: event, error: eventError } = await supabase
      .from('society_events')
      .select('id, name, status')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already registered
    const { data: existing } = await supabase
      .from('event_registrations')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', profileId)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Already registered for this event' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate payment status
    const validStatuses = ['unpaid', 'pending', 'paid', 'partial', 'refunded', 'comped'];
    const finalStatus = validStatuses.includes(paymentStatus || '') ? paymentStatus : 'pending';

    // Insert registration
    const payload = {
      event_id: eventId,
      user_id: profileId,
      want_transport: wantTransport || false,
      want_competition: wantCompetition || false,
      total_fee: Number(totalFee) || 0,
      payment_status: finalStatus,
      status: 'confirmed'
    };

    const { data, error } = await supabase
      .from('event_registrations')
      .insert(payload)
      .select('id, created_at')
      .single();

    if (error) {
      console.error('[EventRegister] Insert error:', error);
      return new Response(
        JSON.stringify({ error: `Database error: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[EventRegister] Success:', {
      registrationId: data.id,
      profileId,
      eventId,
      profileName: profile.name,
      eventName: event.name
    });

    return new Response(
      JSON.stringify({
        ok: true,
        id: data.id,
        created_at: data.created_at,
        message: `Successfully registered ${profile.name} for ${event.name}`
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[EventRegister] Error:', error);
    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
