-- v1326 (2026-09-22) — the golfer home's Event Results cube says "👍 N new".
-- Pete: "On the golfer dashboard where do they see the thumbs up notification" → approved a 👍 on the Results cube.
-- Thumbs up I RECEIVED since p_since (the device's last visit to Results), plus the event of the newest one so the
-- cube can open straight onto it. Counts only — the names live on the Results page and in Tap-In Activity.
create or replace function public.result_thumbs_mine(p_user text, p_since timestamptz)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('n', count(*)::int,
                            'event_id', (array_agg(t.event_id order by t.created_at desc))[1])
    from public.result_thumbs t
   where coalesce(p_user, '') <> '' and t.player_id = p_user and t.giver_id <> p_user
     and t.created_at > coalesce(p_since, now() - interval '7 days')
$$;
revoke all on function public.result_thumbs_mine(text, timestamptz) from public;
grant execute on function public.result_thumbs_mine(text, timestamptz) to anon, authenticated;
