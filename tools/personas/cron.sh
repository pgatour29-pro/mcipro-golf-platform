#!/usr/bin/env bash
# Persona test scheduler (2026-10-04, Pete: "i want this to be a constant reporting … in a TEST module
# next to the Engagement"). Cron runs this every 10 minutes:
#
#   */10 * * * * /mnt/c/Users/pete/Documents/MciPro/tools/personas/cron.sh
#
# It starts a full persona run when the live app version changed (a deploy just landed) or when the
# last run is INTERVAL_MIN old; otherwise it exits at once. Each run is filed by publish.mjs and shows
# in Admin → Test. flock means two runs can never overlap. The personas use their own browser session
# (AGENT_BROWSER_SESSION=personas), so a run never touches anyone else's agent-browser.
#
# GOLFER_ID (the golfer persona's read-only account) lives in tools/personas/.env — never in git.
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/../.." && pwd)"
STATE="$DIR/.schedule-state"   # "<epoch> <version>" of the last run started
LOG="$DIR/.schedule.log"
INTERVAL_MIN="${INTERVAL_MIN:-60}"
export PATH="$HOME/.npm-global/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

exec 9>"$DIR/.schedule.lock"
flock -n 9 || exit 0

[ -f "$DIR/.env" ] && . "$DIR/.env"
log() { echo "$(date -u +%FT%TZ) $*" >> "$LOG"; }

ver=$(curl -fsS --max-time 20 https://mycaddipro.com/sw.js 2>/dev/null | sed -n "s/.*SW_VERSION *= *'[^']*\(v[0-9][0-9]*\)'.*/\1/p" | head -1)
if [ -z "$ver" ]; then log "site did not answer — no run"; exit 0; fi

last_t=0; last_v=""
[ -f "$STATE" ] && read -r last_t last_v < "$STATE"
now=$(date +%s)
if [ -n "$last_v" ] && [ "$ver" != "$last_v" ]; then trig=deploy
elif [ $(( now - ${last_t:-0} )) -ge $(( INTERVAL_MIN * 60 )) ]; then trig=schedule
else exit 0
fi
# written before the run, so a run that crashes is not retried every 10 minutes
echo "$now $ver" > "$STATE"

cd "$ROOT" || exit 1
log "run start ($trig, $ver)"
out=$(AGENT_BROWSER_SESSION=personas AGENT_BROWSER_SCREENSHOT_FORMAT=jpeg AGENT_BROWSER_SCREENSHOT_QUALITY=70 \
      PERSONA_TRIGGER="$trig" PERSONA_VERSION="$ver" GOLFER_ID="${GOLFER_ID:-}" \
      timeout 1500 node "$DIR/run.mjs" 2>&1)
code=$?
AGENT_BROWSER_SESSION=personas agent-browser close >/dev/null 2>&1
dir=$(printf '%s\n' "$out" | sed -n 's/^report: \(.*\)\/report\.md$/\1/p' | tail -1)
if [ -z "$dir" ]; then log "run produced no report (exit $code): $(printf '%s' "$out" | tail -3 | tr '\n' ' ')"; exit 0; fi
log "run done (exit $code) $dir"

timeout 900 node "$DIR/publish.mjs" "$dir" >> "$LOG" 2>&1 || log "publish failed for $dir"

# once a day: drop old rows and screenshots online, and local run folders older than 3 days
if [ ! -f "$DIR/.schedule-pruned" ] || [ -n "$(find "$DIR/.schedule-pruned" -mmin +1440 2>/dev/null)" ]; then
  timeout 600 node "$DIR/publish.mjs" --prune >> "$LOG" 2>&1 && touch "$DIR/.schedule-pruned"
  find "$DIR/out" -mindepth 1 -maxdepth 1 -type d -mtime +3 -exec rm -rf {} + 2>/dev/null
fi
# keep the log short
tail -n 2000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
exit 0
