// LINE Webhook - Handles account linking for push notifications
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!;

serve(async (req) => {
  // Handle GET request for account linking (user clicks button in app)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const loginUserId = url.searchParams.get("link");

    if (loginUserId) {
      // Show a page that tells the user to send a message to link
      const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enable LINE Notifications - MyCaddiPro</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; text-align: center; background: #f0fdf4; }
        .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { color: #166534; font-size: 24px; margin-bottom: 16px; }
        p { color: #374151; line-height: 1.6; }
        .code { background: #e5e7eb; padding: 12px 20px; border-radius: 8px; font-family: monospace; font-size: 18px; margin: 20px 0; font-weight: bold; }
        .btn { display: inline-block; background: #06c755; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px; }
        .btn:hover { background: #05a748; }
        .steps { text-align: left; margin: 20px 0; }
        .steps li { margin: 12px 0; }
    </style>
</head>
<body>
    <div class="card">
        <h1>🏌️ Enable LINE Notifications</h1>
        <p>To link your MyCaddiPro account, please:</p>
        <ol class="steps">
            <li>Tap the button below to open LINE</li>
            <li>Add MyCaddiPro as a friend (if not already)</li>
            <li>Send this message to the bot:</li>
        </ol>
        <div class="code">LINK:${loginUserId}</div>
        <p style="font-size: 14px; color: #6b7280;">Copy the text above and send it to MyCaddiPro on LINE</p>
        <a href="https://line.me/R/ti/p/@283zvkfn" class="btn">Open LINE</a>
    </div>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    return new Response("OK", { status: 200 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("[LINE Webhook] Received:", JSON.stringify(body));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Process each event
    for (const event of body.events || []) {
      const messagingUserId = event.source?.userId;

      // When user adds bot as friend (follow event)
      if (event.type === "follow") {
        console.log("[LINE Webhook] User followed bot:", messagingUserId);

        // Send welcome message with instructions
        await sendLineMessage(messagingUserId,
          "Welcome to MyCaddiPro! 🏌️\n\nTo enable push notifications, please tap the 'Enable Notifications' button in your MyCaddiPro profile.\n\nYou'll receive notifications for:\n• New events\n• Direct messages\n• Announcements"
        );
      }

      // When user sends a message
      if (event.type === "message" && event.message.type === "text") {
        const messageText = event.message.text.trim();
        console.log("[LINE Webhook] Message from:", messagingUserId, "Text:", messageText);

        // Check if it's a LINK command (from deep link or manual)
        if (messageText.startsWith("LINK:")) {
          const loginUserId = messageText.replace("LINK:", "").trim();
          await linkAccounts(supabase, loginUserId, messagingUserId);
        } else {
          // Regular message - tell them how to link
          await sendLineMessage(messagingUserId,
            "To enable notifications, please use the 'Enable Notifications' button in your MyCaddiPro profile settings."
          );
        }
      }

      // Handle postback (from rich menu or buttons)
      if (event.type === "postback") {
        const data = event.postback?.data || "";
        console.log("[LINE Webhook] Postback:", data);

        if (data.startsWith("link=")) {
          const loginUserId = data.replace("link=", "");
          await linkAccounts(supabase, loginUserId, messagingUserId);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("[LINE Webhook] Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// Link LINE Login account to Messaging API account
async function linkAccounts(supabase: any, loginUserId: string, messagingUserId: string) {
  console.log("[LINE Webhook] Linking accounts:", loginUserId, "->", messagingUserId);

  // Verify the login user exists
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("name, messaging_user_id")
    .eq("line_user_id", loginUserId)
    .single();

  if (!profile) {
    console.log("[LINE Webhook] Login user not found:", loginUserId);
    await sendLineMessage(messagingUserId, "Account not found. Please make sure you're logged into MyCaddiPro first.");
    return;
  }

  if (profile.messaging_user_id) {
    console.log("[LINE Webhook] Already linked");
    await sendLineMessage(messagingUserId, `Hi ${profile.name}! Your account is already linked. You'll receive push notifications for messages and events.`);
    return;
  }

  // Update the profile with messaging user ID
  const { error } = await supabase
    .from("user_profiles")
    .update({ messaging_user_id: messagingUserId })
    .eq("line_user_id", loginUserId);

  if (error) {
    console.error("[LINE Webhook] Link error:", error);
    await sendLineMessage(messagingUserId, "Failed to link accounts. Please try again.");
    return;
  }

  console.log("[LINE Webhook] Successfully linked:", loginUserId, "->", messagingUserId);
  await sendLineMessage(messagingUserId,
    `✅ Success! Hi ${profile.name}!\n\nYour account is now linked. You'll receive LINE notifications for:\n• Direct messages\n• New events\n• Society announcements\n\nEnjoy MyCaddiPro! 🏌️`
  );
}

// Send LINE message
async function sendLineMessage(userId: string, text: string) {
  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [{ type: "text", text }]
      })
    });
  } catch (err) {
    console.error("[LINE Webhook] Send message error:", err);
  }
}
