// Supabase Edge Function: chat-media (JS for Deno)
// Validates conversation membership, then returns a short-lived signed URL for a private object.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  if (req.method !== "POST") return new Response("OK");
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return new Response("Unauthorized", { status: 401 });

  const payload = await req.json().catch(()=> ({}));
  const { conversation_id, bucket = "chat-media", object_path } = payload || {};
  if (!conversation_id || !object_path) {
    return new Response(JSON.stringify({ error: "conversation_id and object_path required" }), { status: 400 });
  }

  // Validate session and membership
  const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json()).catch(()=> null);
  if (!user || !user.id) return new Response("Unauthorized", { status: 401 });

  const { data: isMember } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversation_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!isMember) return new Response("Forbidden", { status: 403 });

  // Issue a short signed URL
  const { data: signed, error } = await supabase
    .storage
    .from(bucket)
    .createSignedUrl(object_path, 60); // 60s
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ url: signed.signedUrl }), { headers: { "Content-Type": "application/json" }});
});
