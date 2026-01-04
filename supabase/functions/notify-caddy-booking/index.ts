// Caddy Booking Notification Edge Function
// Sends LINE push notifications for caddy booking events
// Actions: new_booking, approved, denied, cancelled, time_changed, waitlist_added, waitlist_promoted

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface BookingNotification {
  action: "new_booking" | "approved" | "denied" | "cancelled" | "time_changed" | "waitlist_added" | "waitlist_promoted";
  booking: {
    id: string;
    caddyId?: string;
    caddyName?: string;
    caddyLocalName?: string;
    golferId?: string;
    golferName?: string;
    date: string;
    time: string;
    course: string;
    courseDisplay?: string;
    oldTime?: string; // For time_changed action
    position?: number; // For waitlist_added
  };
}

interface LineMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: object;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req) => {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const payload: BookingNotification = await req.json();
    console.log("[Caddy Notify] Received:", payload.action, "booking:", payload.booking?.id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let result;

    switch (payload.action) {
      case "new_booking":
        result = await handleNewBooking(supabase, payload.booking);
        break;
      case "approved":
        result = await handleApproved(supabase, payload.booking);
        break;
      case "denied":
        result = await handleDenied(supabase, payload.booking);
        break;
      case "cancelled":
        result = await handleCancelled(supabase, payload.booking);
        break;
      case "time_changed":
        result = await handleTimeChanged(supabase, payload.booking);
        break;
      case "waitlist_added":
        result = await handleWaitlistAdded(supabase, payload.booking);
        break;
      case "waitlist_promoted":
        result = await handleWaitlistPromoted(supabase, payload.booking);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Caddy Notify] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// NEW BOOKING - Notify caddy of new booking request
// ============================================================================
async function handleNewBooking(supabase: any, booking: any) {
  console.log("[Caddy Notify] New booking for caddy:", booking.caddyName);

  // Get caddy's LINE ID from caddy record
  const caddyLineId = await getCaddyLineId(supabase, booking.caddyId);
  if (!caddyLineId) {
    console.log("[Caddy Notify] Caddy has no LINE ID");
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const formattedDate = formatDate(booking.date);
  const courseName = booking.courseDisplay || booking.course;

  const message: LineMessage = {
    type: "flex",
    altText: "New Caddy Booking Request",
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "🎒 NEW BOOKING", color: "#FFFFFF", size: "sm", weight: "bold" },
          { type: "text", text: "Caddy Request", color: "#FFFFFF", size: "xl", weight: "bold", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "Golfer: " + (booking.golferName || "Unknown"), size: "md", weight: "bold" },
          { type: "text", text: "📅 " + formattedDate, size: "sm", color: "#666666", margin: "md" },
          { type: "text", text: "⏰ " + booking.time, size: "sm", color: "#666666" },
          { type: "text", text: "📍 " + courseName, size: "sm", color: "#666666", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "View in App", uri: "https://mycaddipro.com" },
            style: "primary",
            color: "#10B981",
          },
        ],
      },
    },
  };

  const sent = await sendPushMessage(caddyLineId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// APPROVED - Notify golfer that booking is confirmed
// ============================================================================
async function handleApproved(supabase: any, booking: any) {
  console.log("[Caddy Notify] Booking approved for golfer:", booking.golferName);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    console.log("[Caddy Notify] Golfer has no LINE ID");
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const messagingId = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date);

  const message: LineMessage = {
    type: "text",
    text: "✅ Caddy Booking Confirmed!\n\n" +
      "Caddy: " + (booking.caddyLocalName || booking.caddyName) + "\n" +
      "📅 " + formattedDate + "\n" +
      "⏰ " + booking.time + "\n" +
      "📍 " + (booking.courseDisplay || booking.course) + "\n\n" +
      "Your caddy is confirmed. See you on the course!",
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// DENIED - Notify golfer that booking was declined
// ============================================================================
async function handleDenied(supabase: any, booking: any) {
  console.log("[Caddy Notify] Booking denied for golfer:", booking.golferName);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const messagingId = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date);

  const message: LineMessage = {
    type: "text",
    text: "❌ Caddy Booking Declined\n\n" +
      "We're sorry, but " + (booking.caddyName || "the caddy") + " is not available for:\n" +
      "📅 " + formattedDate + "\n" +
      "⏰ " + booking.time + "\n\n" +
      "Please try booking a different caddy or time.",
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// CANCELLED - Notify both caddy and golfer
// ============================================================================
async function handleCancelled(supabase: any, booking: any) {
  console.log("[Caddy Notify] Booking cancelled:", booking.id);

  let notified = 0;
  const formattedDate = formatDate(booking.date);

  // Notify caddy
  const caddyLineId = await getCaddyLineId(supabase, booking.caddyId);
  if (caddyLineId) {
    const caddyMessage: LineMessage = {
      type: "text",
      text: "🚫 Booking Cancelled\n\n" +
        "Golfer: " + (booking.golferName || "Unknown") + "\n" +
        "📅 " + formattedDate + "\n" +
        "⏰ " + booking.time + "\n" +
        "📍 " + (booking.courseDisplay || booking.course) + "\n\n" +
        "This booking has been cancelled.",
    };
    const caddySent = await sendPushMessage(caddyLineId, [caddyMessage]);
    if (caddySent) notified++;
  }

  // Notify golfer
  if (booking.golferId?.startsWith("U")) {
    const golferMessagingId = await getMessagingUserId(supabase, booking.golferId);
    const golferMessage: LineMessage = {
      type: "text",
      text: "🚫 Caddy Booking Cancelled\n\n" +
        "Your caddy booking has been cancelled:\n" +
        "Caddy: " + (booking.caddyLocalName || booking.caddyName) + "\n" +
        "📅 " + formattedDate + "\n" +
        "⏰ " + booking.time,
    };
    const golferSent = await sendPushMessage(golferMessagingId, [golferMessage]);
    if (golferSent) notified++;
  }

  return { success: true, notified };
}

// ============================================================================
// TIME CHANGED - Notify both parties of new time
// ============================================================================
async function handleTimeChanged(supabase: any, booking: any) {
  console.log("[Caddy Notify] Time changed:", booking.oldTime, "->", booking.time);

  let notified = 0;
  const formattedDate = formatDate(booking.date);

  // Notify caddy
  const caddyLineId = await getCaddyLineId(supabase, booking.caddyId);
  if (caddyLineId) {
    const caddyMessage: LineMessage = {
      type: "text",
      text: "⏰ Tee Time Changed\n\n" +
        "Golfer: " + (booking.golferName || "Unknown") + "\n" +
        "📅 " + formattedDate + "\n" +
        "Old time: " + booking.oldTime + "\n" +
        "New time: " + booking.time + "\n" +
        "📍 " + (booking.courseDisplay || booking.course),
    };
    const caddySent = await sendPushMessage(caddyLineId, [caddyMessage]);
    if (caddySent) notified++;
  }

  // Notify golfer
  if (booking.golferId?.startsWith("U")) {
    const golferMessagingId = await getMessagingUserId(supabase, booking.golferId);
    const golferMessage: LineMessage = {
      type: "text",
      text: "⏰ Your Tee Time Changed\n\n" +
        "Caddy: " + (booking.caddyLocalName || booking.caddyName) + "\n" +
        "📅 " + formattedDate + "\n" +
        "Old time: " + booking.oldTime + "\n" +
        "New time: " + booking.time,
    };
    const golferSent = await sendPushMessage(golferMessagingId, [golferMessage]);
    if (golferSent) notified++;
  }

  return { success: true, notified };
}

// ============================================================================
// WAITLIST ADDED - Notify golfer they're on waitlist
// ============================================================================
async function handleWaitlistAdded(supabase: any, booking: any) {
  console.log("[Caddy Notify] Waitlist added, position:", booking.position);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const messagingId = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date);

  const message: LineMessage = {
    type: "text",
    text: "📋 Added to Waitlist\n\n" +
      "You're on the waitlist for:\n" +
      "Caddy: " + (booking.caddyLocalName || booking.caddyName) + "\n" +
      "📅 " + formattedDate + "\n" +
      "⏰ " + booking.time + "\n\n" +
      "Position: #" + (booking.position || 1) + "\n\n" +
      "We'll notify you if a spot opens up!",
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// WAITLIST PROMOTED - Notify golfer a spot is available
// ============================================================================
async function handleWaitlistPromoted(supabase: any, booking: any) {
  console.log("[Caddy Notify] Waitlist promoted for:", booking.golferName);

  const golferLineId = booking.golferId;
  if (!golferLineId?.startsWith("U")) {
    return { success: true, notified: 0, reason: "no_line_id" };
  }

  const messagingId = await getMessagingUserId(supabase, golferLineId);
  const formattedDate = formatDate(booking.date);

  const message: LineMessage = {
    type: "flex",
    altText: "Caddy Spot Available!",
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "🎉 SPOT AVAILABLE!", color: "#FFFFFF", size: "lg", weight: "bold" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: "Great news! A spot opened up.", size: "sm", wrap: true },
          { type: "text", text: "Caddy: " + (booking.caddyLocalName || booking.caddyName), size: "md", weight: "bold", margin: "md" },
          { type: "text", text: "📅 " + formattedDate, size: "sm", color: "#666666" },
          { type: "text", text: "⏰ " + booking.time, size: "sm", color: "#666666" },
          { type: "text", text: "📍 " + (booking.courseDisplay || booking.course), size: "sm", color: "#666666", wrap: true },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "Confirm Booking", uri: "https://mycaddipro.com" },
            style: "primary",
            color: "#10B981",
          },
        ],
      },
    },
  };

  const sent = await sendPushMessage(messagingId, [message]);
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getCaddyLineId(supabase: any, caddyId: string): Promise<string | null> {
  if (!caddyId) return null;

  // First check caddy_profiles table
  const { data: caddy } = await supabase
    .from("caddy_profiles")
    .select("line_user_id, messaging_user_id")
    .eq("id", caddyId)
    .single();

  if (caddy?.messaging_user_id?.startsWith("U")) {
    return caddy.messaging_user_id;
  }
  if (caddy?.line_user_id?.startsWith("U")) {
    return caddy.line_user_id;
  }

  // Fall back to user_profiles if caddy has a linked profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .eq("caddy_id", caddyId)
    .single();

  if (profile?.messaging_user_id?.startsWith("U")) {
    return profile.messaging_user_id;
  }
  if (profile?.line_user_id?.startsWith("U")) {
    return profile.line_user_id;
  }

  return null;
}

async function getMessagingUserId(supabase: any, lineUserId: string): Promise<string> {
  if (!lineUserId?.startsWith("U")) return lineUserId;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("messaging_user_id")
    .eq("line_user_id", lineUserId)
    .single();

  return profile?.messaging_user_id || lineUserId;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

async function sendPushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
  if (!userId?.startsWith("U")) {
    console.log("[Caddy Notify] Invalid user ID:", userId);
    return false;
  }

  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("[Caddy Notify] LINE_CHANNEL_ACCESS_TOKEN not set");
    return false;
  }

  try {
    const response = await fetch(LINE_MESSAGING_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + LINE_CHANNEL_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        to: userId,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Caddy Notify] LINE API error:", response.status, errorText);
      return false;
    }

    console.log("[Caddy Notify] ✅ Sent to", userId);
    return true;
  } catch (error) {
    console.error("[Caddy Notify] Send error:", error);
    return false;
  }
}
