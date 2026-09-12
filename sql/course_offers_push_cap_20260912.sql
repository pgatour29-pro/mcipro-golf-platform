-- =====================================================================================
-- OFFER PUSH FREQUENCY CAP  (2026-09-12)
-- =====================================================================================
-- The cap is per GOLFER across ALL courses, not per course. Following six courses must not
-- mean six pushes a day — if it does, the follow toggle just becomes the new spam vector and
-- golfers mute the LINE account, which also kills scoring alerts, event alerts and DMs.
-- Quiet hours come from notification_preferences (columns that have existed unused since the
-- push setup and are finally read here); anything inside them is delivered to the inbox and
-- simply not pushed — the offer is never dropped.
-- =====================================================================================

alter table public.course_offer_reads
  add column if not exists pushed_at timestamptz;
create index if not exists idx_course_offer_reads_pushed
  on public.course_offer_reads(reader_line_id, pushed_at) where pushed_at is not null;

create or replace function public.deliver_course_offer(
  p_offer_id   uuid,
  p_recipients text[],
  p_daily_cap  integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_course text; v_status text; v_valid_to timestamptz;
  v_delivered int := 0;
  v_push text[]; v_inbox text[]; v_capped text[]; v_quiet text[];
begin
  select course_id, status, valid_to into v_course, v_status, v_valid_to
  from public.course_offers where id = p_offer_id;

  if v_course is null then return jsonb_build_object('error','offer not found'); end if;
  if v_status <> 'active' then return jsonb_build_object('error','offer is not active','status',v_status); end if;
  if v_valid_to is not null and v_valid_to < now() then
    return jsonb_build_object('error','offer already expired','valid_to',v_valid_to);
  end if;

  insert into public.course_offer_reads (offer_id, reader_line_id)
  select p_offer_id, r from unnest(p_recipients) as r where r is not null and r <> ''
  on conflict (offer_id, reader_line_id) do nothing;
  get diagnostics v_delivered = row_count;

  -- already had their allowance of offer pushes in the last 24h (any course)
  select coalesce(array_agg(r),'{}') into v_capped
  from unnest(p_recipients) as r
  where (select count(*) from public.course_offer_reads x
         where x.reader_line_id = r and x.pushed_at > now() - interval '24 hours') >= p_daily_cap;

  -- inside their quiet hours: inbox only, never dropped
  select coalesce(array_agg(r),'{}') into v_quiet
  from unnest(p_recipients) as r
  join public.notification_preferences np on np.user_id = r
  where np.quiet_hours_start is not null and np.quiet_hours_end is not null
    and ( (np.quiet_hours_start <= np.quiet_hours_end
           and (now() at time zone 'Asia/Bangkok')::time between np.quiet_hours_start and np.quiet_hours_end)
       or (np.quiet_hours_start >  np.quiet_hours_end          -- window crosses midnight
           and ((now() at time zone 'Asia/Bangkok')::time >= np.quiet_hours_start
             or (now() at time zone 'Asia/Bangkok')::time <= np.quiet_hours_end)) );

  -- EARNED a push: follows this course AND opted in AND not capped AND not in quiet hours
  select coalesce(array_agg(r),'{}') into v_push
  from unnest(p_recipients) as r
  where exists (select 1 from public.course_follows cf
                where cf.golfer_line_id = r and cf.course_id = v_course)
    and exists (select 1 from public.notification_preferences np
                where np.user_id = r and np.notify_offers is true)
    and not (r = any(v_capped)) and not (r = any(v_quiet));

  select coalesce(array_agg(r),'{}') into v_inbox
  from unnest(p_recipients) as r where not (r = any(v_push));

  update public.course_offer_reads
  set pushed_at = now()
  where offer_id = p_offer_id and reader_line_id = any(v_push);

  update public.course_offers
  set push_recipients = coalesce(array_length(v_push,1),0),
      push_sent_at = case when coalesce(array_length(v_push,1),0) > 0 then now() else push_sent_at end,
      updated_at = now()
  where id = p_offer_id;

  -- notification_log has existed unused since the push setup; this is its first writer.
  insert into public.notification_log (notification_type, recipient_count, successful_count,
                                       source_table, source_id, payload)
  values ('course_offer', coalesce(array_length(p_recipients,1),0),
          coalesce(array_length(v_push,1),0), 'course_offers', p_offer_id,
          jsonb_build_object('course_id', v_course, 'capped', coalesce(array_length(v_capped,1),0),
                             'quiet_hours', coalesce(array_length(v_quiet,1),0)));

  return jsonb_build_object(
    'offer_id', p_offer_id, 'course_id', v_course,
    'targeted', coalesce(array_length(p_recipients,1),0),
    'newly_delivered', v_delivered,
    'push', v_push, 'inbox_only', v_inbox,
    'suppressed_cap', v_capped, 'suppressed_quiet_hours', v_quiet);
end; $fn$;

grant execute on function public.deliver_course_offer(uuid, text[], integer) to anon, authenticated;
