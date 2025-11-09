// Supabase Edge Function: notify-caddy-booking
// Sends LINE notifications when caddy bookings are approved/denied

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

const supabase = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

/**
 * Send a text message to a LINE user via LINE Messaging API
 */
async function sendLINEMessage(userId: string, message: string) {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN not configured");
  }

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[LINE API Error]", errorText);
    throw new Error(`LINE API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, action } = await req.json();

    if (!bookingId) {
      return new Response(
        JSON.stringify({ error: "bookingId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["approved", "denied"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'approved' or 'denied'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking details with caddy info
    const { data: booking, error: bookingError } = await supabase
      .from("caddy_bookings")
      .select(`
        *,
        caddies:caddy_id (
          name,
          caddy_number
        )
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get golfer's LINE User ID from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("line_user_id, name")
      .eq("line_user_id", booking.golfer_id)
      .single();

    if (profileError || !profile?.line_user_id) {
      console.warn(`[notify-caddy-booking] No LINE ID found for golfer: ${booking.golfer_id}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: "Golfer not registered with LINE"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date and time
    const bookingDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Build notification message
    let message = "";
    if (action === "approved") {
      message = `✅ Caddy Booking Confirmed!\n\n` +
        `Your caddy booking has been approved by ${booking.course_name}.\n\n` +
        `📅 Date: ${bookingDate}\n` +
        `⏰ Tee Time: ${booking.tee_time || 'TBD'}\n` +
        `🏌️ Holes: ${booking.holes}\n` +
        `👤 Caddy: ${booking.caddies?.name || 'TBD'} (#${booking.caddies?.caddy_number || '?'})\n\n` +
        `See you on the course! 🎯`;
    } else {
      message = `❌ Caddy Booking Declined\n\n` +
        `Unfortunately, your caddy booking request could not be approved.\n\n` +
        `📅 Date: ${bookingDate}\n` +
        `⏰ Tee Time: ${booking.tee_time || 'TBD'}\n` +
        `📍 Course: ${booking.course_name}\n\n` +
        `Please try booking another caddy or contact the golf course for assistance. 🏌️`;
    }

    // Send LINE notification
    console.log(`[notify-caddy-booking] Sending ${action} notification to ${profile.line_user_id.substring(0,8)}...`);

    const lineResponse = await sendLINEMessage(profile.line_user_id, message);

    console.log(`[notify-caddy-booking] ✅ Sent ${action} notification for booking ${bookingId}`);

    // Log notification to database (optional)
    try {
      await supabase.from("notification_log").insert({
        booking_id: bookingId,
        recipient_user_id: profile.line_user_id,
        notification_type: `caddy_booking_${action}`,
        sent_at: new Date().toISOString(),
        platform: "LINE"
      });
    } catch (logError) {
      console.warn("[notify-caddy-booking] Failed to log notification:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification sent to ${profile.name}`,
        lineResponse
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[notify-caddy-booking] Error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
