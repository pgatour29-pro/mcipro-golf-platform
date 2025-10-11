
# MyCaddyPro Chat Architecture (Fixed) — 2025-10-11T14:17:30.398912Z

```
[Auth] ──> profiles
                  │
                  ▼
           conversations ◄──────────────┐
                  │                    │
                  ▼                    │ ensure_direct_conversation(a,b)
   conversation_participants           │ (RPC creates/fetches direct chat)
                  │                    │
                  ▼                    │
               messages  ──(trg)──► bump_last_message()
                  │
                  ├─► message_receipts (fan-out on insert)
                  └─► read_cursors

Realtime: Postgres Changes (INSERT/UPDATE on messages, typing_events)
Storage: chat-media bucket (signed URLs via server if needed)
Edge: optional push notifications webhook
```
- **RLS** restricts all reads/writes to conversation participants.
- **Realtime** replaces polling; UI subscribes per conversation.
- **Uniform message model**: body/type/sender_id/sender_name/created_at.
