# MyCaddiPro 3.0 mockup kit — READ ALL OF THIS BEFORE BUILDING A PAGE

Pete (owner) asked for a 1.0 → 3.0 leap: "not a paint job", "10X better on each level", "design and
layout 10X better", "mobile and desktop must be unique to its own", "everything must work". Mockups
he approves ship 1:1, so draw only what can be built. These are mockups of REAL screens with REAL
content, on the real design language below. No lorem ipsum, no fake feature names.

## Files
- `kit/mcp3.css` — the ONLY stylesheet. Every class you need is there. Do not add colors/fonts outside it.
  Page-local `<style>` is allowed ONLY for layout glue (grid columns, widths, small spacing) — never new colors.
- `kit/kit.js` — injects the app's real cube-art sprite. Include `<script src="../kit/kit.js"></script>` last.
- `kit/sprite.svg` — symbols: cuTee cuBag cuCloche cuFlag cuCard cuChat cuTrophy cuLiveTv cuGear cuTools
  cuTag cuSky cuOffers cuCal cuPlayers cuClip cuMerge cuCog cuVan. Use as `<svg viewBox="0 0 96 96"><use href="#cuFlag"/></svg>`.
- `pages/golfer-today-m.html` + `pages/golfer-today-d.html` — the EXEMPLARS. Copy their skeleton exactly.
- `shoot.sh` — screenshots. Server: `http://127.0.0.1:8765/` serves this folder (already running; if not:
  `cd mockups/v3 && python3 -m http.server 8765 --bind 127.0.0.1 &`).

## Naming
`pages/<role>-<page>-m.html` (phone, 390×844) and `pages/<role>-<page>-d.html` (desktop, 1440×900).
Every page ships BOTH. The desktop is a different layout that uses the width (panes, tables, boards),
not a stretched phone. The phone is one-thumb, glanceable, working content starts ≤ 150px from top.

## The design language ("Clubhouse")
- Shell: Fairway green `--fairway #0B3B2A` top bar + bottom nav on phone; Fairway left rail on desktop.
  Content on `--mist #F3F6F3` with white cards. Highlight is ALWAYS green `#22c55e` (`--turf`).
  Brass `--brass` = money/awards/POY. Signal red `--signal` = live, unpaid, END, danger. Sky blue = vans/info.
- Type: Fraunces = names, headlines, hero numbers (`.display`, `.topbar .name`, `.sec h2`, `.card .hd h3`).
  Instrument Sans = all UI. JetBrains Mono (`.num`) = scores, handicaps, times, money in tables.
- NO purple/violet/indigo/fuchsia/pink/magenta — ever. No gray-on-gray lighter than `--ink-3`. No emoji in UI.
- Icons: Material Symbols via `<span class="ms">icon_name</span>` (sizes `.s18 .s20 .s26 .s30`, `.fill`).
- Art: the poster cubes use the real sprite. Flat/stroke icon sets as decoration are REJECTED by Pete.
- Chrome is compact: title line + one meta line; ONE summary band; tabs/toolbars ≤ 36px. Working
  content (list/table/board/keypad) gets the space. Display-size numerals belong on report pages only.
- Rosters/lists of 20+ people are TABLES (`.tbl`) or dense `.row.compact` lists — never big cards.
- In-round scoring pages use `<body data-theme="dark">` and the paper scorecard (`.paper`, `.sc`).
- Play Golf is the ▶ triangle exactly as in the exemplar. Never restyle it.

## Phone skeleton (copy from exemplar)
```
<div class="phone">
  <div class="statusbar">…</div>
  <div class="topbar">  (either .who + .hcp + .ib   OR   .ib.back + .title + .ib) </div>
  <div class="band">…</div>            <!-- optional, ONE band, ≤ 92px -->
  <div class="content pad">…</div>     <!-- the working area; it is clipped at the bottom like a real phone -->
  <nav class="bottomnav">5 tabs, the middle one is .tab.play on golfer pages</nav>
</div>
```
Bottom nav per role — golfer: Today · Events · ▶Play · Live · Me. organizer: Today · Events · Roster · Tee sheet · Scoring.
caddie (n4): Today · Bookings · Room · Me. manager: Today · Tee sheet · Pace · Staff · Reports.
proshop: Tee sheet · POS · Bookings · Customers · More. maintenance (n4): Board · Course · Equipment · Me.
admin: Overview · Users · Societies · Errors · More. Mark the current tab `.on`.

