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

    const rawBody = await req.text();
    console.log("[LINE Push] RAW BODY:", rawBody.substring(0, 500));

    const payload = JSON.parse(rawBody);
    console.log("[LINE Push] Received payload type:", payload.type);

    // FIX: record might be a JSON string instead of object - parse it if so
    let record = payload.record;
    if (typeof record === 'string') {
      console.log("[LINE Push] Record is a string, parsing...");
      record = JSON.parse(record);
    }
    payload.record = record;

    console.log("[LINE Push] Record keys:", Object.keys(record || {}));
    console.log("[LINE Push] Record room_id:", record?.room_id);
    console.log("[LINE Push] Record sender:", record?.sender);

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
      case "group_message":
        result = await handleGroupMessage(supabase, payload.record);
        break;
      case "system_alert":
        result = await handleSystemAlert(supabase, payload);
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

  // Use messaging_user_id if available, otherwise fall back to line_user_id
  const messagingUserIds = (profiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  // FIX: Also include golfer IDs that don't have profiles (fallback)
  const profileLineIds = new Set((profiles || []).map((p: any) => p.line_user_id));
  const missingIds = golferIds.filter((id: string) => !profileLineIds.has(id));
  const lineUserIds = [...new Set([...messagingUserIds, ...missingIds])];

  console.log("[LINE Push] New event targets:", lineUserIds.length, "(profiles:", messagingUserIds.length, ", fallback:", missingIds.length, ")");

  if (lineUserIds.length === 0) {
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

  // Get ALL registered players for this event (removed status filter - notify everyone)
  const { data: registrations, error } = await supabase
    .from("event_registrations")
    .select("player_id")
    .eq("event_id", newEvent.id);

  if (error) {
    console.error("[LINE Push] Error fetching registrations:", error);
    return { success: false, error: error.message };
  }

  // Filter to valid LINE IDs
  const golferIds = registrations
    ?.filter((r: any) => r.player_id?.startsWith("U"))
    .map((r: any) => r.player_id) || [];

  console.log("[LINE Push] Event update: found", golferIds.length, "registered golfers with LINE IDs");

  if (golferIds.length === 0) {
    return { success: true, notified: 0, reason: "no_line_users" };
  }

  // FIX: Look up messaging_user_ids (consistent with other handlers)
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", golferIds);

  // Use messaging_user_id if available, otherwise fall back to line_user_id
  const messagingUserIds = (profiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  // Also include golfer IDs that don't have profiles (fallback)
  const profileLineIds = new Set((profiles || []).map((p: any) => p.line_user_id));
  const missingIds = golferIds.filter((id: string) => !profileLineIds.has(id));
  const allTargetIds = [...new Set([...messagingUserIds, ...missingIds])];

  console.log("[LINE Push] Event update targets:", allTargetIds.length, "(profiles:", messagingUserIds.length, ", fallback:", missingIds.length, ")");

  if (allTargetIds.length === 0) {
    return { success: true, notified: 0, reason: "no_valid_targets" };
  }

  // Get the name of who made the change
  let modifierName = newEvent.updated_by_name || null;

  // If no name stored, try to look up from user_profiles
  if (!modifierName && newEvent.updated_by) {
    const { data: modifier } = await supabase
      .from("user_profiles")
      .select("name, display_name")
      .eq("line_user_id", newEvent.updated_by)
      .single();

    modifierName = modifier?.display_name || modifier?.name || null;
  }

  // Build update message
  let updateText = `📢 Event Update: ${newEvent.title}\n\n`;

  // Show who made the change
  if (modifierName) {
    updateText += `👤 Changed by: ${modifierName}\n\n`;
  }

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

  const batches = chunkArray(allTargetIds, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [message]);
    totalSent += sent;
  }

  console.log("[LINE Push] Event update sent to", totalSent, "users");
  return { success: true, notified: totalSent };
}

// ============================================================================
// DIRECT MESSAGE HANDLER (for direct_messages table with recipient_id)
// ============================================================================
async function handleDirectMessage(supabase: any, message: any) {
  const recipientId = message.recipient_id;

  // Only notify LINE users (must start with U)
  if (!recipientId?.startsWith("U")) {
    console.log("[LINE Push] Recipient is not a LINE user:", recipientId);
    return { success: true, notified: 0, reason: "not_line_user" };
  }

  // Validate LINE ID format (U + 32 hex chars)
  if (recipientId.length !== 33 || !/^U[a-f0-9]{32}$/i.test(recipientId)) {
    console.log("[LINE Push] Invalid LINE ID format:", recipientId);
    return { success: true, notified: 0, reason: "invalid_line_id" };
  }

  // Get recipient's messaging_user_id (may be null)
  const { data: recipient } = await supabase
    .from("user_profiles")
    .select("messaging_user_id, name")
    .eq("line_user_id", recipientId)
    .single();

  // FIX: Fall back to line_user_id if messaging_user_id is null
  const targetId = recipient?.messaging_user_id || recipientId;
  console.log("[LINE Push] Direct message target:", targetId, "(messaging_user_id:", recipient?.messaging_user_id, ", line_user_id:", recipientId, ")");

  // Check if user wants message notifications
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("notify_messages")
    .eq("user_id", recipientId)
    .single();

  if (prefs?.notify_messages === false) {
    console.log("[LINE Push] User opted out of message notifications:", recipientId);
    return { success: true, notified: 0, reason: "opted_out" };
  }

  // Get sender name
  const { data: sender } = await supabase
    .from("user_profiles")
    .select("name, display_name")
    .eq("line_user_id", message.sender_id)
    .single();

  const senderName = sender?.display_name || sender?.name || "Someone";

  // Truncate message preview
  const preview = message.content?.substring(0, 50) + (message.content?.length > 50 ? "..." : "");

  const lineMessage: LineMessage = {
    type: "text",
    text: `💬 New message from ${senderName}\n\n"${preview}"\n\nOpen MyCaddiPro to reply.`,
  };

  const sent = await sendPushMessage(targetId, [lineMessage]);
  console.log("[LINE Push] Direct message send result:", sent ? "SUCCESS" : "FAILED");
  return { success: sent, notified: sent ? 1 : 0 };
}

// ============================================================================
// NEW MESSAGE NOTIFICATION (Direct Messages AND Group Messages)
// ============================================================================
async function handleNewMessage(supabase: any, message: any) {
  // DEBUG: Log the raw message object to see what we're receiving
  console.log("[LINE Push] RAW MESSAGE OBJECT:", JSON.stringify(message));

  const roomId = message.room_id;
  const recipientId = message.recipient_id;
  const senderId = message.sender || message.sender_id;

  console.log("[LINE Push] New message - room_id:", roomId, "recipient_id:", recipientId, "sender:", senderId);

  // CASE 1: Direct message from direct_messages table (has recipient_id)
  if (recipientId) {
    console.log("[LINE Push] Handling as direct message (recipient_id found)");
    return await handleDirectMessage(supabase, message);
  }

  // CASE 2: Chat message from chat_messages table (has room_id)
  if (!roomId) {
    console.log("[LINE Push] No room_id or recipient_id, skipping");
    return { success: true, notified: 0, reason: "no_room_id_or_recipient" };
  }

  console.log("[LINE Push] Processing chat_messages - room_id:", roomId, "sender (UUID):", senderId);

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
    .neq("user_id", senderId);

  if (membersError) {
    console.error("[LINE Push] Error fetching room members:", membersError);
    return { success: false, error: membersError.message };
  }

  if (!members || members.length === 0) {
    console.log("[LINE Push] No members to notify");
    return { success: true, notified: 0, reason: "no_members" };
  }

  console.log("[LINE Push] Found", members.length, "members to notify:", members.map((m: any) => m.user_id));

  // Get user_ids (these are UUIDs from chat_room_members)
  const userIds = members.map((m: any) => m.user_id);

  // Look up LINE user IDs from user_profiles table using UUID
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("id, line_user_id")
    .in("id", userIds);

  console.log("[LINE Push] Profiles lookup:", profiles?.length || 0, "found, error:", profilesError?.message || "none");

  // Collect LINE user IDs to notify
  let lineUserIds: string[] = [];

  for (const userId of userIds) {
    // If user_id is already a LINE ID (starts with U), use it directly
    if (userId?.startsWith("U")) {
      lineUserIds.push(userId);
      console.log("[LINE Push] User", userId, "is already a LINE ID");
    } else {
      // Look up LINE ID from profiles
      const profile = (profiles || []).find((p: any) => p.id === userId);
      if (profile?.line_user_id?.startsWith("U")) {
        lineUserIds.push(profile.line_user_id);
        console.log("[LINE Push] User", userId, "-> LINE ID:", profile.line_user_id);
      } else {
        console.log("[LINE Push] User", userId, "has no LINE ID in profile");
      }
    }
  }

  // Remove duplicates
  lineUserIds = [...new Set(lineUserIds)];

  if (lineUserIds.length === 0) {
    console.log("[LINE Push] No LINE users to notify");
    return { success: true, notified: 0, reason: "no_line_users" };
  }

  console.log("[LINE Push] LINE users to notify:", lineUserIds);

  // Look up messaging_user_ids from user_profiles
  const { data: userProfiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", lineUserIds);

  console.log("[LINE Push] user_profiles lookup:", userProfiles?.length || 0, "found");

  // Use messaging_user_id if available, otherwise use line_user_id
  const messagingUserIds = (userProfiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  // Also include LINE user IDs that don't have user_profiles
  const profileLineIds = new Set((userProfiles || []).map((p: any) => p.line_user_id));
  const missingLineIds = lineUserIds.filter(id => !profileLineIds.has(id));
  const allTargetIds = [...new Set([...messagingUserIds, ...missingLineIds])];

  console.log("[LINE Push] Final target IDs:", allTargetIds);

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

  // Get sender name (sender is a UUID, need to look up in user_profiles)
  let senderName = "Someone";
  const { data: senderProfile } = await supabase
    .from("user_profiles")
    .select("name, display_name")
    .eq("id", senderId)
    .single();

  if (senderProfile) {
    senderName = senderProfile.display_name || senderProfile.name || "Someone";
    console.log("[LINE Push] Sender name from user_profiles:", senderName);
  } else {
    // Sender might be a LINE ID, try user_profiles
    const { data: senderUserProfile } = await supabase
      .from("user_profiles")
      .select("name, display_name")
      .eq("line_user_id", senderId)
      .single();

    if (senderUserProfile) {
      senderName = senderUserProfile.display_name || senderUserProfile.name || "Someone";
      console.log("[LINE Push] Sender name from user_profiles:", senderName);
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
// GROUP MESSAGE NOTIFICATION (from group_chat_messages table)
// ============================================================================
async function handleGroupMessage(supabase: any, message: any) {
  console.log("[LINE Push] Group message - group_id:", message.group_id, "sender:", message.sender_line_id);

  // Get group info
  const { data: group } = await supabase
    .from("group_chats")
    .select("name")
    .eq("id", message.group_id)
    .single();

  const groupName = group?.name || "Group Chat";

  // Get all group members except sender
  const { data: members, error: membersError } = await supabase
    .from("group_chat_members")
    .select("member_line_id")
    .eq("group_id", message.group_id)
    .neq("member_line_id", message.sender_line_id);

  if (membersError) {
    console.error("[LINE Push] Error fetching group members:", membersError);
    return { success: false, error: membersError.message };
  }

  if (!members || members.length === 0) {
    console.log("[LINE Push] No group members to notify");
    return { success: true, notified: 0, reason: "no_members" };
  }

  // Filter to valid LINE IDs
  const memberLineIds = members
    .map((m: any) => m.member_line_id)
    .filter((id: string) => id?.startsWith("U"));

  console.log("[LINE Push] Group member LINE IDs:", memberLineIds);

  if (memberLineIds.length === 0) {
    return { success: true, notified: 0, reason: "no_line_users" };
  }

  // Look up messaging_user_id from user_profiles (same as direct messages)
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("line_user_id, messaging_user_id")
    .in("line_user_id", memberLineIds);

  console.log("[LINE Push] Found profiles:", profiles?.length || 0);

  // Use messaging_user_id if available, otherwise line_user_id
  const lineUserIds = (profiles || [])
    .map((p: any) => p.messaging_user_id || p.line_user_id)
    .filter((id: string) => id?.startsWith("U"));

  // Also include LINE IDs without profiles
  const profileLineIds = new Set((profiles || []).map((p: any) => p.line_user_id));
  const missingIds = memberLineIds.filter((id: string) => !profileLineIds.has(id));
  const allTargetIds = [...new Set([...lineUserIds, ...missingIds])];

  console.log("[LINE Push] Final target IDs:", allTargetIds);

  if (allTargetIds.length === 0) {
    return { success: true, notified: 0, reason: "no_target_ids" };
  }

  // Get sender name
  const { data: sender } = await supabase
    .from("user_profiles")
    .select("name, display_name")
    .eq("line_user_id", message.sender_line_id)
    .single();

  const senderName = sender?.display_name || sender?.name || "Someone";

  // Build message
  const preview = message.message_text?.substring(0, 50) + (message.message_text?.length > 50 ? "..." : "");

  const lineMessage: LineMessage = {
    type: "text",
    text: `👥 ${groupName}\n\n${senderName}: "${preview}"\n\nOpen MyCaddiPro to reply.`,
  };

  // Send via multicast
  const batches = chunkArray(allTargetIds, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [lineMessage]);
    totalSent += sent;
  }

  console.log(`[LINE Push] Notified ${totalSent} users about group message`);
  return { success: true, notified: totalSent };
}

// ============================================================================
// ANNOUNCEMENT NOTIFICATION
// ============================================================================
async function handleAnnouncement(supabase: any, announcement: any) {
  console.log("[LINE Push] New announcement:", announcement.title, "society_id:", announcement.society_id);

  let allLineUserIds: string[] = [];

  // If no society_id, this is a PLATFORM announcement - send to ALL users
  if (!announcement.society_id) {
    console.log("[LINE Push] No society_id - treating as platform announcement");
    return await handlePlatformAnnouncement(supabase, announcement);
  }

  // SOURCE 1: Get society members - golfer_id IS the LINE user ID
  const { data: members, error: membersError } = await supabase
    .from("society_members")
    .select("golfer_id")
    .eq("society_id", announcement.society_id)
    .eq("status", "active");

  if (membersError) {
    console.error("[LINE Push] Error fetching members:", membersError);
  } else {
    const memberIds = members
      ?.filter((m: any) => m.golfer_id?.startsWith("U"))
      .map((m: any) => m.golfer_id) || [];
    console.log("[LINE Push] Found", memberIds.length, "society members");
    allLineUserIds.push(...memberIds);
  }

  // SOURCE 2: Get society subscribers - golfer_id IS the LINE user ID
  const { data: subscribers, error: subsError } = await supabase
    .from("golfer_society_subscriptions")
    .select("golfer_id")
    .eq("society_id", announcement.society_id)
    .eq("status", "active");

  if (subsError) {
    console.error("[LINE Push] Error fetching subscribers:", subsError);
  } else {
    const subIds = subscribers
      ?.filter((s: any) => s.golfer_id?.startsWith("U"))
      .map((s: any) => s.golfer_id) || [];
    console.log("[LINE Push] Found", subIds.length, "society subscribers");
    allLineUserIds.push(...subIds);
  }

  // SOURCE 3: Get users who have registered for events of this society
  const { data: societyEvents } = await supabase
    .from("society_events")
    .select("id")
    .eq("society_id", announcement.society_id);

  if (societyEvents && societyEvents.length > 0) {
    const eventIds = societyEvents.map((e: any) => e.id);
    const { data: registrations } = await supabase
      .from("event_registrations")
      .select("player_id")
      .in("event_id", eventIds);

    if (registrations) {
      const regIds = registrations
        .map((r: any) => r.player_id)
        .filter((id: any) => id?.startsWith("U"));
      console.log("[LINE Push] Found", regIds.length, "registered players for society events");
      allLineUserIds.push(...regIds);
    }
  }

  // Remove duplicates
  const lineUserIds = [...new Set(allLineUserIds)];
  console.log("[LINE Push] Total unique LINE users to notify:", lineUserIds.length);

  if (lineUserIds.length === 0) {
    console.log("[LINE Push] No LINE users to notify");
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

  // Check notification preferences for platform announcements
  console.log("[LINE Push] Checking notification preferences for", uniqueLineUserIds.length, "users");
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .in("user_id", uniqueLineUserIds)
    .eq("notify_announcements", false);

  const optedOutUsers = new Set(prefs?.map((p: any) => p.user_id) || []);
  console.log("[LINE Push] Users opted out of announcements:", optedOutUsers.size);

  // Create a map of line_user_id -> messaging_user_id from profiles
  const userIdMap = new Map();
  (profiles || []).forEach((p: any) => {
    userIdMap.set(p.line_user_id, p.messaging_user_id || p.line_user_id);
  });

  // Filter to only users who haven't opted out
  const usersToNotify = uniqueLineUserIds
    .filter((userId: string) => !optedOutUsers.has(userId))
    .map((userId: string) => userIdMap.get(userId))
    .filter((id: string) => id && id.startsWith("U"));

  console.log("[LINE Push] After preference filtering:", usersToNotify.length, "users to notify");

  if (usersToNotify.length === 0) {
    console.log("[LINE Push] All users opted out of platform announcements");
    return { success: true, notified: 0, reason: "all_opted_out" };
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
  const batches = chunkArray(usersToNotify, 500);
  let totalSent = 0;

  for (const batch of batches) {
    const sent = await sendMulticast(batch, [lineMessage]);
    totalSent += sent;
  }

  console.log(`[LINE Push] Platform announcement sent to ${totalSent} users`);
  return { success: true, notified: totalSent };
}

// ============================================================================
// SYSTEM ALERT NOTIFICATION (Direct message to a single user)
// ============================================================================
async function handleSystemAlert(supabase: any, payload: any) {
  const recipientId = payload.recipient_id;
  const message = payload.message;

  console.log("[LINE Push] System alert to:", recipientId);
  console.log("[LINE Push] Message:", message?.substring(0, 100));

  if (!recipientId || !message) {
    console.log("[LINE Push] Missing recipient_id or message");
    return { success: false, error: "Missing recipient_id or message" };
  }

  // Validate recipient is a LINE user ID
  if (!recipientId.startsWith("U")) {
    console.log("[LINE Push] Recipient is not a LINE user ID:", recipientId);
    return { success: true, notified: 0, reason: "not_line_user" };
  }

  // Look up messaging_user_id from user_profiles
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("messaging_user_id")
    .eq("line_user_id", recipientId)
    .single();

  // Use messaging_user_id if available, otherwise use line_user_id directly
  const targetId = profile?.messaging_user_id || recipientId;
  console.log("[LINE Push] Target ID:", targetId);

  if (!targetId?.startsWith("U")) {
    console.log("[LINE Push] No valid target ID");
    return { success: true, notified: 0, reason: "no_valid_target" };
  }

  // Build simple text message
  const lineMessage: LineMessage = {
    type: "text",
    text: message,
  };

  // Send directly to the user
  const sent = await sendPushMessage(targetId, [lineMessage]);

  console.log("[LINE Push] System alert result:", sent ? "SUCCESS" : "FAILED");
  return { success: sent, notified: sent ? 1 : 0 };
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
