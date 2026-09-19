-- ============================================================================================
-- COPYRIGHT NOTICE + COUNTER-NOTICE intake (v1267, 2026-09-19)
-- Pete: "lets also put have a proper Terms of Service and a DMCA/takedown process in place".
-- The forms on /copyright.html (and the in-app legal viewer) file a notice or a counter-notice.
-- It lands where admins already work — Messages > Reports (support_reports, source
-- 'copyright_notice' / 'copyright_counter', priority high) — with every element the notice-and-
-- takedown process needs. Rights holders are usually NOT members, so this is callable without an
-- account; it only inserts, returns a short reference, and is rate-limited per email and overall.
-- ============================================================================================
create or replace function public.submit_copyright_notice(p_kind text, p_name text, p_email text, p_body jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name  text := trim(coalesce(p_name, ''));
  v_id    uuid;
  v_txt   text;
  k       text;
begin
  if p_kind not in ('notice','counter') then return jsonb_build_object('ok', false, 'reason', 'bad_kind'); end if;
  if char_length(v_name) not between 2 and 120 then return jsonb_build_object('ok', false, 'reason', 'name'); end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 200 then return jsonb_build_object('ok', false, 'reason', 'email'); end if;
  if p_body is null or jsonb_typeof(p_body) <> 'object' then return jsonb_build_object('ok', false, 'reason', 'body'); end if;
  -- every sworn statement must be ticked and the typed signature present
  foreach k in array case when p_kind = 'notice' then array['work','where','signature'] else array['where','why','signature'] end loop
    if char_length(trim(coalesce(p_body->>k, ''))) < 2 then return jsonb_build_object('ok', false, 'reason', 'missing_' || k); end if;
  end loop;
  foreach k in array case when p_kind = 'notice' then array['good_faith','accurate'] else array['mistake','consent'] end loop
    if coalesce((p_body->>k)::boolean, false) is not true then return jsonb_build_object('ok', false, 'reason', 'missing_' || k); end if;
  end loop;
  if (select count(*) from public.support_reports where source in ('copyright_notice','copyright_counter')
        and reporter_id = 'copyright:' || v_email and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.support_reports where source in ('copyright_notice','copyright_counter')
        and created_at > now() - interval '1 hour') >= 60 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;
  v_txt := case when p_kind = 'notice' then 'COPYRIGHT TAKEDOWN NOTICE' else 'COUNTER-NOTICE' end
        || E'\nFrom: ' || v_name || ' <' || v_email || '>'
        || coalesce(E'\nOn behalf of: ' || nullif(left(trim(p_body->>'owner'), 200), ''), '')
        || coalesce(E'\nPhone / address: ' || nullif(left(trim(p_body->>'contact'), 300), ''), '')
        || coalesce(E'\nCopyrighted work: ' || nullif(left(trim(p_body->>'work'), 1500), ''), '')
        || E'\nWhere on MyCaddiPro: ' || left(trim(p_body->>'where'), 1500)
        || coalesce(E'\nWhy it was a mistake: ' || nullif(left(trim(p_body->>'why'), 2000), ''), '')
        || case when p_kind = 'notice'
                then E'\nGood-faith statement: yes\nAccurate and authorised (under penalty of perjury): yes'
                else E'\nRemoved by mistake or misidentification (under penalty of perjury): yes\nConsents to jurisdiction and to service by the notice sender: yes' end
        || E'\nSignature: ' || left(trim(p_body->>'signature'), 120);
  insert into public.support_reports (reporter_id, reporter_name, lang, category, subject, body, source, priority)
  values ('copyright:' || v_email, v_name, 'en', 'other',
          case when p_kind = 'notice' then 'Copyright takedown notice' else 'Copyright counter-notice' end
            || ' — ' || left(trim(coalesce(p_body->>'where', '')), 80),
          v_txt, case when p_kind = 'notice' then 'copyright_notice' else 'copyright_counter' end, 'high')
  returning id into v_id;
  return jsonb_build_object('ok', true, 'ref', upper(left(v_id::text, 8)));
end $$;
revoke all on function public.submit_copyright_notice(text,text,text,jsonb) from public;
grant execute on function public.submit_copyright_notice(text,text,text,jsonb) to anon, authenticated;
