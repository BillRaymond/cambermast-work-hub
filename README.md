# Cambermast Works (frontend)

This is the SvelteKit site that runs at `https://w.cambermast.com`. It gives the homelab a polished front door where each workspace lives under a predictable `/project-*` route.

## Stack

- **SvelteKit + SSR** so every route can hydrate with data from Postgres, n8n, or Django.
- **TypeScript strict** enforced via `npm run check`.
- **Tailwind CSS** with the Cambermast palette, typography tokens, and helper utilities defined in `tailwind.config.ts`.
- **Prettier-ready** thanks to the default SvelteKit tooling (`npm run format` if you enable it later).

## Local development (VS Code dev container)

1. Copy `.env.example` to `.env` (already done in this repo) and adjust ports or `PUBLIC_SITE_ORIGIN` if needed.
2. Open the folder in VS Code, run **Dev Containers: Reopen in Container**, and wait for the Node 20 container to build. `npm install` runs automatically after the container is created.
3. Start the dev server with:

	```bash
	npm run dev -- --host 0.0.0.0 --port 5173
	```

	Forward port 5173 through VS Code to preview the site in your browser.
4. Use git inside the container to commit/sync changes. This repo stays separate from the homelab configuration.

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

The Docker entrypoint inside the homelab `sveltekit` service runs the same commands, so redeploys always serve a fresh build.

## Adding workspaces

1. Update `src/lib/data/projects.ts` with a new object. This automatically feeds the homepage navigation and the shared `[slug]` route.
2. (Optional) Drop a bespoke page in `src/routes/<slug>/+page.svelte` if you want a custom layout.
3. Rebuild or restart `docker compose` from the parent directory.

## Styling tokens

Tailwind exposes:

- `font-sans`, `font-display`, and `font-mono` families mapped to Inter, Source Sans 3, and JetBrains Mono
- Color namespaces `primary`, `secondary`, `accent`, and `semantic`
- Card shadows, rounded corners, and a radial grid background utility

Stick to these tokens and your sub-sites will always align with cambermast.com.
