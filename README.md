# Cambermast Work Hub (frontend)

This is the SvelteKit site that powers the Cambermast Work Hub. It now functions as a simple front door for the Work Hub overview plus the `liamottley` subsite.

## Stack

- **SvelteKit + SSR** so every route can hydrate with data from Postgres, n8n, or Django.
- **TypeScript strict** enforced via `npm run check`.
- **ARIA-first patterns** ensure shared components stay accessible by default.
- **Tailwind CSS** with the Cambermast palette, typography tokens, and helper utilities defined in `tailwind.config.ts`.
- **Prettier-ready** thanks to the default SvelteKit tooling (`npm run format` if you enable it later).

## Local development (VS Code dev container)

1. Copy `.env.example` to `.env` (already done in this repo) and adjust `PUBLIC_SITE_ORIGIN` or set `VITE_DEV_PORT` if you need a non-default dev port (5105).
2. Open the folder in VS Code, run **Dev Containers: Reopen in Container**, and wait for the Node 20 container to build. `npm install` runs automatically after the container is created.
3. When VS Code attaches to the container it automatically opens a terminal that runs `npm run dev`. Forward port 5105 through VS Code to preview the site in your browser. Use `Ctrl+C` in that terminal to stop the dev server, then rerun `npm run dev` if you need it again later.
4. Use git inside the container to commit/sync changes. This repo stays separate from the homelab configuration.

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

The Docker entrypoint inside the homelab `sveltekit` service runs the same commands, so redeploys always serve a fresh build.

## Styling tokens

Tailwind exposes:

- `font-sans`, `font-display`, and `font-mono` families mapped to Inter, Source Sans 3, and JetBrains Mono
- Color namespaces `primary`, `secondary`, `accent`, and `semantic`
- Card shadows, rounded corners, and a radial grid background utility

Stick to these tokens and your sub-sites will always align with cambermast.com.

## Editing the current pages

- `src/routes/+page.svelte` renders the lightweight Cambermast Work Hub overview with the contact link.
- `src/routes/liamottley/+page.svelte` acts as the dedicated Liam Ottley subsite and can be iterated on without touching other routes.

## Running locally
If you need to access this site from another device on your network, you can use Tailscale to expose the local development server:
```
tailscale serve --tcp=5105 tcp://localhost:5105
```

---

_Automated deploy test note – safe to remove once validated._
