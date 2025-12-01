#!/usr/bin/env bash
set -euo pipefail

WORKDIR="/app/web"
PORT_NUMBER="${PORT:-4173}"

cd "${WORKDIR}"

if [[ -f package-lock.json ]]; then
	NODE_ENV=development npm ci
else
	NODE_ENV=development npm install
fi

NODE_ENV=development npm run build

NODE_ENV=production exec npm run preview -- --host 0.0.0.0 --port "${PORT_NUMBER}"
