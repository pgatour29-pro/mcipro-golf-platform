# TRGG Handicap Sync

Pulls handicaps from TRGG's Masterscoreboard page into MyCaddiPro user_profiles on a weekly schedule.

## How it works

```
pg_cron (Mon 06:00 Bangkok) -> Edge Function -> HTML scrape -> fuzzy name match
                                                                |
                                             High confidence (>=0.92): apply + auto-map
                                             Medium (0.75-0.92): suggest in review queue
                                             Low (<0.75): queue with no suggestion
```

Name mappings are stored permanently in `trgg_user_map` -- once confirmed, that
TRGG name -> MyCaddiPro user link is never asked about again.

## MyCaddiPro Schema Adaptations

This sync was adapted for MyCaddiPro's actual schema:
- Table: `user_profiles` (not `profiles`)
- PK: `line_user_id` (text, not uuid)
- Name column: `name` (not `full_name`)
- Auth: LINE OAuth (no Supabase Auth / `auth.uid()`)
- Admin check: `is_manager` column (not `role = 'admin'`)
- Writes ONLY `trgg_handicap` + `universal_handicap`, leaves all other columns untouched

## Files

| File | Path |
|------|------|
| Migration | `supabase/migrations/20260417000000_trgg_handicap_sync.sql` |
| Edge Function | `supabase/functions/sync-trgg-handicaps/index.ts` |
| Admin UI | `public/admin-trgg-handicaps.html` |

## Deploy

1. Apply migration: `supabase db push`
2. Set secrets: `supabase secrets set TRGG_PASSWORD=golfer TRGG_CWID=103464`
3. Deploy function: `supabase functions deploy sync-trgg-handicaps --no-verify-jwt`
4. Schedule cron: uncomment block at bottom of migration, fill in PROJECT_REF and SERVICE_ROLE_KEY, run in SQL editor
5. Access admin UI at: `https://mycaddipro.com/admin-trgg-handicaps.html`

## Testing

Manual trigger from admin UI "Run Sync Now" button, or curl:

```bash
curl -X POST \
  https://pyeeplwsnupmhgbguwqs.supabase.co/functions/v1/sync-trgg-handicaps \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"trigger":"manual"}'
```
