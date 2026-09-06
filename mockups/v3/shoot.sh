#!/usr/bin/env bash
# Screenshot 3.0 mockup pages. Usage: ./shoot.sh [session] [glob]
# -m.html pages → 390×844 ; -d.html pages → 1440×900. Output: shots/<name>.png
set -u
cd "$(dirname "$0")"
SESSION="${1:-v3}"; GLOB="${2:-pages/*.html}"
export AGENT_BROWSER_SESSION="$SESSION"
curl -s -o /dev/null http://127.0.0.1:8765/kit/mcp3.css || (python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &) ; sleep 1
mkdir -p shots
for f in $GLOB; do
  n=$(basename "$f" .html)
  case "$n" in *-m) W=390; H=844;; *-d) W=1440; H=900;; *) W=390; H=844;; esac
  agent-browser open "http://127.0.0.1:8765/$f" >/dev/null 2>&1
  agent-browser set viewport $W $H >/dev/null 2>&1
  agent-browser wait 1800 >/dev/null 2>&1
  # wait for sprite + fonts flags (max ~4s)
  for i in 1 2 3 4 5 6 7 8; do
    ok=$(agent-browser eval "document.documentElement.getAttribute('data-sprite')==='ready' && document.documentElement.getAttribute('data-fonts')==='ready'" 2>/dev/null | tr -d '[:space:]')
    [ "$ok" = "true" ] && break; sleep 0.5
  done
  iw=$(agent-browser eval "window.innerWidth" 2>/dev/null | tr -d '[:space:]')
  agent-browser screenshot "shots/$n.png" >/dev/null 2>&1 && echo "shot $n (${iw}px)" || echo "FAIL $n"
done
