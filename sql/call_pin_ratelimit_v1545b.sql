-- v1545b: pin_lookup / call_pin_check rate limits key ONLY on cf-connecting-ip (set + overwritten by Cloudflare in front
-- of the API; the client-supplied x-forwarded-for is no longer trusted), plus a platform-wide ceiling on misses so
-- rotating addresses can't walk the PIN space.
begin;
create or replace function public._pin_rl_who()
returns text language sql stable as $fn$
  select coalesce(nullif((coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb))->>'cf-connecting-ip', ''), 'unknown');
$fn$;

create or replace function public.pin_lookup(p_pin text, p_by text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  ip  text := public._pin_rl_who();
  v   text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  g   record;
begin
  if v !~ '^\d{6}$' then return jsonb_build_object('ok', false, 'reason', 'format'); end if;
  if (select count(*) from public.pin_lookup_log l where l.who = ip and l.at > now() - interval '10 minutes') >= 60
     or (select count(*) from public.pin_lookup_log l where l.who = ip and not l.hit and l.at > now() - interval '10 minutes') >= 20
     or (select count(*) from public.pin_lookup_log l where not l.hit and l.who not like 'chk:%' and l.at > now() - interval '10 minutes') >= 400 then
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;
  select up.line_user_id id, up.name, up.handicap_index hcp into g
    from public.golfer_call_pins c join public.user_profiles up on up.line_user_id = c.golfer_id
   where c.pin = v limit 1;
  insert into public.pin_lookup_log (who, hit) values (ip, g.id is not null);
  delete from public.pin_lookup_log where at < now() - interval '1 day';
  if g.id is null then return jsonb_build_object('ok', true, 'golfer', null); end if;
  return jsonb_build_object('ok', true, 'golfer', jsonb_build_object('id', g.id, 'name', g.name, 'hcp', g.hcp));
end $fn$;

create or replace function public.call_pin_check(p_pin text, p_golfer text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  me  text := public._app_golfer(p_golfer);
  who text := 'chk:' || public._pin_rl_who();
  v   text := regexp_replace(coalesce(p_pin, ''), '\D', '', 'g');
  own text;
begin
  if v !~ '^\d{6}$' then return jsonb_build_object('state', 'format'); end if;
  if public._call_pin_weak(v) then return jsonb_build_object('state', 'weak'); end if;
  if (select count(*) from public.pin_lookup_log l where l.who = who and l.at > now() - interval '10 minutes') >= 120 then
    return jsonb_build_object('state', 'slow');
  end if;
  insert into public.pin_lookup_log (who, hit) values (who, true);
  select golfer_id into own from public.golfer_call_pins where pin = v;
  if own is null then return jsonb_build_object('state', 'available'); end if;
  if own = me then return jsonb_build_object('state', 'yours'); end if;
  return jsonb_build_object('state', 'taken');
end $fn$;
grant execute on function public.call_pin_check(text, text) to anon, authenticated;
commit;
