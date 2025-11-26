#!/usr/bin/env bash
set -euo pipefail

# Always run from workspace root regardless of VS Code's cwd
cd /workspaces/cambermast-work-hub

./scripts/start-dev.sh
