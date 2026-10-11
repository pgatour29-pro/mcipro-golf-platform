-- v1527 THE FOLLOW QUESTION ASKS ONCE (Pete 2026-10-12: "i have already selected from the initial popup asking me if i want
-- to follow Siam Plantation and everytime i log back in it keeps asking. it only needs to ask once after i make a selection").
-- Before v1526 the answer was refused for anyone without a server-verified session (and "Not now" failed silently), so the
-- same course came back at every login. v1526 records it; v1527 also: closing the sheet counts as "no" (client), and after
-- any answer the golfer is not asked about another course for 7 days. Re-runnable.

create or replace function public.follow_prompt_next(p_user text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v text; cid text; nm text;
begin
  if coalesce(p_user, '') = '' or public._app_golfer(p_user) is distinct from p_user then return null; end if;   -- v1526
  -- v1527: one question at a time. Answered or closed in the last 7 days = no question now (a golfer who played 7 courses
  -- this fortnight is not asked at every login)
  if exists (select 1 from public.course_follow_prompts q where q.golfer_line_id = p_user and q.asked_at > now() - interval '7 days') then return null; end if;
  for v in
    select public.venue_of(x.course_name) from public.rounds x
    where x.golfer_id = p_user and x.played_at >= now() - interval '14 days' and x.course_name is not null
    group by 1 order by max(x.played_at) desc
  loop
    continue when v is null;
    select coalesce(cv.course_ref, (select c.id from public.courses c where public.course_venue(c.id) = v order by length(c.id), c.id limit 1)), cv.name
      into cid, nm from public.course_venues cv where cv.slug = v;
    continue when cid is null;
    continue when exists (select 1 from public.course_follows f where f.golfer_line_id = p_user and (f.course_id = cid or public.course_venue(f.course_id) = v));
    continue when exists (select 1 from public.course_follow_prompts q where q.golfer_line_id = p_user and (q.course_id = cid or public.course_venue(q.course_id) = v));
    return jsonb_build_object('course_id', cid, 'course_name', nm);
  end loop;
  return null;
end $$;

notify pgrst, 'reload schema';