## Desktop skeleton (copy from exemplar)
```
<div class="desk">
  <aside class="rail"> brand + .it items (current .on) + .spacer + .me </aside>
  <div class="dmain">
    <div class="dtop"> .ttl + .crumb + .sp + .search + .ib buttons </div>
    <div class="dwork g12|split|split-l|three"> columns of .card / .tbl / boards </div>
  </div>
</div>
```
Use the width: two or three panes, a table with 8+ columns, a board with 4–6 groups across, a
detail pane beside a list. Nothing centered in a narrow column.

## Components (all in mcp3.css)
`.band` (leave/what/side) · `.dband` (desktop strip of cells) · `.cubes > .cube[.tall|.compact]` + `.playtri`
· `.sec` · `.card > .hd + .bd | .list` · `.row[.compact][.on] > .ic .tx(.t .s) .rt(.v .k) .chev`
· `.tbl[.tight]` (th/td, `.num` right-aligned mono, `tr.on`) · `.stats > .st(.v .k)` + `.bar > i`
· `.pill[.turf|.solid|.brass|.signal|.sky|.live|.paid|.unpaid]` · `.chips > .chip[.on]` · `.seg[.wide] > button[.on]`
· `.btn[.p|.f|.s|.g|.d|.b][.sm|.lg|.wide|.icon]` · `.field > label + .inp[.ph]` · `.toggle[.on]` · `.check[.on]`
· `.scrim` + `.sheet` (phone) / `.dialog` (desktop) · `.toast` · `.paper > .ph + table.sc` · `.kbd`
· `.avatar[.ini][.s28|.s44|.s56][.sq]` · `.ring[--pct]` · `.spark` · `.map` · `.hero-photo > .cap` · `.tl > .ev[.done]`
· `.note[.turf|.signal]` · `.kv` · `.van[.own]` · `.tag-role[.org|.golf|.cad|.adm]` · `.empty` · `.grid2/3/4` · `.stack` · `.between` · `.inline`

## Real content to use (this is a live product — use its real world)
- Owner/golfer: **Pete Park**, HCP **1.1**, 157 rounds, best 66, society Travellers Rest Golf Group (TRGG),
  also an organizer. He is also a JOA member. **Pete's round TODAY (Thu 3 Sep) = JOA · Khao Kheow Country Club, leave 09:30, tee 10:30, nines A·B, Group 3 with Kyungtae Kim, Jason, Erik Lundman, caddy Noi #38.** (The TRGG event today is Laem Chabang 10:00/11:00 — he is NOT playing it.) Avatar: `https://mycaddipro.com/images/play-golf-icon.jpg`. Everyone else = `.avatar.ini` initials.
- Societies: TRGG (Travellers Rest Golf Group, Pattaya, organizer Derek), JOA (Korean society, organizer Jason),
  JGTS (Erik Lundman). Languages EN/TH/KO/JA.
- Real members you may name: Bob Newman, Tom Britt, Calin, Erik Lundman, Kyungtae Kim, Shigeki Toyoshima,
  Rocky Jones, Carl Barklund, Alan, Tristan, Britt, Mike. Caddies: Noi #38, Lek #12, Ploy #07, Fon #21, Dao #44.
- This week's real events (2026-09-03 is Thursday): Thu TRGG Laem Chabang (leave 10:00 tee 11:00) & JOA Khao Kheow (09:30/10:30);
  Fri TRGG Green Valley "Free Food Friday" (09:00/10:00) & JOA Bangpra (10:00/11:00); Sat TRGG Treasure Hill (10:30/11:45) & JOA Treasure Hill;
  Sun JOA Eastern Star (09:30/10:30); Mon TRGG Pattaya Country Club (08:05/09:05) & JOA Burapha; Tue TRGG Burapha A-B (09:00/10:00) & JOA Phoenix;
  Wed TRGG Eastern Star (09:00/10:00). Formats: Stableford (default), 2-man scramble, 3-man Waltz, medal, match play.
- Courses (Pattaya area): Laem Chabang, Bangpakong Riverside, Burapha (A/B/C/D nines), Khao Kheow (A/B/C), Greenwood (A/B/C),
  Phoenix (Mountain/Ocean/Lake), Plutaluang (N/S/E/W), Pattana, Pattaya Country Club, Green Valley, Treasure Hill, Eastern Star,
  Bangpra, St Andrews 2000, Siam Plantation / Old Course / Waterside / Rolling Hills, Pleasant Valley, Mountain Shadow, Emerald.
