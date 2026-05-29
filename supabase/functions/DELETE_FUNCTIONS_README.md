# MyCaddiPro delete functions

Six Supabase Edge Functions that replace the browser-side `.delete()` calls
broken when RLS was enabled with no DELETE policy. Deletes now run server-side
on the service-role key, gated by caller verification.

| Function | Table | Gate |
|---|---|---|
| `unregister-event` | `event_registrations` | LINE id_token + ownership |
| `clear-round-holes` | `round_holes` (via `rounds`) | LINE id_token + ownership of parent round |
| `dismiss-sos-alert` | `emergency_alerts` | LINE id_token + ownership |
| `delete-caddy-note` | `caddy_notebook` | LINE id_token + ownership |
| `admin-delete-trgg-round` | `trgg_rounds` | admin secret |
| `admin-unlink-trgg-player` | `trgg_user_map` | admin secret |

## 1. CONFIRM YOUR SCHEMA FIRST — do not skip

Each function has a `CONFIRM AGAINST YOUR SCHEMA` block at the top with the
table name, id column, and owner column. The owner columns are assumptions
(`user_id` holding the LINE userId). If your actual columns differ, the
ownership check is wrong and the function won't work. Run this to see the truth:

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'event_registrations','rounds','round_holes',
    'emergency_alerts','caddy_notebook',
    'trgg_rounds','trgg_user_map'
  )
order by table_name, ordinal_position;
```

Two things to confirm specifically:
- **What does the owner column hold?** The raw LINE userId (`U1234...`)? Then the
  defaults are right. A mapped UUID or some profile id? Then change `OWNER_COL`
  and you may need to map LINE userId -> that id first.
- **`round_holes` ownership** lives on the parent `rounds` row — confirm
  `rounds.user_id` is the owner column and `round_holes.round_id` is the FK.

## 2. Set secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — do NOT set
them. Set these two:

```bash
# Your LINE *Login* channel ID (the channel that issues id_tokens)
supabase secrets set LINE_CHANNEL_ID=xxxxxxxxxx

# A strong random admin secret. Save the output in your password manager.
supabase secrets set ADMIN_SECRET=$(openssl rand -hex 32)
```

Set `LINE_CHANNEL_ID` and `ADMIN_SECRET` AFTER you rotate the service-role key,
so everything points at the new key in one pass.

## 3. Deploy

```bash
supabase functions deploy unregister-event
supabase functions deploy clear-round-holes
supabase functions deploy dismiss-sos-alert
supabase functions deploy delete-caddy-note
supabase functions deploy admin-delete-trgg-round
supabase functions deploy admin-unlink-trgg-player
```

Leave default JWT verification ON. Callers send the public anon key (the browser
client does this automatically). That gateway check is NOT the security boundary
— the LINE verification and admin secret inside each function are.

## 4. Wire up the browser (user functions)

Replace each old direct `.delete()` with an invoke. The LINE id_token comes from
your existing LINE login (with LIFF: `liff.getIDToken()`).

```js
// Unregister from an event
const idToken = liff.getIDToken(); // however you currently obtain it
const { data, error } = await supabase.functions.invoke('unregister-event', {
  body: { id_token: idToken, registration_id: regId }
});
if (error || !data?.success) { /* show error */ }
```

Body field per function:
- `unregister-event` -> `{ id_token, registration_id }`
- `clear-round-holes` -> `{ id_token, round_id }`
- `dismiss-sos-alert` -> `{ id_token, alert_id }`
- `delete-caddy-note` -> `{ id_token, note_id }`

## 5. Admin functions — DO NOT call from the public browser app

`ADMIN_SECRET` must never appear in public frontend JS. Anyone who views source
would get full delete power. Call admin functions only from a trusted context
(Hal's tooling, a server, or an access-controlled admin tool):

```bash
curl -X POST 'https://<project-ref>.functions.supabase.co/admin-delete-trgg-round' \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "apikey: <ANON_KEY>" \
  -H "x-admin-secret: <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{ "round_id": "..." }'
```

- `admin-delete-trgg-round` -> `{ round_id }`
- `admin-unlink-trgg-player` -> `{ map_id }`

Per-admin auth (so each admin has their own identity rather than a shared
secret) comes with the Part 2 LINE -> Supabase JWT work. The shared secret is
the correct interim gate.

## Reuse note

`_shared/verifyLine.ts` is the exact LINE verification you need for the Part 2
JWT mint function. When you build that, import `verifyLineUser()` there and
continue on to sign the Supabase JWT — don't duplicate the verification.
