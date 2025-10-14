/**
 * Supabase Edge Function: Push Notification on New Chat Message
 *
 * Triggers: When a new message is inserted into chat_messages
 * Action: Sends push notification to all room members except sender
 *
 * Setup:
 * 1. Deploy: supabase functions deploy push-on-message
 * 2. Set secrets:
 *    - supabase secrets set FCM_SERVICE_ACCOUNT="$(cat firebase-service-account.json | base64)"
 * 3. Create database webhook:
 *    - Table: chat_messages
 *    - Event: INSERT
 *    - URL: https://[project-ref].supabase.co/functions/v1/push-on-message
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import admin from "npm:firebase-admin@11";

// Initialize Firebase Admin SDK
const FCM_SA = Deno.env.get('FCM_SERVICE_ACCOUNT');
if (!FCM_SA) {
  console.error('FCM_SERVICE_ACCOUNT not configured');
}

const serviceAccount = FCM_SA ? JSON.parse(atob(FCM_SA)) : null;

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

serve(async (req) => {
  try {
    // Parse webhook payload
    const evt = await req.json();
    const { room_id, sender, content } = evt.record || {};

    // Validate required fields
    if (!room_id || !sender || !content) {
      console.log('[Push] Missing required fields, skipping');
      return new Response('skip', { status: 200 });
    }

    console.log(`[Push] New message in room ${room_id} from ${sender}`);

    // Get Supabase credentials from env
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // Get all room members
    const membersRes = await fetch(
      `${supabaseUrl}/rest/v1/chat_room_members?room_id=eq.${room_id}&select=user_id`,
      { headers }
    );

    if (!membersRes.ok) {
      throw new Error(`Failed to fetch members: ${membersRes.statusText}`);
    }

    const members = await membersRes.json();
    console.log(`[Push] Found ${members.length} members in room`);

    // Filter out sender
    const targets = members
      .map((m: any) => m.user_id)
      .filter((userId: string) => userId !== sender);

    if (!targets.length) {
      console.log('[Push] No targets to notify');
      return new Response('no targets', { status: 200 });
    }

    console.log(`[Push] Notifying ${targets.length} users`);

    // Get device tokens for target users
    const inList = targets.map((u: string) => `"${u}"`).join(',');
    const devicesRes = await fetch(
      `${supabaseUrl}/rest/v1/chat_devices?user_id=in.(${inList})&select=token,platform`,
      { headers }
    );

    if (!devicesRes.ok) {
      throw new Error(`Failed to fetch devices: ${devicesRes.statusText}`);
    }

    const devices = await devicesRes.json();
    const tokens = devices.map((d: any) => d.token);

    if (!tokens.length) {
      console.log('[Push] No device tokens found');
      return new Response('no tokens', { status: 200 });
    }

    console.log(`[Push] Found ${tokens.length} device tokens`);

    // Get room name for notification title
    const roomRes = await fetch(
      `${supabaseUrl}/rest/v1/chat_rooms?id=eq.${room_id}&select=title,type`,
      { headers }
    );
    const rooms = await roomRes.json();
    const room = rooms[0];
    const roomName = room?.title || 'Chat';

    // Get sender name
    const senderRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${sender}&select=display_name,username`,
      { headers }
    );
    const profiles = await senderRes.json();
    const senderProfile = profiles[0];
    const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';

    // Send push notification via Firebase Cloud Messaging
    if (!serviceAccount) {
      console.error('[Push] Firebase not configured');
      return new Response('firebase not configured', { status: 500 });
    }

    const result = await admin.messaging().sendMulticast({
      tokens,
      notification: {
        title: room?.type === 'group' ? `${roomName}` : `${senderName}`,
        body: content.slice(0, 120)
      },
      data: {
        room_id,
        sender,
        type: 'chat_message'
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    });

    console.log(`[Push] ✅ Sent ${result.successCount}/${tokens.length} notifications`);

    if (result.failureCount > 0) {
      console.log(`[Push] ⚠️ ${result.failureCount} failed:`, result.responses
        .filter((r: any) => !r.success)
        .map((r: any) => r.error?.message)
      );
    }

    return new Response(JSON.stringify({
      success: true,
      sent: result.successCount,
      failed: result.failureCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
