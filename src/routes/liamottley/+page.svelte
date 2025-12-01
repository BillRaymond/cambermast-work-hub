<script lang="ts">
	import { DEV_TITLE_PREFIX } from '$lib/title-prefix';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { onDestroy } from 'svelte';
	import { flip } from 'svelte/animate';
	import { quintOut } from 'svelte/easing';

	type Step = {
		id: string;
		message: string;
		detail?: string;
		kind?: 'info' | 'error' | 'success';
		timestamp: string;
	};

	type PhaseStatus = 'pending' | 'active' | 'done';
	type PhaseDefinition = {
		id: string;
		title: string;
		description: string;
		emoji: string;
	};
	type PhaseState = PhaseDefinition & {
		status: PhaseStatus;
		note?: string;
	};

	export let data: PageData;

	const defaultUrl = 'https://n8n.cambermast.com/webhook-test/2999c2ae-9b07-40be-ae0e-8ae5bb56090b';
	const STORY_TYPES = [
		{
			id: 'latest',
			title: 'Latest AI News',
			description: 'Fresh drops from the labs, feeds, and rumor mills.',
			prompt: 'Latest AI news and breakthroughs'
		},
		{
			id: 'policy',
			title: 'AI Policy Watch',
			description: 'Regulation, compliance shake-ups, and global policy shifts.',
			prompt: 'AI policy and regulation news'
		},
		{
			id: 'product',
			title: 'Breakout Product Launches',
			description: 'New tools, AI assistants, and platform launches landing this week.',
			prompt: 'Breakout AI product launches and feature drops worth covering'
		},
		{
			id: 'research',
			title: 'Research Signals',
			description: 'Labs, arXiv, and stealth research that could spark a video.',
			prompt: 'Cutting-edge AI research papers, pilots, and lab reveals'
		},
		{
			id: 'creator',
			title: 'Creator & Community Hype',
			description: 'Stories bubbling up from X, Discord, and indie builders.',
			prompt: 'Creator-led AI trends, viral tools, and community chatter'
		},
		{
			id: 'ops',
			title: 'AI Ops Playbooks',
			description: 'Workflow, automation, and ops wins that deserve a breakdown.',
			prompt: 'AI workflow and operations playbooks with measurable wins'
		}
	] as const;
	type StoryType = (typeof STORY_TYPES)[number];
	const defaultStoryType = STORY_TYPES[0];

	const derivedCallbackUrl = `${data.callbackBaseUrl}/api/liamottley/callback/${data.sessionId}`;
	const callbackStreamUrl = `${data.callbackBaseUrl}/api/liamottley/callback/stream/${data.sessionId}`;

		const PHASE_BLUEPRINT: PhaseDefinition[] = [
			{
				id: 'idea-lab',
				title: 'Idea Lab',
				description: 'Score trend potential and surface validated hooks for content/video.',
			emoji: '💡'
		},
		{
			id: 'handoff',
			title: 'Delivery & Callback',
			description: 'Package the article + callback payload so the site can showcase it.',
			emoji: '🚀'
		}
	];

	const baseStatusCopy = {
		headline: 'Awaiting automation run',
		detail: 'Trigger the POST tester below to watch each stage of the hackathon build sync in real time.',
		highlight: 'AI news aggregator sprint log',
		idea: 'Idea lab warming up with trend data'
	};

	const createPhaseState = (): PhaseState[] =>
		PHASE_BLUEPRINT.map((phase, index) => ({
			...phase,
			status: index === 0 ? 'active' : 'pending'
		}));

	const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
	const asRecord = (value: unknown): Record<string, unknown> | null =>
		typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
	const getString = (value: unknown) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : null);
	const maybeNumber = (value: unknown) => {
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string') {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : null;
		}
		return null;
	};

	const normalizePhaseStatus = (value: string | null): PhaseStatus | null => {
		if (!value) return null;
		const normalized = value.toLowerCase();
		if (['complete', 'completed', 'done', 'finished'].includes(normalized)) return 'done';
		if (['active', 'running', 'in_progress', 'live'].includes(normalized)) return 'active';
		if (['pending', 'waiting', 'queued', 'up_next'].includes(normalized)) return 'pending';
		return null;
	};

	let targetUrl = defaultUrl;
	let callbackUrl = derivedCallbackUrl;
	let selectedStoryTypeId: StoryType['id'] | null = defaultStoryType.id;
	let investigateInput: string = defaultStoryType.prompt;
	let isLoading = false;
	let latestResponse = '';
	let errorMessage = '';
	let steps: Step[] = [];
	let eventSource: EventSource | null = null;

	let phases = createPhaseState();
	let statusHeadline = baseStatusCopy.headline;
	let statusDetail = baseStatusCopy.detail;
	let highlightIdea = baseStatusCopy.highlight;
	let statusIdea = baseStatusCopy.idea;
	let callbackCount = 0;
	let lastCallbackAt: string | null = null;
	let progressOverride: number | null = null;

	const setIdleStatus = () => {
		phases = createPhaseState();
		callbackCount = 0;
		lastCallbackAt = null;
		progressOverride = null;
		statusHeadline = baseStatusCopy.headline;
		statusDetail = baseStatusCopy.detail;
		statusIdea = baseStatusCopy.idea;
		highlightIdea = baseStatusCopy.highlight;
	};

	const prepareForRun = () => {
		phases = createPhaseState();
		callbackCount = 0;
		lastCallbackAt = null;
		progressOverride = null;
		statusHeadline = 'Listening for workflow callbacks';
		statusDetail = 'Listening for the first callback from the n8n workflow.';
		statusIdea = baseStatusCopy.idea;
		highlightIdea = baseStatusCopy.highlight;
	};

	setIdleStatus();

	const progressFromPhases = (currentPhases: PhaseState[]) => {
		const slice = currentPhases.length > 0 ? 100 / currentPhases.length : 0;
		return currentPhases.reduce((value, phase) => {
			if (phase.status === 'done') return value + slice;
			if (phase.status === 'active') return value + slice * 0.6;
			return value;
		}, 0);
	};

	const handleAutomationSignal = (payload: unknown) => {
		const record = asRecord(payload);
		if (!record) return;

		const headline = getString(record.headline ?? record.status ?? record.title);
		if (headline) {
			statusHeadline = headline;
		}

		const detail = getString(record.summary ?? record.detail ?? record.description);
		if (detail) {
			statusDetail = detail;
		}

		const nextIdea = getString(record.idea ?? record.nextIdea ?? record.videoIdea);
		if (nextIdea) {
			statusIdea = nextIdea;
		}

		const highlight = getString(record.highlight ?? record.keyInsight ?? record.heroLine);
		if (highlight) {
			highlightIdea = highlight;
		}

		const progressValue = maybeNumber(record.progress ?? record.percentComplete ?? record.completion);
		if (progressValue !== null) {
			progressOverride = clamp(Math.round(progressValue));
		}

		const phaseToken = getString(
			(record.phase as string | undefined) ??
				(record.stage as string | undefined) ??
				(record.phaseId as string | undefined)
		);

		if (phaseToken) {
			const targetIndex = phases.findIndex(
				(phase) => phase.id === phaseToken || phase.title.toLowerCase() === phaseToken.toLowerCase()
			);

			if (targetIndex !== -1) {
				const incomingStatus =
					normalizePhaseStatus(
						getString((record.phaseStatus as string | undefined) ?? (record.state as string | undefined))
					) ?? 'active';

				const note =
					getString(
						(record.phaseNote as string | undefined) ??
							(record.note as string | undefined) ??
							(record.summary as string | undefined)
					 ) ?? undefined;

				phases = phases.map((phase, index) => {
					if (index < targetIndex) {
						return { ...phase, status: 'done' };
					}

					if (index === targetIndex) {
						return { ...phase, status: incomingStatus, note };
					}

					return { ...phase, status: 'pending' };
				});
			}
		}
	};

	const pushStep = (message: string, detail?: string, kind: Step['kind'] = 'info') => {
		const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

		const entry: Step = {
			id,
			message,
			detail,
			kind,
			timestamp: new Date().toISOString()
		};

		steps = [entry, ...steps];
	};

	const startCallbackStream = () => {
		if (!browser) return;

		eventSource?.close();
		eventSource = new EventSource(callbackStreamUrl);

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as { type: string; message?: string; payload?: unknown };
				const detail =
					typeof data.payload === 'string'
						? data.payload
						: data.payload
							? JSON.stringify(data.payload, null, 2)
							: undefined;

				if (data.type === 'connected') {
					pushStep(data.message ?? 'Callback listener ready', undefined, 'success');
				} else {
					pushStep(data.message ?? 'Callback update received', detail);

					if (data.type === 'callback') {
						callbackCount += 1;
						lastCallbackAt = new Date().toISOString();
						handleAutomationSignal(data.payload);
					}
				}
			} catch (error) {
				console.error('Failed to parse callback stream event', error);
			}
		};

		eventSource.onerror = () => {
			pushStep('Callback stream disconnected. Retrying...', undefined, 'error');
			eventSource?.close();
			setTimeout(() => {
				startCallbackStream();
			}, 2000);
		};
	};

	if (browser) {
		startCallbackStream();
		onDestroy(() => eventSource?.close());
	}

	const runPost = async () => {
		const ideaToInvestigate = investigateInput.trim() || defaultStoryType.prompt;
		isLoading = true;
		latestResponse = '';
		errorMessage = '';
		steps = [];

		prepareForRun();

		const payload = JSON.stringify({
			investigate: ideaToInvestigate,
			callbackUrl
		});

		pushStep('Sending POST request', `Endpoint: ${targetUrl}\n${payload}`);

		try {
			const response = await fetch(targetUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: payload
			});
			const text = await response.text();

			if (!response.ok) {
				errorMessage = `Request failed with status ${response.status}`;
				pushStep('POST response received with errors', `Status: ${response.status}\n${text}`, 'error');
			} else {
				pushStep('POST response received', `Status: ${response.status}`, 'success');
			}

			latestResponse = text || '(empty response body)';
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
			pushStep('POST request failed', errorMessage, 'error');
		} finally {
			isLoading = false;
			pushStep('POST run complete', undefined, errorMessage ? 'error' : 'success');
		}
	};

	const setStoryType = (storyId: StoryType['id']) => {
		selectedStoryTypeId = storyId;
		const matched = STORY_TYPES.find((story) => story.id === storyId);
		if (matched) {
			investigateInput = matched.prompt;
		}
	};
	$: {
		const matched = STORY_TYPES.find((story) => story.prompt === investigateInput);
		const nextId = matched ? matched.id : null;
		if (nextId !== selectedStoryTypeId) {
			selectedStoryTypeId = nextId;
		}
	}

	$: investigatePreviewValue = investigateInput.trim() || defaultStoryType.prompt;
	$: computedProgress = progressOverride ?? Math.round(progressFromPhases(phases));
	$: clampedProgress = Math.min(100, Math.max(0, computedProgress));
	$: progressDegrees = (computedProgress / 100) * 360;
	$: progressRingStyle = `background: conic-gradient(#3DDBA7 ${progressDegrees}deg, rgba(255, 255, 255, 0.2) 0deg)`;
	$: currentPhase = phases.find((phase) => phase.status === 'active') ?? phases.find((phase) => phase.status !== 'done') ?? phases[phases.length - 1];
	$: lastCallbackLabel = lastCallbackAt
		? new Date(lastCallbackAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
		: 'No callback yet';
</script>

<svelte:head>
	<title>{DEV_TITLE_PREFIX}Liam Ottley · AI News Sprint Log</title>
	<meta
		name="description"
		content="Live progress tracker for the Hostinger × n8n hackathon build that Liam Ottley and Cambermast are shipping."
	/>
</svelte:head>

<article class="space-y-10">
	<section class="section-shell border border-white/50">
		<div class="space-y-6">
			<div class="space-y-2">
				<p class="badge bg-primary-electric/10 text-primary-electric">AI News Aggregator</p>
				<h2 class="text-2xl font-semibold text-primary-navy">Start researching</h2>
				<p class="text-secondary-slate/90">
					Feed the automation with investigation prompts for new video ideas, send it to your POST endpoint, and watch the
					response land without leaving this page. We default to Cambermast's dry-run webhook so you can test instantly.
				</p>
			</div>

			<form class="space-y-4" on:submit|preventDefault={runPost} aria-describedby="post-run-tip">
				<p id="post-run-tip" class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">
					Fill every input before triggering the workflow POST.
				</p>
				<label class="block text-sm font-medium text-secondary-slate/90" for="investigate-prompt">
					Story signal to investigate
				</label>
				<div class="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div class="flex-1 space-y-2">
						<input
							id="investigate-prompt"
							name="investigate-prompt"
							class="h-16 w-full rounded-3xl border-2 border-primary-electric/60 bg-white px-6 text-lg font-semibold text-primary-navy shadow-card focus:border-primary-electric focus:outline-none"
							bind:value={investigateInput}
							placeholder={defaultStoryType.prompt}
							type="text"
							required
							aria-describedby="investigate-help"
						/>
						<p id="investigate-help" class="text-xs text-secondary-slate/80">
							We send this text to the automation as the <code>investigate</code> payload. Edit it or pick a preset below.
						</p>
					</div>
					<button
						type="submit"
						class="inline-flex h-16 w-full items-center justify-center rounded-3xl bg-primary-electric px-8 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary-electric/80 disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto lg:self-stretch"
						disabled={isLoading}
					>
						{#if isLoading}
							Scanning...
						{:else}
							Submit idea
						{/if}
					</button>
				</div>

				<fieldset class="space-y-4 rounded-2xl border border-white/60 bg-white/70 p-4" aria-describedby="story-type-tip">
					<legend class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">Hot AI story types</legend>
					<p id="story-type-tip" class="text-xs text-secondary-slate/80">
						Choose a preset to auto-fill the investigation prompt with a known-good signal.
					</p>
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="Suggested investigation presets">
						{#each STORY_TYPES as story (story.id)}
							{@const isActive = selectedStoryTypeId === story.id}
							<label
								class={`group relative block cursor-pointer overflow-hidden rounded-[1.5rem] border-2 p-5 pb-6 pt-8 text-left shadow-sm transition-all ${
									isActive
										? 'border-primary-electric bg-primary-electric/10 text-primary-navy shadow-xl ring-2 ring-primary-electric/40'
										: 'border-primary-electric/30 bg-white/80 text-secondary-slate outline outline-1 outline-primary-electric/10 hover:-translate-y-0.5 hover:border-primary-electric/50 hover:bg-white hover:outline-primary-electric/30'
								}`}
							>
								<input
									type="radio"
									class="sr-only"
									name="story-type"
									value={story.id}
									checked={isActive}
									on:change={() => setStoryType(story.id)}
								/>
								<span class="text-xs font-semibold uppercase tracking-[0.3em]">{story.title}</span>
								<p class="mt-3 text-sm text-secondary-slate/80">{story.description}</p>
							</label>
						{/each}
					</div>
				</fieldset>

				<label class="block text-sm font-medium text-secondary-slate/90" for="webhook-url">
					POST endpoint
				</label>
				<input
					id="webhook-url"
					name="webhook-url"
					class="w-full rounded-2xl border border-white/60 bg-white/80 p-4 text-primary-navy shadow-inner focus:border-primary-electric focus:outline-none"
					bind:value={targetUrl}
					placeholder="https://example.com/webhook"
					type="url"
					required
					aria-describedby="webhook-tip"
				/>
				<p id="webhook-tip" class="text-xs text-secondary-slate/80">
					Provide the HTTPS endpoint that receives the POST. Use Reset URL to switch back to Cambermast's test hook.
				</p>
				<div class="flex justify-start">
					<button
						type="button"
						class="rounded-2xl border border-white/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary-navy hover:border-primary-navy disabled:cursor-not-allowed disabled:opacity-70"
						on:click={() => (targetUrl = defaultUrl)}
						disabled={isLoading || targetUrl === defaultUrl}
					>
						Reset URL
					</button>
				</div>
				<label class="block text-sm font-medium text-secondary-slate/90" for="callback-url">
					Callback URL
				</label>
				<input
					id="callback-url"
					name="callback-url"
					class="w-full rounded-2xl border border-white/60 bg-white/80 p-4 text-primary-navy shadow-inner focus:border-primary-electric focus:outline-none"
					bind:value={callbackUrl}
					placeholder="https://example.com/callback"
					type="url"
					aria-describedby="callback-tip"
				/>
				<p id="callback-tip" class="text-xs text-secondary-slate/80">
					This optional URL receives workflow callbacks. We pre-fill it with your session-aware stream endpoint.
				</p>
			</form>

			<div class="rounded-2xl border border-white/60 bg-white/60 p-4 text-sm text-secondary-slate/90">
				<p class="font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">Payload preview</p>
				<pre class="mt-3 overflow-auto rounded-xl bg-black/80 p-4 text-white">
{JSON.stringify({ investigate: investigatePreviewValue, callbackUrl }, null, 2)}
				</pre>
			</div>
		</div>
	</section>

	<section
		class="section-shell border border-white/40"
		aria-labelledby="latest-response-title"
		aria-live="polite"
		aria-atomic="true"
		aria-busy={isLoading}
	>
		<h2 id="latest-response-title" class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">
			Latest response
		</h2>
		{#if isLoading}
			<p class="mt-4 text-secondary-slate/90">Waiting for the server to respond...</p>
		{:else}
			{#if errorMessage}
				<p
					role="alert"
					class="mt-4 rounded-2xl border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-semantic-warning"
				>
					{errorMessage}
				</p>
			{/if}
			{#if latestResponse}
				<pre class="mt-4 overflow-auto rounded-2xl border border-white/60 bg-black/80 p-4 text-sm text-white">
{latestResponse}
				</pre>
			{:else}
				<p class="mt-4 text-secondary-slate/80">No responses yet. Run a POST to see the payload here.</p>
			{/if}
		{/if}
	</section>

	<section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
		<div
			class="section-shell border border-primary-navy/15"
			role="region"
			aria-live="polite"
			aria-labelledby="live-status-heading"
		>
			<h2
				id="live-status-heading"
				class="text-xs font-semibold uppercase tracking-[0.3em] text-secondary-slate/70"
			>
				Live status
			</h2>
			<p class="mt-2 text-2xl font-semibold text-primary-navy" role="status" aria-live="polite" aria-atomic="true">
				{statusHeadline}
			</p>
			<p class="mt-3 text-secondary-slate/90" aria-live="polite" aria-atomic="true">{statusDetail}</p>

			<div class="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4">
				<p class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">Highlight</p>
				<p class="mt-2 text-lg font-semibold text-primary-navy">{highlightIdea}</p>
				<p class="mt-1 text-sm text-secondary-slate">{statusIdea}</p>
			</div>
		</div>

		<div
			class="section-shell border border-primary-navy/15"
			role="region"
			aria-live="polite"
			aria-labelledby="current-phase-heading"
		>
			<h2
				id="current-phase-heading"
				class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70"
			>
				Current phase
			</h2>
			<p class="mt-2 text-xl font-semibold text-primary-navy" role="status" aria-live="polite" aria-atomic="true">
				{currentPhase?.title}
			</p>
			<p class="text-sm text-secondary-slate/90" aria-live="polite" aria-atomic="true">
				{currentPhase?.description}
			</p>
		</div>
	</section>

	<section
		class="section-shell border border-primary-navy/15"
		aria-labelledby="automation-roadmap-heading"
	>
			<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
				<div>
					<h2
						id="automation-roadmap-heading"
						class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70"
					>
						Automation roadmap
					</h2>
				</div>
			<p class="text-sm font-semibold text-primary-electric" aria-live="polite" aria-atomic="true">
				{computedProgress}% of this run is already staged.
			</p>
		</div>

		<div class="mt-6 grid gap-4 md:grid-cols-2" role="list" aria-live="polite">
			{#each phases as phase (phase.id)}
				<article
					class={`rounded-2xl border p-4 transition ${
						phase.status === 'done'
							? 'border-accent-mint/50 bg-accent-mint/10 text-primary-navy'
							: phase.status === 'active'
								? 'border-primary-electric/40 bg-primary-electric/5 text-primary-navy'
								: 'border-white/60 bg-white/70 text-secondary-slate'
					}`}
					animate:flip={{ duration: 400, easing: quintOut }}
					role="listitem"
					aria-label={`${phase.title} is ${phase.status}`}
				>
					<div class="flex items-center justify-between">
						<p class="text-2xl">{phase.emoji}</p>
						<p class={`text-xs font-semibold uppercase tracking-[0.3em] ${
							phase.status === 'done'
								? 'text-accent-mint'
								: phase.status === 'active'
									? 'text-primary-electric'
									: 'text-secondary-slate/70'
						}`}
						>
							{phase.status === 'done' ? 'Complete' : phase.status === 'active' ? 'In motion' : 'Queued'}
						</p>
					</div>
					<h3 class="mt-3 text-xl font-semibold text-primary-navy">{phase.title}</h3>
					<p class="text-sm text-secondary-slate/90">{phase.description}</p>
					{#if phase.note}
						<p class="mt-2 text-sm font-semibold text-primary-navy">{phase.note}</p>
					{/if}
				</article>
			{/each}
		</div>
	</section>

	<section
		class="section-shell border border-white/50"
		aria-labelledby="live-run-activity-heading"
	>
		<h2
			id="live-run-activity-heading"
			class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70"
		>
			Live run activity
		</h2>
		{#if steps.length === 0}
			<p class="mt-4 text-secondary-slate/80">Trigger a POST to watch each step appear here.</p>
		{:else}
			<ul
				class="mt-4 space-y-3"
				role="log"
				aria-live="polite"
				aria-relevant="additions text"
				aria-atomic="false"
			>
				{#each steps as step (step.id)}
					<li
						class={`rounded-2xl border p-4 transition ${
							step.kind === 'error'
								? 'border-semantic-warning/50 bg-semantic-warning/10 text-semantic-warning'
								: step.kind === 'success'
									? 'border-accent-mint/40 bg-accent-mint/10 text-primary-navy'
									: 'border-white/60 bg-white/70 text-primary-navy'
						}`}
						animate:flip={{ duration: 350, easing: quintOut }}
					>
						<p class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">
							{new Date(step.timestamp).toLocaleTimeString()}
						</p>
						<p class="mt-1 font-semibold">{step.message}</p>
						{#if step.detail}
							<pre class="mt-2 overflow-auto rounded-xl bg-black/80 p-3 text-xs text-white">
{step.detail}
							</pre>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<section
		class="section-shell border border-primary-navy/15"
		aria-labelledby="callbacks-heading"
	>
		<h2 id="callbacks-heading" class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70">
			Callbacks received
		</h2>
		<p class="mt-2 text-4xl font-semibold text-primary-navy" role="status" aria-live="polite" aria-atomic="true">
			{callbackCount}
		</p>
		<p class="text-sm text-secondary-slate" aria-live="polite" aria-atomic="true">
			Latest ping: {lastCallbackLabel}
		</p>
		<div
			class="mt-4 h-2 rounded-full bg-secondary-cool"
			role="progressbar"
			aria-label="Workflow completion"
			aria-valuenow={clampedProgress}
			aria-valuemin="0"
			aria-valuemax="100"
		>
			<div
				class="h-full rounded-full bg-gradient-to-r from-primary-electric to-accent-mint transition-all"
				style={`width: ${clampedProgress}%`}
			></div>
		</div>
	</section>
</article>
