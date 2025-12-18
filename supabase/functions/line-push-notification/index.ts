// LINE Push Notification Edge Function
// Sends push messages to users via LINE Messaging API
// Triggered by database webhooks when events/messages are created

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LINE_MESSAGING_API = "https://api.line.me/v2/bot/message/push";
const LINE_MULTICAST_API = "https://api.line.me/v2/bot/message/multicast";

// Get secrets from Supabase Vault
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface LineMessage {
  type: "text" | "flex";
  text?: string;
  altText?: string;
  contents?: object;
}

interface NotificationPayload {
  type: "new_event" | "event_update" | "new_message" | "announcement" | "platform_announcement";
  record: any;
  old_record?: any;
}

// Standard CORS headers for all responses
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

    const payload: NotificationPayload = await req.json();
    console.log("[LINE Push] Received payload:", payload.type);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let result;

    switch (payload.type) {
      case "new_event":
        result = await handleNewEvent(supabase, payload.record);
        break;
      case "event_update":
        result = await handleEventUpdate(supabase, payload.record, payload.old_record);
        break;
      case "new_message":
        result = await handleNewMessage(supabase, payload.record);
        break;
      case "announcement":
        result = await handleAnnouncement(supabase, payload.record);
        break;
      case "platform_announcement":
        result = await handlePlatformAnnouncement(supabase, payload.record);
        break;
      default:
        return new Response(JSON.stringify({ error: "Unknown notification type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LINE Push] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============================================================================
// NEW EVENT NOTIFICATION
// ============================================================================
async function handleNewEvent(supabase: any, event: any) {
  console.log("[LINE Push] New event:", event.title, "society_id:", event.society_id, "creator_id:", event.creator_id);

  let golferIds: string[] = [];

  // For society events, notify all society members
  if (event.society_id) {
    const { data: members, error } = await supabase
      .from("society_members")
      .select("golfer_id")
      .eq("society_id", event.society_id)
      .eq("status", "active");

    if (error) {
      console.error("[LINE Push] Error fetching members:", error);
      return { success: false, error: error.message };
    }

    golferIds = members
      ?.filter((m: any) => m.golfer_id?.startsWith("U"))
      .map((m: any) => m.golfer_id)
      .filter(Boolean) || [];
  }

  // For private events or events without society members, check other sources
  if (!event.society_id || golferIds.length === 0) {
    console.log("[LINE Push] Checking additional notification targets");

    // If organizer_name is set, try to find society by name
    if (event.organizer_name && golferIds.length === 0) {
      console.log("[LINE Push] Looking up society by organizer_name:", event.organizer_name);
      const { data: society } = await supabase
        .from("societies")
        .select("id")
        .eq("name", event.organizer_name)
        .single();

      if (society?.id) {
        const { data: members } = await supabase
          .from("society_members")
          .select("golfer_id")
          .eq("society_id", society.id)
          .eq("status", "active");

        const societyIds = members
          ?.filter((m: any) => m.golfer_id?.startsWith("U"))
          .map((m: any) => m.golfer_id) || [];

        golferIds = [...new Set([...golferIds, ...societyIds])];
        console.log("[LINE Push] Found", societyIds.length, "members via organizer_name");
      }
    }

    // Get registered players for this event
    const { data: registrations } = await supabase
      .from("event_registrations")
      .select("player_id")
      .eq("event_id", event.id);

    const regIds = registrations
      ?.filter((r: any) => r.player_id?.startsWith("U"))
      .map((r: any) => r.player_id) || [];

    // Add creator if they have a LINE ID
    if (event.creator_id?.startsWith("U")) {
      regIds.push(event.creator_id);
    }

    // Combine all sources
    golferIds = [...new Set([...golferIds, ...regIds])];
  }

  if (golferIds.length === 0) {
    console.log("[LINE Push] No LINE users to notify");
    return { success: true, notified: 0 };
  }

  console.log("[LINE Push] Found", golferIds.length, "potential recipients");

  // Look up messaging_user_ids from user_profiles
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", golferIds);

  // Use messaging_user_id if available, otherwise use line_user_id directly
  const lineUserIds = (profiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  if (!lineUserIds || lineUserIds.length === 0) {
    console.log("[LINE Push] No LINE users to notify");
    return { success: true, notified: 0 };
  }

  // Check notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .in("user_id", lineUserIds)
    .eq("notify_new_events", false);

  const optedOutUsers = new Set(prefs?.map((p: any) => p.user_id) || []);
  const usersToNotify = lineUserIds.filter((id: string) => !optedOutUsers.has(id));

  if (usersToNotify.length === 0) {
    console.log("[LINE Push] All users opted out");
    return { success: true, notified: 0 };
  }

  // Build LINE Flex Message
  const eventDate = new Date(event.event_date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const message = buildEventFlexMessage({
    title: event.title,
    date: eventDate,
    venue: event.course_name || "TBA",
    description: event.description || "",
    eventId: event.id,
  });

  // Send via multicast (up to 500 users at once)
  const batches = chunkArray(usersToNotify, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [message]);
    totalSent += sent;
  }

  console.log(`[LINE Push] Notified ${totalSent} users about new event`);
  return { success: true, notified: totalSent };
}

// ============================================================================
// EVENT UPDATE NOTIFICATION
// ============================================================================
async function handleEventUpdate(supabase: any, newEvent: any, oldEvent: any) {
  // Only notify if significant changes (date, time, venue, or cancellation)
  const significantChange =
    newEvent.event_date !== oldEvent?.event_date ||
    newEvent.start_time !== oldEvent?.start_time ||
    newEvent.course_name !== oldEvent?.course_name ||
    newEvent.status === "cancelled";

  if (!significantChange) {
    console.log("[LINE Push] No significant changes, skipping notification");
    return { success: true, notified: 0, reason: "no_significant_change" };
  }

  // Get registered players for this event
  const { data: registrations, error } = await supabase
    .from("event_registrations")
    .select("player_id")
    .eq("event_id", newEvent.id)
    .eq("status", "confirmed");

  if (error) {
    console.error("[LINE Push] Error fetching registrations:", error);
    return { success: false, error: error.message };
  }

  const lineUserIds = registrations
    ?.filter((r: any) => r.player_id?.startsWith("U"))
    .map((r: any) => r.player_id);

  if (!lineUserIds || lineUserIds.length === 0) {
    return { success: true, notified: 0 };
  }

  // Build update message
  let updateText = `📢 Event Update: ${newEvent.title}\n\n`;

  if (newEvent.status === "cancelled") {
    updateText += "⚠️ This event has been CANCELLED.\n";
  } else {
    if (newEvent.event_date !== oldEvent?.event_date) {
      updateText += `📅 New Date: ${new Date(newEvent.event_date).toLocaleDateString()}\n`;
    }
    if (newEvent.start_time !== oldEvent?.start_time) {
      updateText += `⏰ New Time: ${newEvent.start_time}\n`;
    }
    if (newEvent.course_name !== oldEvent?.course_name) {
      updateText += `📍 New Venue: ${newEvent.course_name}\n`;
    }
  }

  updateText += `\nCheck the app for details.`;

  const message: LineMessage = {
    type: "text",
    text: updateText,
  };

  const batches = chunkArray(lineUserIds, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [message]);
    totalSent += sent;
  }

  return { success: true, notified: totalSent };
}

// ============================================================================
// NEW MESSAGE NOTIFICATION (Direct Messages AND Group Messages)
// ============================================================================
async function handleNewMessage(supabase: any, message: any) {
  const roomId = message.room_id;
  const senderId = message.sender || message.sender_id;

  console.log("[LINE Push] New message - room_id:", roomId, "sender:", senderId);

  if (!roomId) {
    console.log("[LINE Push] No room_id, skipping");
    return { success: true, notified: 0, reason: "no_room_id" };
  }

  // Get room info to determine type (group or direct)
  const { data: room, error: roomError } = await supabase
    .from("chat_rooms")
    .select("id, type, title")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    console.log("[LINE Push] Could not find room:", roomId, roomError?.message);
    return { success: true, notified: 0, reason: "room_not_found" };
  }

  console.log("[LINE Push] Room type:", room.type, "title:", room.title);

  // Get all room members (excluding sender)
  const { data: members, error: membersError } = await supabase
    .from("chat_room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("status", "approved")
    .neq("user_id", senderId);

  if (membersError) {
    console.error("[LINE Push] Error fetching room members:", membersError);
    return { success: false, error: membersError.message };
  }

  if (!members || members.length === 0) {
    console.log("[LINE Push] No members to notify");
    return { success: true, notified: 0, reason: "no_members" };
  }

  console.log("[LINE Push] Found", members.length, "members to notify");

  // Get user_ids
  const userIds = members.map((m: any) => m.user_id);

  // Look up LINE user IDs from profiles table
  // First try to find via profiles.id (Supabase auth user id)
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, line_user_id")
    .in("id", userIds);

  // Build a map of user_id -> line_user_id
  const lineUserIdMap: Record<string, string> = {};
  (profiles || []).forEach((p: any) => {
    if (p.line_user_id?.startsWith("U")) {
      lineUserIdMap[p.id] = p.line_user_id;
    }
  });

  // Collect LINE user IDs to notify
  let lineUserIds: string[] = [];

  for (const userId of userIds) {
    // If user_id is already a LINE ID (starts with U), use it
    if (userId?.startsWith("U")) {
      lineUserIds.push(userId);
    } else if (lineUserIdMap[userId]) {
      // Otherwise, look up the LINE ID
      lineUserIds.push(lineUserIdMap[userId]);
    }
  }

  // Remove duplicates
  lineUserIds = [...new Set(lineUserIds)];

  if (lineUserIds.length === 0) {
    console.log("[LINE Push] No LINE users to notify");
    return { success: true, notified: 0, reason: "no_line_users" };
  }

  console.log("[LINE Push] LINE users to notify:", lineUserIds.length);

  // Look up messaging_user_ids from user_profiles
  const { data: userProfiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", lineUserIds);

  // Use messaging_user_id if available, otherwise use line_user_id
  const messagingUserIds = (userProfiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  // Also include LINE user IDs that don't have user_profiles
  const profileLineIds = new Set((userProfiles || []).map((p: any) => p.line_user_id));
  const missingLineIds = lineUserIds.filter(id => !profileLineIds.has(id));
  const allTargetIds = [...new Set([...messagingUserIds, ...missingLineIds])];

  if (allTargetIds.length === 0) {
    console.log("[LINE Push] No messaging user IDs found");
    return { success: true, notified: 0, reason: "no_messaging_ids" };
  }

  // Check notification preferences
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .in("user_id", lineUserIds)
    .eq("notify_messages", false);

  const optedOutUsers = new Set(prefs?.map((p: any) => p.user_id) || []);
  const usersToNotify = allTargetIds.filter((id: string) => !optedOutUsers.has(id));

  if (usersToNotify.length === 0) {
    console.log("[LINE Push] All users opted out");
    return { success: true, notified: 0, reason: "all_opted_out" };
  }

  // Get sender name
  let senderName = "Someone";
  // Try profiles table first
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", senderId)
    .single();

  if (senderProfile) {
    senderName = senderProfile.display_name || senderProfile.username || "Someone";
  } else {
    // Try user_profiles table
    const { data: senderUserProfile } = await supabase
      .from("user_profiles")
      .select("name, display_name")
      .eq("line_user_id", senderId)
      .single();

    if (senderUserProfile) {
      senderName = senderUserProfile.display_name || senderUserProfile.name || "Someone";
    }
  }

  // Build notification message
  const preview = message.content?.substring(0, 50) + (message.content?.length > 50 ? "..." : "");

  let lineMessage: LineMessage;

  if (room.type === "group") {
    // Group message notification
    lineMessage = {
      type: "text",
      text: `👥 ${room.title || "Group Chat"}\n\n${senderName}: "${preview}"\n\nOpen MyCaddiPro to reply.`,
    };
  } else {
    // Direct message notification
    lineMessage = {
      type: "text",
      text: `💬 New message from ${senderName}\n\n"${preview}"\n\nOpen MyCaddiPro to reply.`,
    };
  }

  // Send via multicast
  const batches = chunkArray(usersToNotify, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [lineMessage]);
    totalSent += sent;
  }

  console.log(`[LINE Push] Notified ${totalSent} users about new ${room.type} message`);
  return { success: true, notified: totalSent, roomType: room.type };
}

// ============================================================================
// ANNOUNCEMENT NOTIFICATION
// ============================================================================
async function handleAnnouncement(supabase: any, announcement: any) {
  console.log("[LINE Push] New announcement:", announcement.title);

  // Get society members - golfer_id IS the LINE user ID
  const { data: members, error } = await supabase
    .from("society_members")
    .select("golfer_id")
    .eq("society_id", announcement.society_id)
    .eq("status", "active");

  if (error) {
    console.error("[LINE Push] Error fetching members:", error);
    return { success: false, error: error.message };
  }

  const lineUserIds = members
    ?.filter((m: any) => m.golfer_id?.startsWith("U"))
    .map((m: any) => m.golfer_id)
    .filter(Boolean);

  if (!lineUserIds || lineUserIds.length === 0) {
    return { success: true, notified: 0 };
  }

  // Get society name
  const { data: society } = await supabase
    .from("societies")
    .select("name")
    .eq("id", announcement.society_id)
    .single();

  const lineMessage: LineMessage = {
    type: "text",
    text: `📣 ${society?.name || "Society"} Announcement\n\n${announcement.title}\n\n${announcement.content?.substring(0, 200) || ""}${announcement.content?.length > 200 ? "..." : ""}\n\nOpen MyCaddiPro for details.`,
  };

  const batches = chunkArray(lineUserIds, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [lineMessage]);
    totalSent += sent;
  }

  return { success: true, notified: totalSent };
}

// ============================================================================
// PLATFORM ANNOUNCEMENT NOTIFICATION (Admin - All Users)
// ============================================================================
async function handlePlatformAnnouncement(supabase: any, announcement: any) {
  console.log("========== PLATFORM ANNOUNCEMENT START ==========");
  console.log("[LINE Push] Platform announcement title:", announcement.title);
  console.log("[LINE Push] Platform announcement content:", announcement.content?.substring(0, 50));
  console.log("[LINE Push] Targeting", announcement.society_count || "all", "societies");

  // Collect LINE user IDs from multiple sources
  let allLineUserIds: string[] = [];

  // SOURCE 1: user_profiles table (has line_user_id column)
  const { data: profileUsers, error: profileError } = await supabase
    .from("user_profiles")
    .select("line_user_id")
    .not("line_user_id", "is", null);

  console.log("[LINE Push] user_profiles query:", profileUsers?.length || 0, "rows, error:", profileError?.message || "none");

  if (profileUsers && profileUsers.length > 0) {
    // Log sample IDs
    console.log("[LINE Push] user_profiles sample:", JSON.stringify(profileUsers.slice(0, 5).map((u: any) => u.line_user_id)));

    // Filter to valid LINE IDs (start with U, 33 chars, hex format)
    const profileIds = profileUsers
      .map((u: any) => u.line_user_id)
      .filter((id: any) => {
        if (!id || typeof id !== 'string') return false;
        if (!id.startsWith("U")) return false;
        if (id.length !== 33) {
          console.log("[LINE Push] user_profiles: skipping (length " + id.length + "):", id);
          return false;
        }
        return true;
      });
    console.log("[LINE Push] user_profiles with valid U* IDs:", profileIds.length);
    allLineUserIds.push(...profileIds);
  }

  // SOURCE 2: society_members table (has golfer_id which IS the LINE user ID)
  const { data: societyMembers, error: memberError } = await supabase
    .from("society_members")
    .select("golfer_id")
    .not("golfer_id", "is", null);

  console.log("[LINE Push] society_members query:", societyMembers?.length || 0, "rows, error:", memberError?.message || "none");

  if (societyMembers && societyMembers.length > 0) {
    // Log sample of raw golfer_ids to see what they look like
    console.log("[LINE Push] society_members sample golfer_ids:", JSON.stringify(societyMembers.slice(0, 10).map((m: any) => m.golfer_id)));

    const memberIds = societyMembers
      .map((m: any) => m.golfer_id)
      .filter((id: any) => id && typeof id === 'string' && id.startsWith("U"));
    console.log("[LINE Push] society_members with U* IDs:", memberIds.length);
    if (memberIds.length > 0) {
      console.log("[LINE Push] Sample U* IDs from society_members:", JSON.stringify(memberIds.slice(0, 5)));
    }
    allLineUserIds.push(...memberIds);
  }

  // SOURCE 3: event_registrations table (has player_id which IS the LINE user ID)
  const { data: registrations, error: regError } = await supabase
    .from("event_registrations")
    .select("player_id")
    .not("player_id", "is", null);

  console.log("[LINE Push] event_registrations query:", registrations?.length || 0, "rows");

  if (registrations && registrations.length > 0) {
    const regIds = registrations
      .map((r: any) => r.player_id)
      .filter((id: any) => id && typeof id === 'string' && id.startsWith("U"));
    console.log("[LINE Push] event_registrations with U* IDs:", regIds.length);
    allLineUserIds.push(...regIds);
  }

  // Remove duplicates
  const uniqueLineUserIds = [...new Set(allLineUserIds)] as string[];
  console.log("[LINE Push] Total unique LINE user IDs found:", uniqueLineUserIds.length);

  if (uniqueLineUserIds.length === 0) {
    console.log("[LINE Push] No LINE users to notify");
    return { success: true, notified: 0, reason: "no_line_users_found" };
  }

  // CRITICAL: Look up messaging_user_ids from user_profiles (same as handleNewEvent)
  // The messaging_user_id is what LINE Messaging API needs for push notifications
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", uniqueLineUserIds);

  console.log("[LINE Push] user_profiles lookup for messaging_user_id:", profiles?.length || 0, "profiles found");

  // Use messaging_user_id if available, otherwise use line_user_id directly
  const messagingUserIds = (profiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  console.log("[LINE Push] Final messaging user IDs:", messagingUserIds.length);
  console.log("[LINE Push] Messaging IDs:", JSON.stringify(messagingUserIds));

  if (messagingUserIds.length === 0) {
    console.log("[LINE Push] No messaging user IDs found");
    return { success: true, notified: 0, reason: "no_messaging_user_ids" };
  }

  // Build the platform announcement message with special styling
  const lineMessage: LineMessage = {
    type: "flex",
    altText: `🌐 MyCaddiPro Announcement: ${announcement.title}`,
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981", // Green for platform announcements
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "🌐 MYCADDIPRO",
            color: "#FFFFFF",
            size: "sm",
            weight: "bold",
          },
          {
            type: "text",
            text: announcement.title,
            color: "#FFFFFF",
            size: "xl",
            weight: "bold",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: announcement.content?.substring(0, 300) || "",
            size: "sm",
            color: "#444444",
            wrap: true,
          },
          {
            type: "text",
            text: "— Platform Admin",
            size: "xs",
            color: "#888888",
            margin: "lg",
            align: "end",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "Open MyCaddiPro",
              uri: "https://mycaddipro.com",
            },
            style: "primary",
            color: "#10B981",
          },
        ],
      },
    },
  };

  // Send via multicast in batches of 500
  const batches = chunkArray(messagingUserIds, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [lineMessage]);
    totalSent += sent;
  }

  console.log(`[LINE Push] Platform announcement sent to ${totalSent} users`);
  return { success: true, notified: totalSent };
}

