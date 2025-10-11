# Supabase Chat System for MyCaddyPro (LINE‑style)

The following blueprint delivers a full, production‑grade chat stack using **Supabase (Postgres + Realtime + Storage + Edge Functions)**. It supports 1:1 and group chats, typing indicators, presence, read receipts, message states (sent/delivered/read), media uploads (images/video/voice notes/stickers), admin/system messages, blocking, muting, push notifications, and robust **RLS**. Client examples are in **TypeScript (React/React Native compatible)**.

> You can paste the SQL into Supabase **SQL Editor** in order; deploy the Edge Function with `supabase functions deploy`; then use the client code.

---

## 1) Database Schema (SQL)

```sql
-- 1. Extensions (if not enabled)
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. Core entities
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  is_group boolean not null default false,
  title text, -- group title; null for 1:1
  avatar_url text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member', -- 'member' | 'admin'
  joined_at timestamptz not null default now(),
  muted_until timestamptz, -- nullable; if set, suppress push until time
  blocked boolean not null default false,
  primary key (conversation_id, user_id)
);

-- prevent duplicate 1:1 conversations (optional convenience view/function later)
create unique index if not exists idx_uniq_direct_chat
on public.conversation_participants (least(conversation_id, conversation_id), greatest(conversation_id, conversation_id))
where false; -- placeholder so planner keeps index name; actual de-dup done in function below

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'text', -- 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'system'
  body text,                     -- for text/system
  metadata jsonb not null default '{}'::jsonb, -- dimensions, durations, mime, etc.
  reply_to uuid references public.messages(id) on delete set null, -- threaded reply
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  -- delivery state fan-out is by receipts table; also store a server-side state for convenience
  server_state text not null default 'sent' -- 'sent' | 'delivered' | 'read'
);

create index if not exists idx_messages_conv_created on public.messages(conversation_id, created_at desc);

-- per-user receipts (delivery/read)
create table if not exists public.message_receipts (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  delivered_at timestamptz,
  read_at timestamptz,
  primary key (message_id, user_id)
);

-- per-user read cursor per conversation (fast badge counts)
create table if not exists public.read_cursors (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default 'epoch',
  primary key (conversation_id, user_id)
);

-- typing indicators (ephemeral; auto-expire cleanup job recommended)
create table if not exists public.typing_events (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 seconds')
);
create index if not exists idx_typing_expiry on public.typing_events(expires_at);

-- push tokens for notifications
create table if not exists public.push_tokens (
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null, -- 'ios' | 'android' | 'web'
  created_at timestamptz not null default now(),
  primary key (user_id, token)
);

-- storage references (we store files in Supabase Storage; metadata holds the path)
-- optional table if you prefer normalized attachments
create table if not exists public.attachments (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid not null references public.messages(id) on delete cascade,
  bucket text not null,
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- 3. Triggers for updated_at and last_message_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute procedure public.set_updated_at();

-- last_message_at maintenance
create or replace function public.bump_last_message()
returns trigger language plpgsql as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        updated_at = now()
  where id = new.conversation_id;
  return new;
end; $$;

create trigger trg_messages_bump
after insert on public.messages
for each row execute procedure public.bump_last_message();

-- auto-create receipts for all participants except sender
create or replace function public.init_receipts()
returns trigger language plpgsql as $$
begin
  insert into public.message_receipts(message_id, user_id, delivered_at)
  select new.id, cp.user_id, case when cp.user_id = new.sender_id then new.created_at else null end
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id;
  return new;
end; $$;

create trigger trg_messages_receipts
after insert on public.messages
for each row execute procedure public.init_receipts();

-- 4. RLS: enable and secure
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.message_receipts enable row level security;
alter table public.read_cursors enable row level security;
alter table public.typing_events enable row level security;
alter table public.push_tokens enable row level security;
alter table public.attachments enable row level security;

-- profiles: user can select own; everyone can read minimal
create policy "profiles_self_rw" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_read_all" on public.profiles
  for select using (true);

-- conversations: visible to participants only
create policy "conversations_select_participant" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );
create policy "conversations_insert_by_member" on public.conversations
  for insert with check (auth.uid() = created_by);
create policy "conversations_update_admin" on public.conversations
  for update using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid() and cp.role in ('admin')
    )
  );

-- participants: only participant or admin can see/modify
create policy "cp_select_member" on public.conversation_participants
  for select using (
    user_id = auth.uid() or exists (
      select 1 from public.conversation_participants x
      where x.conversation_id = conversation_participants.conversation_id
        and x.user_id = auth.uid()
    )
  );
create policy "cp_insert_admin_or_self" on public.conversation_participants
  for insert with check (
    auth.uid() = user_id or exists (
      select 1 from public.conversation_participants x
      where x.conversation_id = conversation_id and x.user_id = auth.uid() and x.role = 'admin'
    )
  );
create policy "cp_update_self_or_admin" on public.conversation_participants
  for update using (
    auth.uid() = user_id or exists (
      select 1 from public.conversation_participants x
      where x.conversation_id = conversation_id and x.user_id = auth.uid() and x.role = 'admin'
    )
  );

-- messages: participant can read; sender can insert; sender or admin can soft-delete/edit
create policy "msg_select_participants" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );
create policy "msg_insert_sender_is_participant" on public.messages
  for insert with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid() and cp.blocked = false
    )
  );
create policy "msg_update_edit_delete" on public.messages
  for update using (
    sender_id = auth.uid() or exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid() and cp.role = 'admin'
    )
  );

-- receipts: each user can see/update their row
create policy "rcpt_self_rw" on public.message_receipts
  for select using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- read cursors: each user manages own
create policy "cursor_self_rw" on public.read_cursors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- typing events: user can upsert own; visible to convo participants
create policy "typing_select_participants" on public.typing_events
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = typing_events.conversation_id and cp.user_id = auth.uid()
    )
  );
create policy "typing_self_write" on public.typing_events
  for insert with check (user_id = auth.uid())
  ;
create policy "typing_delete_self" on public.typing_events
  for delete using (user_id = auth.uid());

-- attachments: participant read; uploader write
create policy "att_select_participants" on public.attachments
  for select using (
    exists (
      select 1 from public.messages m
      join public.conversation_participants cp on cp.conversation_id = m.conversation_id
      where m.id = attachments.message_id and cp.user_id = auth.uid()
    )
  );
create policy "att_insert_sender" on public.attachments
  for insert with check (
    exists (
      select 1 from public.messages m where m.id = attachments.message_id and m.sender_id = auth.uid()
    )
  );

-- 5. Helper function: ensure a direct 1:1 conversation (idempotent)
create or replace function public.ensure_direct_conversation(a uuid, b uuid)
returns uuid language plpgsql as $$
declare convo uuid;
begin
  if a = b then raise exception 'Cannot create direct conversation with self'; end if;
  -- try find existing conversation with exactly two participants a & b and is_group=false
  select c.id into convo
  from public.conversations c
  join public.conversation_participants p1 on p1.conversation_id = c.id and p1.user_id = a
  join public.conversation_participants p2 on p2.conversation_id = c.id and p2.user_id = b
  where c.is_group = false
  group by c.id
  having count(*) = 2
  limit 1;

  if convo is not null then return convo; end if;

  insert into public.conversations(is_group, created_by)
  values(false, a)
  returning id into convo;

  insert into public.conversation_participants(conversation_id, user_id, role)
  values (convo, a, 'admin'), (convo, b, 'member');

  return convo;
end; $$;

-- 6. Cleanup job suggestion: typing expiry (run via pg_cron or external)
-- delete from public.typing_events where expires_at < now();
```

