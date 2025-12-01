#!/usr/bin/env bash

set -euo pipefail

log() {
	echo "[tailscale-serve] $*"
}

if ! command -v tailscale >/dev/null 2>&1 || ! command -v tailscaled >/dev/null 2>&1; then
	log 'tailscale CLI not installed; skipping port forwarding.'
	exit 0
fi

TS_SOCKET="${TAILSCALE_SOCKET:-/var/run/tailscale/tailscaled.sock}"
TS_STATE_DIR="${TAILSCALE_STATE_DIR:-/var/lib/tailscale}"
TS_STATE="${TS_STATE_DIR}/tailscaled.state"
TS_LOG="${TAILSCALE_LOG_FILE:-/var/log/tailscaled.log}"
SERVE_PORT="${TAILSCALE_SERVE_PORT:-5105}"
SERVE_TARGET="${TAILSCALE_SERVE_TARGET:-tcp://localhost:5105}"
AUTH_KEY="${TAILSCALE_AUTHKEY:-}"
HOSTNAME="${TAILSCALE_HOSTNAME:-cambermast-work-hub-dev}"

ensure_daemon() {
	if pgrep -x tailscaled >/dev/null 2>&1; then
		return
	}

	log 'Starting tailscaled in userspace networking mode...'
	sudo mkdir -p "$(dirname "${TS_SOCKET}")" "${TS_STATE_DIR}" "$(dirname "${TS_LOG}")"
	sudo nohup tailscaled \
		--tun=userspace-networking \
		--state="${TS_STATE}" \
		--socket="${TS_SOCKET}" \
		>"${TS_LOG}" 2>&1 &

	for _ in $(seq 1 20); do
		if sudo test -S "${TS_SOCKET}"; then
			return
		fi
		sleep 0.25
	end

	log "tailscaled socket (${TS_SOCKET}) not available; skipping serve configuration."
	exit 0
}

wait_for_status() {
	for _ in $(seq 1 10); do
		if sudo tailscale --socket="${TS_SOCKET}" status >/dev/null 2>&1; then
			return 0
		fi
		sleep 1
	done

	return 1
}

ensure_daemon

if ! wait_for_status; then
	if [[ -z "${AUTH_KEY}" ]]; then
		log 'tailscaled is running but not authenticated. Set TAILSCALE_AUTHKEY or run `sudo tailscale up` in the container.'
		exit 0
	fi

	log 'Authenticating tailscaled session...'
	if ! sudo tailscale --socket="${TS_SOCKET}" up \
		--authkey="${AUTH_KEY}" \
		--hostname="${HOSTNAME}" \
		--accept-dns=true \
		--accept-routes=true; then
		log 'tailscale up failed; skipping serve configuration.'
		exit 0
	fi

	if ! wait_for_status; then
		log 'tailscaled is still not reporting as healthy; skipping serve configuration.'
		exit 0
	fi
fi

log "Configuring tailscale serve to expose ${SERVE_TARGET} on tailnet port ${SERVE_PORT}..."
if ! sudo tailscale --socket="${TS_SOCKET}" serve --tcp="${SERVE_PORT}" "${SERVE_TARGET}"; then
	log 'tailscale serve command failed; port sharing not enabled.'
	exit 0
fi

log 'tailscale serve configuration completed.'
