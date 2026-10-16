-- ROLLBACK v1601: restores the open write path exactly as it was live on 2026-10-16 (NOT recommended)
begin;
grant insert (audience,body,course_id,course_name,created_at,created_by,cta_label,cta_target,deal,id,lang,offer_type,priority,push_recipients,push_sent_at,segment,status,title,updated_at,valid_from,valid_to), update (audience,body,course_id,course_name,created_at,created_by,cta_label,cta_target,deal,id,lang,offer_type,priority,push_recipients,push_sent_at,segment,status,title,updated_at,valid_from,valid_to) on public.course_offers to anon, authenticated;
create policy co_insert on public.course_offers for insert to anon, authenticated with check (true);
create policy co_update on public.course_offers for update to anon, authenticated using (true) with check (true);
drop function if exists public.course_offer_set_status(text, uuid, text);
drop function if exists public.course_offer_create(text, jsonb);
drop function if exists public._offer_course_ok(text, text);
commit;