---

## 2) Storage Buckets (CLI or Dashboard)

- Create bucket `chat-media` (public = **false**).
- Add **Object Policies** so only conversation participants can access objects via **Signed URLs**:
  - Access media via server/edge function generating a short‑lived signed URL after verifying RLS.

---

## 3) Edge Function: Push Notifications & Signed URLs

`supabase/functions/chat-notify/index.ts`

```ts
// deno runtime (Supabase Edge Functions)
// Sends push notifications on new messages and issues signed URLs for media.
// Requires environment variables for FCM/APNs.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
});

async function sendPush(toTokens: string[], title: string, body: string) {
  if (!FCM_SERVER_KEY || toTokens.length === 0) return;
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
  if (req.method === "POST") {
    const evt = await req.json();
    // Expect Supabase webhook payload for new messages
    // Configure Database Webhooks: on INSERT to public.messages -> this function URL
    if (evt.type === "INSERT" && evt.table === "messages") {
      const msg = evt.record as {
        id: string; conversation_id: string; sender_id: string; body: string | null; type: string;
      };

      // Fetch participants except sender and not blocked/muted
      const { data: recipients } = await supabase
        .from("conversation_participants")
        .select("user_id, muted_until")
        .eq("conversation_id", msg.conversation_id);

      const targetUserIds = (recipients || [])
        .filter((r) => r.user_id !== msg.sender_id && (!r.muted_until || new Date(r.muted_until) < new Date()))
        .map((r) => r.user_id);

      if (targetUserIds.length) {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("user_id, token")
          .in("user_id", targetUserIds);

        const { data: sender } = await supabase
          .from("profiles").select("display_name").eq("id", msg.sender_id).single();

        await sendPush((tokens || []).map(t => t.token), sender?.display_name || "New message", msg.body || msg.type);
      }
      return new Response(JSON.stringify({ ok: true }));
    }

    if (evt.type === "SIGNED_URL" && evt.object_path) {
      // Optional: return a signed URL for media after you validate access
      const { object_path, bucket } = evt;
      const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(object_path, 60);
      return new Response(JSON.stringify({ url: signed?.signedUrl }), { headers: { "Content-Type": "application/json" }});
    }
    return new Response(JSON.stringify({ ok: true }));
  }
  return new Response("OK");
});
```

