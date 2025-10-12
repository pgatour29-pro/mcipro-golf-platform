// Supabase Edge Function: chat-notify (JS for Deno)
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
});

async function sendPush(toTokens, title, body) {
  if (!FCM_SERVER_KEY || !toTokens.length) return;
  await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      registration_ids: toTokens,
      notification: { title, body },
      android: { priority: "high" },
      data: { type: "chat" },
    }),
  });
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("OK");
  const evt = await req.json();
  if (evt.type === "INSERT" && evt.table === "messages") {
    const msg = evt.record;
    const { data: recipients } = await supabase
      .from("conversation_participants")
      .select("user_id, muted_until")
      .eq("conversation_id", msg.conversation_id);
    const targets = (recipients || [])
      .filter((r) => r.user_id !== msg.sender_id && (!r.muted_until || new Date(r.muted_until) < new Date()))
      .map((r) => r.user_id);
    if (targets.length) {
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("user_id, token")
        .in("user_id", targets);
      const { data: sender } = await supabase
        .from("profiles").select("display_name").eq("id", msg.sender_id).single();
      await sendPush((tokens || []).map(t => t.token), sender?.display_name || "New message",
        msg.body || (msg.type || "message"));
    }
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" }});
});
