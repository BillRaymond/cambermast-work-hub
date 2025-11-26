# Cambermast Works (frontend)

This is the SvelteKit site that runs at `https://w.cambermast.com`. It gives the homelab a polished front door where each workspace lives under a predictable `/project-*` route.

## Stack

- **SvelteKit + SSR** so every route can hydrate with data from Postgres, n8n, or Django.
- **TypeScript strict** enforced via `npm run check`.
- **Tailwind CSS** with the Cambermast palette, typography tokens, and helper utilities defined in `tailwind.config.ts`.
- **Prettier-ready** thanks to the default SvelteKit tooling (`npm run format` if you enable it later).

## Local development

```bash
cd web
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Production build

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

The Docker entrypoint inside `../entrypoint.sh` runs the exact commands above on every container start, so redeploys always serve a fresh build.

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
