// Supabase Edge Function: send-line-scorecard
// Sends golf scorecard data to external LINE accounts via LINE Messaging API

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");

const supabase = createClient(SUPABASE_URL || "", SUPABASE_ANON_KEY || "", {
  global: { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
});

/**
 * Send a text message to a LINE user via LINE Messaging API
 * @param userId - LINE User ID (starts with U, 33 characters)
 * @param message - Text message to send
 * @returns Response from LINE API
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
  // CORS headers for browser requests
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { recipientUserId, message } = await req.json();

    // Validate input
    if (!recipientUserId || typeof recipientUserId !== "string") {
      return new Response(
        JSON.stringify({ error: "recipientUserId is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message is required and must be a string" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate LINE User ID format
    if (!recipientUserId.startsWith("U") || recipientUserId.length !== 33) {
      return new Response(
        JSON.stringify({
          error: "Invalid LINE User ID format (must start with U and be 33 characters)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate message length (LINE API limit is 5000 characters)
    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Message too long (max 5000 characters)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[send-line-scorecard] Sending scorecard to LINE User: ${recipientUserId.substring(0, 8)}...`
    );

    // Send message via LINE API
    const lineResponse = await sendLINEMessage(recipientUserId, message);

    console.log(
      `[send-line-scorecard] Successfully sent scorecard to ${recipientUserId.substring(0, 8)}...`
    );

    // Optional: Log the export to database for tracking
    try {
      await supabase.from("scorecard_exports").insert({
        recipient_user_id: recipientUserId,
        message_length: message.length,
        exported_at: new Date().toISOString(),
        platform: "LINE",
      });
    } catch (dbError) {
      // Non-critical error - log but don't fail the request
      console.warn("[send-line-scorecard] Failed to log export:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        lineResponse,
        message: "Scorecard sent successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[send-line-scorecard] Error:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