// ============================================================================
// LINE API HELPERS
// ============================================================================
async function sendPushMessage(userId: string, messages: LineMessage[]): Promise<boolean> {
  try {
    console.log("[LINE Push] Sending to user:", userId);

    // Check if token exists
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error("[LINE Push] ERROR: LINE_CHANNEL_ACCESS_TOKEN is not set!");
      return false;
    }

    const response = await fetch(LINE_MESSAGING_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: userId,
        messages: messages,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error("[LINE Push] API Error for", userId, ":", response.status, responseText);
      return false;
    }

    console.log("[LINE Push] ✅ Success for", userId);
    return true;
  } catch (error) {
    console.error("[LINE Push] Send error for", userId, ":", error);
    return false;
  }
}

async function sendMulticast(userIds: string[], messages: LineMessage[]): Promise<number> {
  // Validate and filter user IDs - LINE user IDs must be exactly 33 chars starting with U
  const validUserIds = userIds.filter(id => {
    if (!id || typeof id !== 'string') return false;
    if (!id.startsWith('U')) return false;
    if (id.length !== 33) {
      console.log("[LINE Push] Skipping invalid ID (wrong length):", id, "length:", id.length);
      return false;
    }
    // Check for valid characters (alphanumeric only after U)
    if (!/^U[a-f0-9]{32}$/i.test(id)) {
      console.log("[LINE Push] Skipping invalid ID (bad format):", id);
      return false;
    }
    return true;
  });

  console.log("[LINE Push] Multicast: valid IDs:", validUserIds.length, "of", userIds.length);
  console.log("[LINE Push] Valid IDs to send:", JSON.stringify(validUserIds));

  if (validUserIds.length === 0) {
    console.log("[LINE Push] No valid LINE user IDs to send to");
    return 0;
  }

  // Check if token exists
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("[LINE Push] ERROR: LINE_CHANNEL_ACCESS_TOKEN is not set!");
    return 0;
  }
  console.log("[LINE Push] Token exists, length:", LINE_CHANNEL_ACCESS_TOKEN.length);

  try {
    console.log("[LINE Push] Calling LINE Multicast API...");
    const response = await fetch(LINE_MULTICAST_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: validUserIds,
        messages: messages,
      }),
    });

    const responseText = await response.text();
    console.log("[LINE Push] Multicast response:", response.status, responseText);

    if (!response.ok) {
      console.error("[LINE Push] Multicast Error:", response.status, responseText);

      // Fallback: try sending one-by-one if multicast fails
      console.log("[LINE Push] Falling back to individual sends...");
      let successCount = 0;
      for (const userId of validUserIds) {
        const sent = await sendPushMessage(userId, messages);
        if (sent) successCount++;
      }
      console.log("[LINE Push] Individual sends succeeded:", successCount, "of", validUserIds.length);
      return successCount;
    }

    console.log("[LINE Push] ✅ Multicast SUCCESS to", validUserIds.length, "users");
    return validUserIds.length;
  } catch (error) {
    console.error("[LINE Push] Multicast error:", error);
    return 0;
  }
}