- Money (THB): real event fees this week — Laem Chabang ฿4,200, Green Valley ฿2,500, Treasure Hill ฿2,100 (green fee + caddy + cart where included); competition 250, transport 300, non-member +100.
  Awards are shown as **Chips**, never as ฿ (Thai gambling law). 2s pot, HIO pot, placings 1st/2nd/3rd, POY points.
- Handicaps: TRGG handicap is primary for TRGG members; universal handicap tracks it; society handicaps per society.
- Scores: Stableford points (e.g. 38 pts), gross/net, thru N, GIR %, putts. Divisions A/B/C by handicap.

## Every page must
1. Show a real state with real data (today = Thu 3 Sep 2026, Pete plays JOA Khao Kheow, leave 09:30 tee 10:30). Empty states only if the brief says so.
2. Answer, on the first screen, the ONE question the user came for. Put it first, big, in Fraunces.
3. Kill a workflow step the 1.0 screen requires (re-picking the event, re-typing known data, hunting through tabs).
4. Fit: nothing clipped on the right, nothing important below the fold on phone, no overlapping text.
   The `.content` box is clipped at the bottom on purpose — anything after the fold is fine to cut, but the fold
   must land between rows, not through a row's text.
5. Pass the self-check: screenshot it (`AGENT_BROWSER_SESSION=<yourname> ./shoot.sh <yourname> 'pages/<role>-*.html'`),
   Read the PNG, and fix what you see. Do this for EVERY page, both sizes, before you report.

## Report per page (write to `notes/<role>.md`)
For each page: `### <role>-<page>` then 3 bullets — **Structure:** what is new about the layout/IA ·
**Workflow:** which 1.0 steps disappear (with the 1.0 tab/modal it replaces, from `before/*.png` if present) ·
**Data:** what the page now surfaces that 1.0 hides. Then one line **Keeps:** what from 1.0 is preserved on purpose.

## What 1.0 looks like today (from before/*.png — use these to write the Workflow bullets)
- Home (light): white header (avatar, name, society · HCP pill, hamburger), 2-across poster cubes: Handicap / Society Events / Tee Sheet / Schedule / ▶ Play Golf /
  Event Results / Messages / Caddy (Coming Soon) / Food & Orders / Spectate Live / Tee Time (Coming Soon), then a LEADERS ticker. Back + scroll-top FABs bottom corners. No bottom nav.
- Events: "Browse Events" dropdown, society-avatar strip, search, filter chips (All/Registered/Open/Filling), M–S day dots, then BIG cards (~330px each: date block,
  title, DEP/TEE line, tags, fee ฿4,200, REGISTER/EDIT, +GUESTS, Notices accordion, share). ≈2.5 events per screen.
- Play Golf: 3 tabs (Live Round / Post Score / Virtual Card), "CONFIGURE & START · New Round" hero with 4/5 READY progress, Play Golf ↔ Society Event toggle,
  big green event card ("Pick your two nines"), then form sections (event dropdown "70 events available", course, tees, nines, players, games), sticky Start Round.
- Login: dark green hero, EN/TH/KO/JA pills, wordmark, tagline, 3 stat tiles, 5 stacked pills (demo, getting started, QR, install Android, install iPhone),
  then LINE / Kakao / Google buttons, "New here? Create account", "Staff entrance".
- Organizer (no shots — from the codebase): Light home = 9 poster cubes (Events, Arrivals, Scheduler, Scores, Players, Registrations, Tee Sheet, TRGG directory, Admin);
  Full = top tabs Events · Registrations · Calendar · Scoring · Standings · Rounds · Players · Accounting · Profile · Admin · Scheduler — EACH tab has its own event picker
  (week strip/dropdown), so running one event means re-selecting it in Registrations, Tee Sheet, Scoring and Payouts separately. Registrations = 4-lens cockpit table.

## Phone philosophy — Pete's feedback 2026-09-03 09:27 ("desktop yes, mobile is a new paint job")
A phone page is never a MENU of tiles. It is a state-driven answer to what the person is doing right now:
- HOME = the day (see `pages/golfer-home-A-m.html`, `-B-`, `-C-`): before departure → at the course → in round → after.
  The hero carries the ONE action for that state (Navigate / Start round / Resume card / Share result). Cubes are gone
  from the phone; the bottom bar + Me tab hold the rest.
- Every other phone page opens on the thing itself (the roster, the board, the card, the slots), with the context already
  applied (today's event, my group, my society). No "pick the event" step, no chooser modals, no tab bars stacked on tab bars.
- Structural, not cosmetic: dense rows instead of cards, inline actions instead of detail pages, sheets for quick edits.
