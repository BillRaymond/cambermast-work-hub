<script lang="ts">
	import type { ProjectSpace } from '$lib/data/projects';
	import type { OverviewData } from './+page';

	const toneClasses: Record<ProjectSpace['tone'], string> = {
		info: 'bg-primary-electric/10 text-primary-electric border-primary-electric/40',
		success: 'bg-semantic-success/15 text-semantic-success border-semantic-success/40',
		warning: 'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/40'
	};

	const { data }: { data: OverviewData } = $props();
	const { featured, supporting, insights } = data;
</script>

<svelte:head>
	<title>Cambermast Works · Homelab Showcase</title>
	<meta
		name="description"
		content="A SvelteKit + Tailwind launchpad for the Cambermast homelab, ready for new /project-* routes."
	/>
</svelte:head>

<section class="section-shell relative overflow-hidden">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="absolute -left-8 -top-10 h-48 w-48 rounded-full bg-primary-electric/10 blur-3xl"></div>
		<div class="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-accent-mint/20 blur-[120px]"></div>
	</div>
	<div class="flex flex-col gap-10 lg:flex-row">
		<div class="flex-1">
			<p class="badge border bg-white/70 text-primary-electric shadow-sm shadow-primary-electric/20">
				SvelteKit · Tailwind · SSR
			</p>
			<h1 class="mt-4 text-4xl font-semibold text-primary-navy sm:text-5xl">
				Build and showcase every homelab experiment from one URL.
			</h1>
			<p class="mt-4 text-lg text-secondary-slate/90">
				`w.cambermast.com` is wired through Caddy, lives on the shared <code>homelab_net</code>,
				and mirrors the Cambermast design tokens so each /project-* route feels cohesive.
			</p>
			<div class="mt-6 flex flex-wrap gap-3">
				<a
					class="inline-flex items-center gap-2 rounded-full bg-primary-electric px-6 py-3 font-semibold text-white shadow-lg shadow-primary-electric/20 transition hover:-translate-y-0.5"
					href={`/${featured.slug}`}
				>
					View {featured.title}
					<span aria-hidden="true">↗</span>
				</a>
				<a
					class="inline-flex items-center gap-2 rounded-full border border-primary-electric/30 px-6 py-3 font-semibold text-primary-electric transition hover:bg-primary-electric/5"
					href="https://github.com/billraymond/homelab/tree/main/sveltekit"
					target="_blank"
					rel="noreferrer"
				>
					Browse source
				</a>
			</div>
			<dl class="mt-10 grid gap-6 sm:grid-cols-3">
				{#each insights as insight}
					<div class="rounded-2xl border border-white/50 bg-white/70 p-4 text-center shadow-sm">
						<dt class="text-xs uppercase tracking-[0.2em] text-secondary-slate/70">{insight.label}</dt>
						<dd class="mt-2 text-2xl font-semibold text-primary-navy">{insight.value}</dd>
					</div>
				{/each}
			</dl>
		</div>

		<div class="flex-1 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-card">
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-xl font-semibold text-primary-navy">{featured.title}</h2>
				<span class={`badge border ${toneClasses[featured.tone]}`}>
					{featured.status}
				</span>
			</div>
			<p class="mt-3 text-secondary-slate/90">{featured.description}</p>
			<ul class="mt-6 space-y-3">
				{#each featured.highlights as highlight}
					<li class="flex items-start gap-3 text-sm text-secondary-slate">
						<span class="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-mint/20 font-semibold text-primary-navy">
							+
						</span>
						<span>{highlight}</span>
					</li>
				{/each}
			</ul>
			<div class="mt-8 grid gap-4 md:grid-cols-2">
				{#each featured.metrics as metric}
					<div class="rounded-2xl border border-secondary-cool bg-white/80 p-4">
						<p class="text-xs uppercase tracking-[0.25em] text-secondary-slate/70">{metric.label}</p>
						<p class="mt-2 text-2xl font-semibold text-primary-navy">{metric.value}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>

<section class="grid gap-6 lg:grid-cols-2">
	{#each supporting as project}
		<article class="section-shell flex flex-col gap-4 border border-white/50">
			<div class="flex items-start justify-between gap-4">
				<div>
					<h3 class="text-2xl font-semibold text-primary-navy">{project.title}</h3>
					<p class="mt-1 text-secondary-slate/90">{project.description}</p>
				</div>
				<span class={`badge border ${toneClasses[project.tone]}`}>
					{project.status}
				</span>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each project.tags as tag}
					<span class="rounded-full bg-secondary-cool/80 px-3 py-1 text-xs font-semibold text-primary-navy">
						{tag}
					</span>
				{/each}
			</div>
			<ul class="list-disc space-y-1 pl-5 text-secondary-slate/90">
				{#each project.highlights as highlight}
					<li>{highlight}</li>
				{/each}
			</ul>
			<div class="flex flex-wrap gap-4">
				<a
					class="text-sm font-semibold text-primary-electric transition hover:text-primary-navy"
					href={`/${project.slug}`}
				>
					Open /{project.slug}
				</a>
				<span class="text-sm text-secondary-slate/70">Next: {project.nextSteps[0]}</span>
			</div>
		</article>
	{/each}
</section>

<section class="section-shell border border-white/40">
	<div class="grid gap-8 lg:grid-cols-2">
		<div>
			<p class="badge border bg-primary-electric/10 text-primary-electric">Repeatable workflow</p>
			<h2 class="mt-4 text-3xl font-semibold text-primary-navy">Launch a new /project-* route</h2>
			<p class="mt-3 text-secondary-slate/90">
				The site ships with a structured data file (<code>src/lib/data/projects.ts</code>) so adding
				a new workspace is editing + redeploy, not guesswork.
			</p>
			<ol class="mt-6 space-y-3 text-secondary-slate/90">
				<li>
					<span class="font-semibold text-primary-navy">1.</span> Duplicate an entry inside
					<code>projects.ts</code>, update the slug + copy.
				</li>
				<li>
					<span class="font-semibold text-primary-navy">2.</span> Add a matching page under <code>src/routes/[slug]</code>
					if you need custom UI, otherwise the shared detail view handles it.
				</li>
				<li>
					<span class="font-semibold text-primary-navy">3.</span> Rebuild the container or restart the compose
					stack so the entrypoint script runs <code>npm run build</code>.
				</li>
			</ol>
		</div>
		<div class="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-inner">
			<h3 class="text-xl font-semibold text-primary-navy">Infrastructure wiring</h3>
			<ul class="mt-4 space-y-3 text-sm text-secondary-slate/90">
				<li>
					<span class="font-semibold text-primary-navy">homelab_net</span> keeps the container reachable from
					Caddy as <code>sveltekit:4173</code>.
				</li>
				<li>
					<span class="font-semibold text-primary-navy">Tailscale sidecar</span> mirrors the pattern used by
					n8n and Postgres for secure cross-host access.
				</li>
				<li>
					<span class="font-semibold text-primary-navy">Bind mount</span> exposes <code>./sveltekit/web</code>
					into the container so redeploys never drop your content.
				</li>
				<li>
					<span class="font-semibold text-primary-navy">Entry script</span> runs <code>npm install</code>,
					<code>npm run build</code>, and <code>npm run preview -- --host 0.0.0.0 --port 4173</code> to keep the
					server hot.
				</li>
			</ul>
		</div>
	</div>
</section>
