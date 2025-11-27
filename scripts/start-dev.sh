#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PID_FILE=".devserver.pid"
LOG_FILE=".devserver.log"
PORT=5173

if [[ -f "$PID_FILE" ]]; then
    if ps -p "$(cat "$PID_FILE")" > /dev/null 2>&1; then
        echo "Dev server already running (PID $(cat "$PID_FILE"))"
        exit 0
    else
        rm -f "$PID_FILE"
    fi
fi

nohup npm run dev -- --host 0.0.0.0 --port "$PORT" > "$LOG_FILE" 2>&1 &
PID=$!
echo $PID > "$PID_FILE"
echo "Started dev server on port $PORT (PID $PID). Logs: $LOG_FILE"

echo "If you want to expose this dev server over Tailscale, run:"
echo "tailscale serve --tcp=5173 tcp://localhost:5173"
