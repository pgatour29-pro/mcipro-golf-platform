# TRGG Player of the Year — MyCaddiPro Implementation Guide

## Overview

Wire up `TRGGPlayerOfYear.jsx` into MyCaddiPro with live Supabase data.
All 655 player records from the 23 May 2026 snapshot are in `seed-trgg-2026.js`.

---

## 1. Supabase Schema

### Table: `trgg_players`
```sql
create table trgg_players (
  id               uuid primary key default gen_random_uuid(),
  display_name     text not null unique,   -- "Carroll, Justin"
  first_name       text,
  last_name        text,
  user_id          uuid references auth.users(id),  -- nullable for guests
  trgg_handicap    numeric(4,1),
  universal_handicap numeric(4,1),
  active           boolean default true,
  created_at       timestamptz default now()
);
```

### Table: `trgg_rounds`
```sql
create table trgg_rounds (
  id               uuid primary key default gen_random_uuid(),
  player_id        uuid references trgg_players(id) on delete cascade,
  round_date       date not null,
  course_id        uuid references courses(id),
  stableford       int not null check (stableford >= 0 and stableford <= 60),
  society_event_id uuid references society_events(id),
  notes            text,
  created_at       timestamptz default now()
);

create index idx_trgg_rounds_player on trgg_rounds(player_id);
create index idx_trgg_rounds_date   on trgg_rounds(round_date desc);
```

### View: `trgg_player_of_year_view`
Auto-computes best-20 ranking. Recalculates every time a new round is inserted.

```sql
create or replace view trgg_player_of_year_view as
with ranked_rounds as (
  select
    r.player_id,
    r.stableford,
    row_number() over (
      partition by r.player_id
      order by r.stableford desc
    ) as rn,
    count(*) over (partition by r.player_id) as total_rounds
  from trgg_rounds r
),
top20 as (
  select
    player_id,
    sum(stableford)                                    as pts,
    count(*)                                           as counted_rounds,
    max(total_rounds)                                  as total_rounds,
    max(stableford)                                    as best_score,
    min(stableford)                                    as worst_score,
    round(avg(stableford)::numeric, 1)                 as avg_score,
    array_agg(stableford order by stableford desc)     as scores
  from ranked_rounds
  where rn <= 20
  group by player_id
),
with_rank as (
  select
    p.id,
    p.display_name,
    p.user_id,
    t.pts,
    t.counted_rounds   as rounds,
    t.total_rounds,
    t.best_score,
    t.worst_score,
    t.avg_score,
    t.scores,
    rank() over (order by t.pts desc, t.best_score desc) as pos
  from top20 t
  join trgg_players p on p.id = t.player_id
  where p.active = true
)
select * from with_rank
order by pos, display_name;
```

---

## 2. Seed the 2026 Data

The file `seed-trgg-2026.js` contains all 655 players with their exact
score arrays from the 23 May 2026 leaderboard. Run it once:

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=your_service_key \
node scripts/seed-trgg-2026.js
```

The script will:
- Upsert each player into `trgg_players` (safe to re-run)
- Insert all historical round scores into `trgg_rounds`
- Log ✓/✗ per player so you can see any failures

> **Note:** `round_date` is set to `2026-01-01` as a placeholder for all
> historical rounds. Update with real dates once TRGG schedule data is
> available from trggpattaya.com (the Edge Function scraper already handles this).

---

## 3. Route & File Placement

```
src/
  pages/
    society/
      trgg/
        PlayerOfYear.jsx   ← TRGGPlayerOfYear.jsx goes here
scripts/
  seed-trgg-2026.js        ← run once to load historical data
```

**React Router:**
```jsx
<Route path="/society/trgg/player-of-year" element={<TRGGPlayerOfYear />} />
```

---

## 4. Replace Sample Data with Supabase Fetch

In `TRGGPlayerOfYear.jsx`, replace the `SAMPLE_DATA` constant and add:

```js
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Inside component, replace SAMPLE_DATA usage with:
const [players, setPlayers] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    const { data, error } = await supabase
      .from("trgg_player_of_year_view")
      .select("*")
      .order("pos", { ascending: true });

    if (!error) setPlayers(data ?? []);
    setLoading(false);
  }
  fetchData();
}, []);

// Then replace `allPlayers` with `players` everywhere in the component.
// The `scores` column from the view is integer[] — matches directly.
```

---

## 5. Real-time Updates

When a new round is entered, the view recalculates automatically.
To push updates to open browser sessions:

```js
useEffect(() => {
  const channel = supabase
    .channel("trgg-rounds-live")
    .on("postgres_changes", {
      event: "INSERT",
      schema: "public",
      table: "trgg_rounds",
    }, () => fetchData())
    .subscribe();

  return () => supabase.removeChannel(channel);
}, []);
```

---

## 6. Admin Round Entry Form

Add a simple form so TRGG admins can log new rounds post-event:

```jsx
async function addRound({ playerName, stableford, roundDate, courseId }) {
  // Lookup player id
  const { data: player } = await supabase
    .from("trgg_players")
    .select("id")
    .eq("display_name", playerName)
    .single();

  if (!player) return { error: "Player not found" };

  return supabase.from("trgg_rounds").insert({
    player_id:  player.id,
    stableford: stableford,
    round_date: roundDate,
    course_id:  courseId ?? null,
  });
}
```

Once inserted, the view recalculates automatically:
- If player has < 20 counted rounds → new score added to total
- If player has 20 counted rounds → new score replaces worst only if it's better
- Rankings update accordingly

---

## 7. RLS Policies

```sql
-- Authenticated users can read the leaderboard
create policy "trgg_poy_read"
  on trgg_player_of_year_view
  for select to authenticated
  using (true);

-- Only admins can insert rounds
create policy "trgg_rounds_admin_insert"
  on trgg_rounds for insert to authenticated
  using (
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('admin', 'trgg_admin')
    )
  );
```

---

## 8. Navigation

```jsx
<NavLink to="/society/trgg/player-of-year">
  🏆 Player of the Year
</NavLink>
```

---

## 9. Future Enhancements

- **Year filter** — add `year` param, filter `trgg_rounds` by `date_part('year', round_date)`
- **Real dates** — link rounds to TRGG schedule events already in MyCaddiPro
- **CSV export** — download full leaderboard
- **Player profile drill-through** — full round history, course breakdown
- **Push notification** — alert member when rank changes after new results posted

---

*MyCaddiPro · TRGG Pattaya · 655 players · Season 2026*
