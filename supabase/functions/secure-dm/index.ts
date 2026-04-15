import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ALLOWED_ORIGINS = ["https://mycaddipro.com", "https://www.mycaddipro.com"];

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const json = (b: any, s = 200, origin: string | null) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json", ...getCorsHeaders(origin) } });

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

  try {
    const { action, user_id, recipient_id, message_text, limit } = await req.json();

    if (!user_id) return json({ error: "Missing user_id" }, 400, origin);

    // Verify user exists in our system
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("line_user_id, name")
      .eq("line_user_id", user_id)
      .single();

    if (!userProfile) {
      return json({ error: "User not found" }, 403, origin);
    }

    // Route actions
    if (action === "read") {
      // Read DMs — only return messages where user is sender OR recipient
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_line_id.eq.${user_id},recipient_line_id.eq.${user_id}`)
        .order("created_at", { ascending: false })
        .limit(limit || 50);

      if (error) return json({ error: error.message }, 500, origin);
      return json({ data }, 200, origin);

    } else if (action === "read_conversation") {
      // Read specific conversation between two users
      if (!recipient_id) return json({ error: "Missing recipient_id" }, 400, origin);

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_line_id.eq.${user_id},recipient_line_id.eq.${recipient_id}),and(sender_line_id.eq.${recipient_id},recipient_line_id.eq.${user_id})`)
        .order("created_at", { ascending: true })
        .limit(limit || 100);

      if (error) return json({ error: error.message }, 500, origin);
      return json({ data }, 200, origin);

    } else if (action === "send") {
      // Send DM — verify sender matches authenticated user
      if (!recipient_id || !message_text) {
        return json({ error: "Missing recipient_id or message_text" }, 400, origin);
      }

      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_line_id: user_id,  // Enforced to be the authenticated user
          recipient_line_id: recipient_id,
          message_text: message_text,
        })
        .select()
        .single();

      if (error) return json({ error: error.message }, 500, origin);

      // Trigger LINE push notification to recipient
      try {
        const pushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/line-push-notification`;
        await fetch(pushUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "new_message",
            sender_id: user_id,
            sender_name: userProfile.name || "Someone",
            recipient_id: recipient_id,
            content: message_text,
          }),
        });
      } catch (pushErr) {
        console.error("LINE push failed:", pushErr);
        // Don't fail the send — push is best-effort
      }

      return json({ data }, 200, origin);

    } else if (action === "delete") {
      // Delete — only allow deleting own messages
      const { message_id } = await req.json().catch(() => ({}));
      if (!message_id) return json({ error: "Missing message_id" }, 400, origin);

      // Verify ownership
      const { data: msg } = await supabase
        .from("direct_messages")
        .select("sender_line_id")
        .eq("id", message_id)
        .single();

      if (!msg || msg.sender_line_id !== user_id) {
        return json({ error: "Not your message" }, 403, origin);
      }

      const { error } = await supabase
        .from("direct_messages")
        .delete()
        .eq("id", message_id);

      if (error) return json({ error: error.message }, 500, origin);
      return json({ ok: true }, 200, origin);

    } else if (action === "mark_read") {
      // Mark messages as read where user is the recipient
      const { data, error } = await supabase
        .from("direct_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("recipient_line_id", user_id)
        .eq("sender_line_id", recipient_id)
        .eq("is_read", false)
        .select("id");

      if (error) return json({ error: error.message }, 500, origin);
      return json({ data, marked: data?.length || 0 }, 200, origin);

    } else if (action === "unread_count") {
      // Count unread messages for this user
      const { count, error } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_line_id", user_id)
        .eq("is_read", false);

      if (error) return json({ error: error.message }, 500, origin);
      return json({ count: count || 0 }, 200, origin);

    } else if (action === "delete_conversation") {
      // Delete all messages between two users (only if user is participant)
      if (!recipient_id) return json({ error: "Missing recipient_id" }, 400, origin);

      await supabase.from("direct_messages").delete()
        .eq("sender_line_id", user_id).eq("recipient_line_id", recipient_id);
      await supabase.from("direct_messages").delete()
        .eq("sender_line_id", recipient_id).eq("recipient_line_id", user_id);

      return json({ ok: true }, 200, origin);

    } else {
      return json({ error: "Unknown action" }, 400, origin);
    }

  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500, origin);
  }
});
