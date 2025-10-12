
# MyCaddyPro Chat Architecture (Fixed + Push + Private Media) — 2025-10-11T14:29:48.501743Z

```
[Auth] ──> profiles
                  │
                  ▼
           conversations ◄──────────────┐
                  │                    │ ensure_direct_conversation(a,b)
                  ▼                    │
   conversation_participants           │
                  │                    │
                  ▼                    │
               messages  ──(trg)──► bump_last_message()
                  │
                  ├─► message_receipts (fan-out on insert)
                  └─► read_cursors

Realtime: Postgres Changes (INSERT/UPDATE on messages, typing_events)
Storage: chat-media bucket (private)
Edge:
  - chat-notify: DB webhook -> FCM push
  - chat-media: validates membership -> signed URL (60s)
```
- **RLS**: all DB reads/writes restricted to conversation members.
- **Media**: never public; access via signed URL only after membership check.
- **Push**: only to participants (not muted) and excluding sender.
