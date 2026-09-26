#!/bin/bash
# MyCaddiPro load test runner (2026-09-26). Scheduled by crontab for 00:00 Bangkok 2026-09-27; removes its own
# cron line when it finishes. Creates a hidden TEST event (triggers off = no LINE push), runs phones.mjs, deletes
# every test row (triggers off), writes a report into project-memory/, and sends the summary to Pete on Telegram.
# Manual smoke run: SMOKE=1 tools/loadtest/run.sh   (10→20 phones, ~2 min, no Telegram)
set -u
REPO=/mnt/c/Users/pete/Documents/MciPro
cd "$REPO" || exit 1
export PATH="$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
ulimit -n 65535 2>/dev/null
STAMP=$(date +%Y%m%d-%H%M)
LOG="$REPO/project-memory/loadtest-$STAMP.log"
OUT="$REPO/project-memory/loadtest-$STAMP.json"
REPORT="$REPO/project-memory/loadtest-$STAMP.md"
mkdir -p "$REPO/project-memory"
exec > >(tee -a "$LOG") 2>&1
echo "== load test $STAMP (smoke=${SMOKE:-0})"

# -o json: under cron (no terminal) the CLI otherwise prints a text table
q() { timeout 120 npx --yes supabase db query --linked -o json "$1" 2>&1; }
jrow() { python3 -c "
import sys,json,re
s=sys.stdin.read(); dec=json.JSONDecoder(); docs=[]; k=0
while True:
    m=re.compile(r'[\[{]').search(s,k)
    if not m: break
    try: d,e=dec.raw_decode(s,m.start()); docs.append(d); k=e
    except ValueError: k=m.start()+1
rows=[]
for d in docs:
    r=d if isinstance(d,list) else (d.get('rows') or [])
    if r: rows=r
print(rows[0].get('$1','') if rows else '')"; }

cleanup_all() { q "set session_replication_role = replica; delete from public.event_registrations where player_id like 'LOADTEST-%'; delete from public.society_events where creator_id = 'LOADTEST'" >/dev/null 2>&1; }
trap cleanup_all EXIT
DBSTATS="select (select count(*) from pg_stat_activity) conns, (select count(*) from pg_stat_activity where state='active') active, (select current_setting('max_connections')) maxc"
echo "db before: $(q "$DBSTATS" | tr -d '\n ' | grep -oE '\[.*' | head -c 200)"

EV=$(q "set session_replication_role = replica; insert into public.society_events (title, event_date, status, is_private, creator_type, creator_id, max_participants, auto_waitlist) values ('ZZ LOAD TEST $STAMP — ignore', '2030-01-01', 'draft', true, 'golfer', 'LOADTEST', 0, false) returning id::text as id" | jrow id)
if [ -z "$EV" ]; then echo "could not create test event — abort"; exit 1; fi
echo "test event $EV"

if [ "${SMOKE:-0}" = "1" ]; then
  STEPS="10,20" STEP_S=30 HOLD_S=30 HEADROOM=0 node tools/loadtest/phones.mjs "$EV" "$OUT"
else
  STEPS="100,250,500,750,1000" STEP_S=90 HOLD_S=600 HEADROOM=2000 node --max-old-space-size=4096 tools/loadtest/phones.mjs "$EV" "$OUT"
fi
RC=$?
echo "phones.mjs exit $RC"
echo "db after: $(q "$DBSTATS" | tr -d '\n ' | grep -oE '\[.*' | head -c 200)"

# cleanup — every test row, triggers off
CLEAN=$(q "set session_replication_role = replica; with a as (delete from public.event_registrations where event_id = '$EV'::uuid or player_id like 'LOADTEST-%' returning 1), b as (delete from public.society_events where id = '$EV'::uuid returning 1) select (select count(*) from a) regs, (select count(*) from b) ev")
echo "cleanup: $(echo "$CLEAN" | tr -d '\n ' | grep -oE '\[.*' | head -c 200)"
LEFT=$(q "select (select count(*) from public.event_registrations where player_id like 'LOADTEST-%') + (select count(*) from public.society_events where creator_id = 'LOADTEST') as n" | jrow n)
echo "test rows left: $LEFT"

if [ ! -s "$OUT" ]; then
  SUMMARY="The test process stopped before finishing (exit $RC). Last readings:
$(grep -E '^\{"label' "$LOG" | tail -3 | python3 -c 'import sys,json
for l in sys.stdin:
    try:
        p=json.loads(l); print(p["label"], "-", p["phones"], "phones, answers p95", p["http"]["p95"], "ms, errors", round(p["http"]["errRate"]*100,1), "%, live p95", p["delivery"]["p95"], "ms")
    except Exception: pass')"
else
SUMMARY=$(node -e '
const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const ph = r.phases.filter(p => !/baseline|ramp-down/.test(p.label));
const best = ph.filter(p => p.label.startsWith("hold") || p.label.startsWith("headroom"));
const at = n => ph.filter(p => p.phones === n);
const agg = (rows, f) => rows.length ? Math.max(...rows.map(f).filter(v => v != null)) : null;
const line = (lab, rows) => rows.length ? `${lab}: answers p95 ${agg(rows, p => p.http.p95)}ms · live updates p95 ${agg(rows, p => p.delivery.p95)}ms · errors ${(agg(rows, p => p.http.errRate) * 100).toFixed(1)}% · real-user probe p95 ${agg(rows, p => p.canary.p95)}ms` : null;
const out = [];
out.push(r.aborted ? `STOPPED EARLY at ${r.aborted.phones} phones (${r.aborted.at}) — ${r.aborted.why.join("; ")}` : `Completed: held ${Math.max(...best.map(p=>p.phones).concat([0]))} phones, peak ${r.peakPhones}.`);
out.push(`Baseline (no load): real-user probe p95 ${r.baseline.canary.p95}ms`);
[100, 250, 500, 750, 1000, 2000].forEach(n => { const l = line(n + " phones", at(n)); if (l) out.push(l); });
out.push(`Live connections open at peak: ${Math.max(...ph.map(p => p.sockets))} · test writes: ${r.writes} · ${r.minutes} min`);
if (r.headroomSkipped) out.push(`2000-phone step skipped: ${r.headroomSkipped}`);
console.log(out.join("\n"));
' "$OUT" 2>&1)
fi
echo "$SUMMARY"

{
  echo "# Load test $STAMP"
  echo
  echo "Simulated golfer phones against production (tools/loadtest). Each phone: own realtime socket + the golfer"
  echo "startup feeds + background reads; a registration written every 2s to a hidden test event is timed from"
  echo "write to arrival on every phone. Test rows removed (left: $LEFT)."
  echo
  echo '```'
  echo "$SUMMARY"
  echo '```'
  echo
  echo "Raw per-30s windows: $(basename "$OUT") · log: $(basename "$LOG")"
} > "$REPORT"

if [ "${SMOKE:-0}" != "1" ]; then
  TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' "$HOME/.claude/channels/telegram/.env" | head -1 | cut -d= -f2- | tr -d "\"' \r")
  TEXT="MyCaddiPro load test (midnight run) — results

$SUMMARY

Test data cleaned up (rows left: $LEFT). Full report: project-memory/$(basename "$REPORT")"
  [ -n "$TOKEN" ] && curl -s -m 30 "https://api.telegram.org/bot${TOKEN}/sendMessage" \
      --data-urlencode "chat_id=8695972914" --data-urlencode "text=${TEXT}" | grep -q '"ok":true' && echo "telegram sent"
  crontab -l 2>/dev/null | grep -v 'tools/loadtest/run.sh' | crontab -
fi
echo "== done"
