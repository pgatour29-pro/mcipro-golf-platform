#!/usr/bin/env bash
set -euo pipefail
CID=${CID:-00000000-0000-0000-0000-000000000001}
UID=${UID:-00000000-0000-0000-0000-000000000002}
MID=$(python - <<'PY'
import uuid; print(uuid.uuid4())
PY
)
curl -sS -H 'Content-Type: application/json' -d "{"conversation_id":"$CID","message_id":"$MID","sender_id":"$UID","body":"hello"}" http://localhost:4000/v1/messages | jq .
