<script lang="ts">
	import type { ProjectSpace } from '$lib/data/projects';
	import type { DetailData } from './+page';

	const toneClasses: Record<ProjectSpace['tone'], string> = {
		info: 'bg-primary-electric/10 text-primary-electric border-primary-electric/40',
		success: 'bg-semantic-success/15 text-semantic-success border-semantic-success/40',
		warning: 'bg-semantic-warning/15 text-semantic-warning border-semantic-warning/40'
	};

	const { data }: { data: DetailData } = $props();
	const { project } = data;
</script>

<svelte:head>
	<title>{project.title} · Cambermast Works</title>
	<meta name="description" content={project.description} />
</svelte:head>

<article class="space-y-8">
	<section class="section-shell border border-white/50">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-start">
			<div class="flex-1 space-y-4">
				<div class="flex flex-wrap items-center gap-3">
					<span class={`badge border ${toneClasses[project.tone]}`}>{project.status}</span>
					<p class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/60">
						/{project.slug}
					</p>
				</div>
				<h1 class="text-4xl font-semibold text-primary-navy">{project.title}</h1>
				<p class="text-lg text-secondary-slate/90">{project.narrative}</p>

				<div class="flex flex-wrap gap-2">
					{#each project.tags as tag}
						<span class="rounded-full bg-secondary-cool/80 px-3 py-1 text-xs font-semibold text-primary-navy">
							{tag}
						</span>
					{/each}
				</div>
			</div>
			<div class="flex-1 rounded-3xl border border-white/60 bg-white/70 p-6">
				<h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">
					Health snapshot
				</h2>
				<dl class="mt-4 grid gap-4 sm:grid-cols-2">
					{#each project.metrics as metric}
						<div class="rounded-2xl border border-secondary-cool/80 bg-white/80 p-4">
							<dt class="text-xs uppercase tracking-[0.3em] text-secondary-slate/60">{metric.label}</dt>
							<dd class="mt-2 text-2xl font-semibold text-primary-navy">{metric.value}</dd>
						</div>
					{/each}
				</dl>
				<p class="mt-4 text-sm text-secondary-slate/80">
					Next milestone: {project.nextSteps.join(' · ')}
				</p>
			</div>
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-3">
		{#each project.sections as section}
			<div class="section-shell border border-white/50">
				<h3 class="text-xl font-semibold text-primary-navy">{section.title}</h3>
				<p class="mt-2 text-sm text-secondary-slate/90">{section.body}</p>
				{#if section.points}
					<ul class="mt-4 space-y-2 text-sm text-secondary-slate/90">
						{#each section.points as point}
							<li class="flex items-start gap-2">
								<span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary-electric"></span>
								{point}
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</section>
</article>
