-- =====================================================================================
-- COURSE OFFER DELIVERY  (2026-09-12)
-- =====================================================================================
-- Fan-out happens SERVER-side. That is what keeps Pete's rule true: the course builds a
-- segment and sees a COUNT, the platform delivers, and the course never holds a recipient
-- list. course_offer_reads doubles as the delivery receipt — a row with read_at NULL is
-- "delivered, unread", which is what the badge counts.
--
-- The function also reports WHO may be pushed, so the caller never has to re-derive it:
--   followed  = a course_follows row for this golfer+course  AND notify_offers = true
--   inbox_only = everyone else (badge only, NO push)
-- Offers are OPT-IN: a missing notification_preferences row means NO push, the opposite of
-- every other notify_* column on that table.
-- =====================================================================================

create or replace function public.deliver_course_offer(
  p_offer_id   uuid,
  p_recipients text[]
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  v_course   text;
  v_status   text;
  v_valid_to timestamptz;
  v_delivered int := 0;
  v_push      text[];
  v_inbox     text[];
begin
  select course_id, status, valid_to into v_course, v_status, v_valid_to
  from public.course_offers where id = p_offer_id;

  if v_course is null then
    return jsonb_build_object('error','offer not found','offer_id',p_offer_id);
  end if;
  if v_status <> 'active' then
    return jsonb_build_object('error','offer is not active','status',v_status);
  end if;
  if v_valid_to is not null and v_valid_to < now() then
    return jsonb_build_object('error','offer already expired','valid_to',v_valid_to);
  end if;

  -- delivery receipts (idempotent: re-delivering never resets a read)
  insert into public.course_offer_reads (offer_id, reader_line_id)
  select p_offer_id, r
  from unnest(p_recipients) as r
  where r is not null and r <> ''
  on conflict (offer_id, reader_line_id) do nothing;
  get diagnostics v_delivered = row_count;

  -- who has EARNED a push from this course: follows the course AND allows offer pushes
  select coalesce(array_agg(r), '{}') into v_push
  from unnest(p_recipients) as r
  where exists (select 1 from public.course_follows cf
                where cf.golfer_line_id = r and cf.course_id = v_course)
    and exists (select 1 from public.notification_preferences np
                where np.user_id = r and np.notify_offers is true);

  select coalesce(array_agg(r), '{}') into v_inbox
  from unnest(p_recipients) as r
  where not (r = any(v_push));

  update public.course_offers
  set push_recipients = coalesce(array_length(v_push,1),0),
      push_sent_at    = case when coalesce(array_length(v_push,1),0) > 0 then now() else push_sent_at end,
      updated_at      = now()
  where id = p_offer_id;

  return jsonb_build_object(
    'offer_id',    p_offer_id,
    'course_id',   v_course,
    'targeted',    coalesce(array_length(p_recipients,1),0),
    'newly_delivered', v_delivered,
    'push',        v_push,          -- inbox + LINE push
    'inbox_only',  v_inbox          -- inbox + badge only, no push
  );
end; $fn$;

grant execute on function public.deliver_course_offer(uuid, text[]) to anon, authenticated;

-- A course builds a segment and sees a COUNT, never a list.
create or replace function public.count_offer_segment(
  p_hcp_min numeric default null,
  p_hcp_max numeric default null,
  p_played_course text default null,      -- courses.id they have a scorecard/booking for
  p_lang text default null
)
returns integer
language sql
security definer
set search_path to 'public'
as $fn$
  select count(distinct p.line_user_id)::int
  from public.user_profiles p
  where p.line_user_id is not null
    and (p_hcp_min is null or p.handicap_index >= p_hcp_min)
    and (p_hcp_max is null or p.handicap_index <= p_hcp_max)
    and (p_lang     is null or coalesce(p.profile_data->>'language','en') = p_lang)
    and (p_played_course is null or exists (
          select 1 from public.bookings b
          where b.golfer_id = p.line_user_id and b.course_id = p_played_course));
$fn$;

grant execute on function public.count_offer_segment(numeric, numeric, text, text) to anon, authenticated;
