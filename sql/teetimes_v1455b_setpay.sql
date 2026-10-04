-- v1455b: the golfer switches a held booking between the course's deposit and paying in full (while it is
-- still unpaid); the day-count helper is dropped (5.6 s for a 14-day strip — the strip shows dates only).
drop function if exists public.teetime_day_counts(date, integer, integer);

create or replace function public.teetime_set_pay(p_booking_id text, p_golfer_id text, p_choice text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare b public.bookings; a jsonb; c jsonb; n int; amt int;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found or coalesce(b.deleted, false) then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if b.golfer_id is distinct from p_golfer_id then return jsonb_build_object('ok', false, 'reason', 'not_yours'); end if;
  a := b.booking_data->'app';
  if a is null or a->>'state' <> 'due' then return jsonb_build_object('ok', false, 'reason', 'state'); end if;
  c := public.teetime_cfg(b.course_id);
  n := greatest(coalesce(b.players, 1), 1);
  if p_choice = 'full' then
    if not coalesce((c->>'allow_full')::boolean, false) or a->'quote' is null or a->'quote'->>'total' is null then
      return jsonb_build_object('ok', false, 'reason', 'no_full');
    end if;
    amt := (a->'quote'->>'total')::int;
    a := a || jsonb_build_object('rule', 'full', 'amount', amt);
  elsif p_choice = 'deposit' then
    if coalesce(c->>'rule', 'none') = 'none' then return jsonb_build_object('ok', false, 'reason', 'no_deposit'); end if;
    amt := coalesce((a->>'deposit_pp')::int, (c->>'deposit_pp')::int) * n;
    a := a || jsonb_build_object('rule', 'deposit', 'amount', amt, 'deposit_pp', coalesce((a->>'deposit_pp')::int, (c->>'deposit_pp')::int));
  else
    return jsonb_build_object('ok', false, 'reason', 'choice');
  end if;
  update public.bookings set booking_data = jsonb_set(booking_data, '{app}', a), updated_at = now() where id = b.id;
  return jsonb_build_object('ok', true, 'rule', a->>'rule', 'amount', amt);
end $$;
grant execute on function public.teetime_set_pay(text, text, text) to anon, authenticated;
