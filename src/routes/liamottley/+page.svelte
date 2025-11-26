<svelte:head>
	<title>Liam Ottley · Cambermast Work Hub</title>
	<meta
		name="description"
		content="Progress tracker for the Liam Ottley collaboration inside the Cambermast Work Hub."
	/>
</svelte:head>

<article class="space-y-10">
	<section class="section-shell border border-white/50">
		<div class="flex flex-col gap-6 lg:flex-row">
			<div class="flex-1 space-y-4">
				<span class="badge border bg-primary-electric/10 text-primary-electric">Active collaboration</span>
				<h1 class="text-4xl font-semibold text-primary-navy">Liam Ottley · Digital production runway</h1>
				<p class="text-lg text-secondary-slate/90">
					This subsite keeps the Cambermast deliverables for Liam Ottley collected in one spot—strategy notes,
					visual prototypes, and production checklists stay here until the work rolls into production.
				</p>
				<p class="text-sm uppercase tracking-[0.3em] text-secondary-slate/70">Current sprint</p>
				<p class="text-primary-navy">Experience design + systems integration prep</p>
			</div>
			<div class="flex-1 rounded-3xl border border-white/60 bg-white/80 p-6 shadow-inner">
				<h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">Status heatmap</h2>
				<dl class="mt-5 grid gap-4 sm:grid-cols-2">
					<div class="rounded-2xl border border-primary-electric/20 bg-primary-electric/5 p-4">
						<dt class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">Experience narrative</dt>
						<dd class="mt-2 text-2xl font-semibold text-primary-navy">Final review</dd>
					</div>
					<div class="rounded-2xl border border-accent-mint/30 bg-accent-mint/10 p-4">
						<dt class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">Technical wiring</dt>
						<dd class="mt-2 text-2xl font-semibold text-primary-navy">Sandbox ready</dd>
					</div>
					<div class="rounded-2xl border border-secondary-cool bg-white/90 p-4">
						<dt class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">Content drops</dt>
						<dd class="mt-2 text-2xl font-semibold text-primary-navy">3 queued</dd>
					</div>
					<div class="rounded-2xl border border-semantic-warning/40 bg-semantic-warning/10 p-4">
						<dt class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">Dependencies</dt>
						<dd class="mt-2 text-2xl font-semibold text-primary-navy">Awaiting approvals</dd>
					</div>
				</dl>
				<p class="mt-4 text-sm text-secondary-slate/80">
					Next workshop: align CRM automation hooks + editorial sign-off before handing off to development.
				</p>
			</div>
		</div>
	</section>

	<section class="grid gap-6 lg:grid-cols-3">
		<div class="section-shell border border-white/50">
			<p class="badge border bg-white/80 text-primary-navy">Pillar 01</p>
			<h3 class="mt-3 text-2xl font-semibold text-primary-navy">Brand systems</h3>
			<p class="mt-2 text-sm text-secondary-slate/90">
				Solidify the color, typography, and motion language so every screen reflects Liam Ottley’s personality
				while staying compliant with Cambermast accessibility targets.
			</p>
		</div>
		<div class="section-shell border border-white/50">
			<p class="badge border bg-white/80 text-primary-navy">Pillar 02</p>
			<h3 class="mt-3 text-2xl font-semibold text-primary-navy">Prototype runway</h3>
			<p class="mt-2 text-sm text-secondary-slate/90">
				High-fidelity SvelteKit prototypes feed stakeholder reviews, with variants stored in this hub for quick
				reference and feedback capture.
			</p>
		</div>
		<div class="section-shell border border-white/50">
			<p class="badge border bg-white/80 text-primary-navy">Pillar 03</p>
			<h3 class="mt-3 text-2xl font-semibold text-primary-navy">Launch operations</h3>
			<p class="mt-2 text-sm text-secondary-slate/90">
				Content schedules, analytics alignment, and automation hooks are staged here before syncing with the
				public cambermast.com stack.
			</p>
		</div>
	</section>

	<section class="section-shell border border-white/40">
		<div class="grid gap-8 lg:grid-cols-2">
			<div>
				<h4 class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">
					Deliverable tracker
				</h4>
				<ul class="mt-4 space-y-3 text-secondary-slate/90">
					<li class="flex items-start gap-3">
						<span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary-electric"></span>
						Brand + systems deck (v03) ready for executive playback.
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary-electric"></span>
						Interactive prototype package bundling hero, service grid, and testimonial loops.
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary-electric"></span>
						Migration plan outlining analytics, CRM, and automation dependencies.
					</li>
					<li class="flex items-start gap-3">
						<span class="mt-1 h-1.5 w-1.5 rounded-full bg-primary-electric"></span>
						Support resources + governance outline for the post-launch team.
					</li>
				</ul>
			</div>
			<div class="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-inner">
				<h4 class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">Roadmap</h4>
				<ol class="mt-5 space-y-4 text-sm text-secondary-slate/90">
					<li>
						<span class="font-semibold text-primary-navy">Week 1:</span> onboarding recap + confirm content
						sources from Liam Ottley.
					</li>
					<li>
						<span class="font-semibold text-primary-navy">Week 2-3:</span> iterate on hero concepts, service
						messaging, and interaction prototypes inside Figma + SvelteKit.
					</li>
					<li>
						<span class="font-semibold text-primary-navy">Week 4:</span> connect CRM automations, analytics
						tags, and QA the responsive build.
					</li>
					<li>
						<span class="font-semibold text-primary-navy">Launch window:</span> integrate feedback, lock
						production URLs, and hand off the deployment runbook.
					</li>
				</ol>
				<p class="mt-4 text-sm text-secondary-slate/80">
					Questions? Reach out via the main Cambermast contact form so the crew can route you to the right
					stream.
				</p>
			</div>
		</div>
	</section>
</article>
