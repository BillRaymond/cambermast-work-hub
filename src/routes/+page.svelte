<script lang="ts">
	const formattedLastDeployment = formatDeploymentDate(__BUILD_TIMESTAMP__);

	function formatDeploymentDate(isoString: string) {
		const date = new Date(isoString);

		if (Number.isNaN(date.getTime())) {
			return 'unknown';
		}

		const formatter = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/Los_Angeles',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		const parts = formatter.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
			if (part.type !== 'literal') {
				acc[part.type] = part.value;
			}

			return acc;
		}, {});
		const { year, month, day, hour, minute } = parts;

		if (!year || !month || !day || !hour || !minute) {
			return 'unknown';
		}

		return `${year}-${month}-${day} ${hour}:${minute} PT`;
	}
</script>

<svelte:head>
	<title>Cambermast Work Hub</title>
	<meta name="description" content="Cambermast Work Hub · private client previews and contact info." />
</svelte:head>

<section class="section-shell relative overflow-hidden">
	<div class="pointer-events-none absolute inset-0 -z-10">
		<div class="absolute -left-8 -top-10 h-48 w-48 rounded-full bg-primary-electric/10 blur-3xl"></div>
		<div class="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-accent-mint/20 blur-[120px]"></div>
	</div>
	<div class="space-y-6 text-primary-navy">
		<p class="badge border bg-white/70 text-primary-electric shadow-sm shadow-primary-electric/20">
			Cambermast Work Hub
		</p>
		<h1 class="text-4xl font-semibold sm:text-5xl">In-progress work lives here.</h1>
		<p class="text-lg text-secondary-slate/90">
			This space keeps select client collaborations together while they are actively being built. For new
			requests or access to additional workrooms, reach out through the Cambermast contact form.
		</p>
		<div class="flex flex-wrap gap-4">
			<a
				class="inline-flex items-center gap-2 rounded-full bg-primary-electric px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-electric/20 transition hover:-translate-y-0.5"
				href="https://www.cambermast.com/contact"
				target="_blank"
				rel="noreferrer"
			>
				Contact Cambermast
				<span aria-hidden="true">↗</span>
			</a>
		</div>
		<p class="text-xs text-secondary-slate/80">Last deployment: {formattedLastDeployment}</p>
	</div>
</section>
