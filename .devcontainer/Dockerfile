FROM mcr.microsoft.com/devcontainers/javascript-node:20-bookworm

# Install the Tailscale CLI so devcontainer hooks can run `tailscale serve`
RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        curl \
        gnupg \
    && curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.noarmor.gpg \
        | tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null \
    && curl -fsSL https://pkgs.tailscale.com/stable/debian/bookworm.tailscale-keyring.list \
        | tee /etc/apt/sources.list.d/tailscale.list >/dev/null \
    && apt-get update \
    && apt-get install --yes --no-install-recommends tailscale \
    && rm -rf /var/lib/apt/lists/*