// ============================================================================
// MESSAGE BUILDERS
// ============================================================================
function buildEventFlexMessage(event: {
  title: string;
  date: string;
  venue: string;
  description: string;
  eventId: string;
}): LineMessage {
  return {
    type: "flex",
    altText: `🏌️ New Event: ${event.title}`,
    contents: {
      type: "bubble",
      hero: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#10B981",
        paddingAll: "20px",
        contents: [
          {
            type: "text",
            text: "🏌️ NEW EVENT",
            color: "#FFFFFF",
            size: "sm",
            weight: "bold",
          },
          {
            type: "text",
            text: event.title,
            color: "#FFFFFF",
            size: "xl",
            weight: "bold",
            wrap: true,
            margin: "sm",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "📅",
                size: "sm",
                flex: 0,
              },
              {
                type: "text",
                text: event.date,
                size: "sm",
                color: "#666666",
                margin: "sm",
                flex: 1,
              },
            ],
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "📍",
                size: "sm",
                flex: 0,
              },
              {
                type: "text",
                text: event.venue,
                size: "sm",
                color: "#666666",
                margin: "sm",
                flex: 1,
                wrap: true,
              },
            ],
          },
          ...(event.description
            ? [
                {
                  type: "text",
                  text: event.description.substring(0, 100) + (event.description.length > 100 ? "..." : ""),
                  size: "sm",
                  color: "#888888",
                  wrap: true,
                  margin: "lg",
                },
              ]
            : []),
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "View Event",
              uri: `https://mycaddipro.com/?event=${event.eventId}`,
            },
            style: "primary",
            color: "#10B981",
          },
        ],
      },
    },
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
