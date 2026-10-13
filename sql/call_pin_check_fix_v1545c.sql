-- v1545c: call_pin_check — fix the variable/column clash (v1545b broke the live checker: "who" was ambiguous),
-- only a signed-in golfer account may ask, and checker probes have their own platform-wide ceiling.
begin;
create or replace function public.call_pin_check(p_pin text, p_golfer text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  me    text := public._app_golfer(p_golfer);
  v_who text := 'chk:' || public._pin_rl_who();
  v     text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  own   text;
begin
  if me is null then return jsonb_build_object('state', 'no_account'); end if;
  if v !~ '^\d{6}$' then return jsonb_build_object('state', 'format'); end if;
  if public._call_pin_weak(v) then return jsonb_build_object('state', 'weak'); end if;
  if (select count(*) from public.pin_lookup_log l where l.who = v_who and l.at > now() - interval '10 minutes') >= 120
     or (select count(*) from public.pin_lookup_log l where l.who like 'chk:%' and l.at > now() - interval '10 minutes') >= 1500 then
    return jsonb_build_object('state', 'slow');
  end if;
  insert into public.pin_lookup_log (who, hit) values (v_who, true);
  select golfer_id into own from public.golfer_call_pins where pin = v;
  if own is null then return jsonb_build_object('state', 'available'); end if;
  if own = me then return jsonb_build_object('state', 'yours'); end if;
  return jsonb_build_object('state', 'taken');
end $fn$;
commit;
