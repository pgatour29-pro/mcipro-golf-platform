-- 2026-09-17 live-ops (TRGG Phoenix): players started CASUAL rounds because the tee sheet was not
-- set; their scorecards were attached to the event by admin, but the phone still holds
-- eventId=null and will post the finished round with society_event_id NULL — the organizer's
-- results read rounds by society_event_id and would miss them. Safety net: a round posted with no
-- event adopts the event of that golfer's scorecard for the same day and course family, when the
-- golfer has no other round on that event already. Never blocks a round save.
create or replace function public.rounds_adopt_event_from_scorecard()
returns trigger
language plpgsql
as $fn$
declare
  ev text;
  soc uuid;
  d date;
  pfx text;
begin
  if new.society_event_id is not null or coalesce(new.golfer_id, '') = '' then
    return new;
  end if;
  begin
    d := coalesce(new.played_at, new.started_at, new.created_at, now())::date;
    pfx := lower(split_part(coalesce(new.course_name, ''), ' ', 1));
    select sc.event_id into ev
      from public.scorecards sc
     where sc.player_id = new.golfer_id
       and sc.event_id is not null
       and coalesce(sc.status, '') <> 'abandoned'
       and sc.started_at::date between d - 1 and d + 1
       and (pfx = '' or sc.course_name is null or lower(sc.course_name) like pfx || '%' or lower(coalesce(sc.course_id, '')) like pfx || '%')
     order by sc.started_at desc
     limit 1;
    if ev is null then
      return new;
    end if;
    if exists (select 1 from public.rounds r where r.golfer_id = new.golfer_id and r.society_event_id::text = ev and r.id <> new.id) then
      return new;
    end if;
    new.society_event_id := ev::uuid;
    if new.primary_society_id is null then
      select e.society_id into soc from public.society_events e where e.id::text = ev;
      new.primary_society_id := soc;
    end if;
  exception when others then
    -- never block a round save over this
    return new;
  end;
  return new;
end
$fn$;

-- Named to sort BEFORE trg_enforce_event_played_date (BEFORE triggers fire alphabetically), so
-- the adopted event then gets its played_at/started_at normalised like any other event round.
drop trigger if exists trg_rounds_adopt_event on public.rounds;
drop trigger if exists trg_0_rounds_adopt_event on public.rounds;
create trigger trg_0_rounds_adopt_event
  before insert on public.rounds
  for each row execute function public.rounds_adopt_event_from_scorecard();
