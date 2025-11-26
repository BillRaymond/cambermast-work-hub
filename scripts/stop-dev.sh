#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PID_FILE=".devserver.pid"

if [[ ! -f "$PID_FILE" ]]; then
	echo "Dev server is not running (no PID file)."
	exit 0
fi

PID="$(cat "$PID_FILE")"

if ps -p "$PID" > /dev/null 2>&1; then
	kill "$PID"
	wait "$PID" 2>/dev/null || true
	echo "Stopped dev server (PID $PID)."
else
	echo "Dev server PID $PID is not active."
fi

rm -f "$PID_FILE"