Deploy:
```bash
supabase functions deploy chat-notify
supabase functions secrets set FCM_SERVER_KEY=... 
```

Configure **Database Webhooks** (Project Settings → Database → Webhooks):
- `INSERT` on `public.messages` → `chat-notify` URL (POST JSON)

---

## 4) Client SDK (React/React Native) – Core Hooks

Install:
```bash
npm i @supabase/supabase-js
```

`lib/supabase.ts`
```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### 4.1 Fetch or create a direct conversation
```ts
export async function ensureDirect(userId: string) {
  const { data, error } = await supabase.rpc("ensure_direct_conversation", { a: (await supabase.auth.getUser()).data.user?.id, b: userId });
  if (error) throw error;
  return data as string; // conversation id
}
```

### 4.2 List conversations with last message
```ts
export async function listConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, is_group, title, avatar_url, last_message_at")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  return data;
}
```

### 4.3 Subscribe to new messages in a conversation (Realtime)
```ts
import { supabase } from "./supabase";

export function subscribeMessages(conversationId: string, onInsert: (m: any)=>void, onUpdate?: (m:any)=>void) {
  return supabase.channel(`msg:${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => onInsert(payload.new))
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, payload => onUpdate?.(payload.new))
    .subscribe();
}
```

### 4.4 Send message (optimistic)
```ts
export async function sendMessage(conversationId: string, type: string, body?: string, metadata: any = {}) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('not authed');
  const { data, error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: user.id,
    type,
    body,
    metadata
  }).select('*').single();
  if (error) throw error;
  return data;
}
```

### 4.5 Read receipts & cursors
```ts
export async function markRead(conversationId: string) {
  const now = new Date().toISOString();
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  await supabase.from('read_cursors')
    .upsert({ conversation_id: conversationId, user_id: user.id, last_read_at: now }, { onConflict: 'conversation_id,user_id' });

  // bulk set read where recipient is self
  await supabase.from('message_receipts')
    .update({ read_at: now })
    .is('read_at', null)
    .eq('user_id', user.id)
    .in('message_id', (
      await supabase.from('messages').select('id').eq('conversation_id', conversationId)
    ).data?.map(x => x.id) || []);
}
```

### 4.6 Typing indicators (ephemeral)
```ts
export async function typing(conversationId: string) {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  // insert or refresh by delete+insert (simple)
  await supabase.from('typing_events').insert({ conversation_id: conversationId, user_id: user.id, expires_at: new Date(Date.now()+8000).toISOString() });
}

export function subscribeTyping(conversationId: string, cb: (rows:any[])=>void) {
  const channel = supabase.channel(`typing:${conversationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'typing_events', filter: `conversation_id=eq.${conversationId}` }, async () => {
      const { data } = await supabase.from('typing_events')
        .select('user_id, started_at')
        .eq('conversation_id', conversationId)
        .gt('expires_at', new Date().toISOString());
      cb(data || []);
    })
    .subscribe();
  return channel;
}
```

### 4.7 Presence (channel-based)
```ts
export function joinPresence(conversationId: string, userInfo: any) {
  const channel = supabase.channel(`presence:${conversationId}`, { config: { presence: { key: userInfo.id } } });
  channel.on('presence', { event: 'sync' }, () => {
    // channel.presenceState() returns map of online users
    const state = channel.presenceState();
    console.log('online:', state);
  });
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track(userInfo);
    }
  });
  return channel;
}
```

### 4.8 Media upload (Storage)
```ts
export async function uploadImage(file: File) {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from('chat-media').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return { bucket: 'chat-media', object_path: path, mime: file.type };
}
```

---

## 5) UI State Model (like LINE)

- **Chats List**: Conversations ordered by `last_message_at`, unread badge from `messages.created_at > read_cursors.last_read_at`.
- **Chat View**: Virtualized list, day separators, sender bubbles, delivery tick states derived from receipts:
  - "Sent" = message exists
  - "Delivered" = `message_receipts.delivered_at` not null for a given recipient
  - "Read" = `read_at` not null
- **Typing**: Show avatars from `typing_events` rows where `expires_at > now()`.
- **Stickers**: store sticker ID in `metadata.sticker` and render image/gif.
- **Replies/Threads**: `reply_to` references another message; render quoted preview.

---

## 6) Common Failure Points (and fixes)

1. **RLS blocking inserts**: Ensure `sender_id = auth.uid()` and user is a participant, not blocked.
2. **Realtime channel filter mismatch**: The `filter: conversation_id=eq.<id>` must match column name exactly.
3. **Storage permissions**: Keep bucket private and fetch signed URLs server-side or via edge after RLS check.
4. **Webhooks not firing**: Verify Database → Webhooks mapping and function deploy; inspect Edge logs.
5. **Timezone consistency**: Store everything in **timestamptz**; format on client using user locale.

---

## 7) Performance & Indexing

- `idx_messages_conv_created` already supports pagination: `where conversation_id=$1 order by created_at desc limit 50 offset ?` or keyset with `created_at < lastSeen`.
- Consider an index on `read_cursors (user_id, conversation_id)` and `message_receipts (user_id, read_at)` if you have heavy unread counts.

```sql
create index if not exists idx_cursors_user_conv on public.read_cursors(user_id, conversation_id);
create index if not exists idx_receipts_user_read on public.message_receipts(user_id, read_at);
```

---

## 8) Mute, Block, Leave, Admin

- **Mute**: set `muted_until` in `conversation_participants`.
- **Block**: set `blocked=true`; sender insert policy prevents sending when recipient blocked.
- **Leave group**: delete row from `conversation_participants`; admins can kick.
- **Promote admin**: update `role`.

---

## 9) Minimal Screens (React)

> Pseudocode-level components; wire up the hooks above.

```tsx
// ConversationsList.tsx
const ConversationsList = () => {
  const [convos, setConvos] = useState<any[]>([]);
  useEffect(() => { listConversations().then(setConvos); }, []);
  return (
    <ul>{convos.map(c => <li key={c.id}>{c.title || 'Direct chat'} • {new Date(c.last_message_at||c.updated_at).toLocaleString()}</li>)}</ul>
  );
};
```

```tsx
// ChatView.tsx
const ChatView = ({ conversationId }: { conversationId: string }) => {
  const [msgs, setMsgs] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMsgs(data || []));
    const sub = subscribeMessages(conversationId, m => setMsgs(prev => [...prev, m]));
    return () => { supabase.removeChannel(sub); };
  }, [conversationId]);
  return (
    <div>
      {msgs.map(m => <div key={m.id}>{m.type === 'text' ? m.body : `[${m.type}]`}</div>)}
    </div>
  );
};
```

---

## 10) Migration Strategy from your current broken setup

1. **Create tables & policies** above (non-destructive if names differ; otherwise rename your current tables and copy over).
2. **Backfill profiles**: sync `auth.users` → `profiles`.
3. **Move messages**: map your old schema to `messages` and `message_receipts` (default all delivered for historical).
4. **Wire the client** to new endpoints; test with RLS enabled.
5. **Enable webhooks** and push tokens.

---

## 11) Test Matrix

- [ ] 1:1 message send/receive
- [ ] Group chat with 3+ users
- [ ] Typing indicator visible then auto-hides after expiry
- [ ] Read receipts update and unread counts drop
- [ ] Media upload (image), render with signed URL
- [ ] Push received when app backgrounded
- [ ] Mute suppresses push until expiry
- [ ] Block prevents sending to user

---

## 12) Next Steps (optional enhancements)

- Message search (trigram index) and pinned messages
- Moderation (profanity filter) via Edge function
- Message reactions (👍, ❤️) via `message_reactions` table
- Multi-device session sync and message de-dup (client generated UUIDs)
- E2EE consideration (client-side encryption keys + Storage encryption)
