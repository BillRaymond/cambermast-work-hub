<script lang="ts">
	import { DEV_TITLE_PREFIX } from "$lib/title-prefix";
	import { browser } from "$app/environment";
	import type { PageData } from "./$types";
	import { onDestroy } from "svelte";

	type Step = {
		id: string;
		message: string;
		detail?: string;
		kind?: "info" | "error" | "success";
		timestamp: string;
	};

	type PhaseStatus = "pending" | "active" | "done";
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

	const TEST_POST_URL =
		"https://n8n.cambermast.com/webhook-test/0ee002a9-3228-4daa-9c05-4db349fc13cc";
	const PROD_POST_URL =
		"https://n8n.cambermast.com/webhook/0ee002a9-3228-4daa-9c05-4db349fc13cc";
	const STORY_TYPES = [
		{
			id: "latest",
			title: "Latest AI News",
			description: "Fresh drops from the labs, feeds, and rumor mills.",
			prompt: "Latest AI news and breakthroughs",
		},
		{
			id: "policy",
			title: "AI Policy Watch",
			description:
				"Regulation, compliance shake-ups, and global policy shifts.",
			prompt: "Regulatory battles, compliance pivots, and global governance shifts shaping AI",
		},
		{
			id: "product",
			title: "Breakout Product Launches",
			description:
				"New tools, AI assistants, and platform launches landing this week.",
			prompt: "Breakout AI product launches and feature drops worth covering",
		},
		{
			id: "research",
			title: "Research Signals",
			description:
				"Labs, arXiv, and stealth research that could spark a video.",
			prompt: "Cutting-edge AI research papers, pilots, and lab reveals",
		},
		{
			id: "creator",
			title: "Creator & Community Hype",
			description:
				"Stories bubbling up from social media and indie builders.",
			prompt: "Creator-led AI trends, viral tools, and community chatter",
		},
		{
			id: "ops",
			title: "AI Ops Playbooks",
			description:
				"Workflow, automation, and ops wins that deserve a breakdown.",
			prompt: "AI workflow and operations playbooks with measurable wins",
		},
	] as const;
	type StoryType = (typeof STORY_TYPES)[number];
	const defaultStoryType = STORY_TYPES[0];
	const YOUTUBE_VANITY_PATTERN = /^@[A-Za-z0-9._-]+$/;

	const derivedCallbackUrl = `${data.callbackBaseUrl}/api/liamottley/callback/${data.sessionId}`;
	const callbackStreamUrl = `${data.callbackBaseUrl}/api/liamottley/callback/stream/${data.sessionId}`;

	const PHASE_BLUEPRINT: PhaseDefinition[] = [
		{
			id: "idea-lab",
			title: "Idea Lab",
			description:
				"Score trend potential and surface validated hooks for content/video.",
			emoji: "💡",
		},
		{
			id: "handoff",
			title: "Delivery & Callback",
			description:
				"Package the article + callback payload so the site can showcase it.",
			emoji: "🚀",
		},
	];

	const createPhaseState = (): PhaseState[] =>
		PHASE_BLUEPRINT.map((phase, index) => ({
			...phase,
			status: index === 0 ? "active" : "pending",
		}));

	const clamp = (value: number, min = 0, max = 100) =>
		Math.min(max, Math.max(min, value));
	const asRecord = (value: unknown): Record<string, unknown> | null =>
		typeof value === "object" && value !== null && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: null;
	const getString = (value: unknown) =>
		typeof value === "string" && value.trim().length > 0
			? value.trim()
			: null;
	const maybeNumber = (value: unknown) => {
		if (typeof value === "number" && Number.isFinite(value)) return value;
		if (typeof value === "string") {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : null;
		}
		return null;
	};

	const normalizePhaseStatus = (value: string | null): PhaseStatus | null => {
		if (!value) return null;
		const normalized = value.toLowerCase();
		if (["complete", "completed", "done", "finished"].includes(normalized))
			return "done";
		if (["active", "running", "in_progress", "live"].includes(normalized))
			return "active";
		if (["pending", "waiting", "queued", "up_next"].includes(normalized))
			return "pending";
		return null;
	};

	let callbackUrl = derivedCallbackUrl;
	let selectedStoryTypeId: StoryType["id"] | null = defaultStoryType.id;
	let growthCriteriaInput: string = defaultStoryType.prompt;
	let isLoading = false;
	let latestResponse = "";
	let errorMessage = "";
	let steps: Step[] = [];
	let eventSource: EventSource | null = null;
	let youtubeVanityHandle = "";
	let endpointMode: "test" | "prod" = "test";
	let testUrl = TEST_POST_URL;
	let prodUrl = PROD_POST_URL;

	let phases = createPhaseState();
	let callbackCount = 0;
	let lastCallbackAt: string | null = null;
	let progressOverride: number | null = null;

	const setIdleStatus = () => {
		phases = createPhaseState();
		callbackCount = 0;
		lastCallbackAt = null;
		progressOverride = null;
	};

	const prepareForRun = () => {
		phases = createPhaseState();
		callbackCount = 0;
		lastCallbackAt = null;
		progressOverride = null;
	};

	setIdleStatus();

	const progressFromPhases = (currentPhases: PhaseState[]) => {
		const slice = currentPhases.length > 0 ? 100 / currentPhases.length : 0;
		return currentPhases.reduce((value, phase) => {
			if (phase.status === "done") return value + slice;
			if (phase.status === "active") return value + slice * 0.6;
			return value;
		}, 0);
	};

	const handleAutomationSignal = (payload: unknown) => {
		const record = asRecord(payload);
		if (!record) return;

		const progressValue = maybeNumber(
			record.progress ?? record.percentComplete ?? record.completion,
		);
		if (progressValue !== null) {
			progressOverride = clamp(Math.round(progressValue));
		}

		const phaseToken = getString(
			(record.phase as string | undefined) ??
				(record.stage as string | undefined) ??
				(record.phaseId as string | undefined),
		);

		if (phaseToken) {
			const targetIndex = phases.findIndex(
				(phase) =>
					phase.id === phaseToken ||
					phase.title.toLowerCase() === phaseToken.toLowerCase(),
			);

			if (targetIndex !== -1) {
				const incomingStatus =
					normalizePhaseStatus(
						getString(
							(record.phaseStatus as string | undefined) ??
								(record.state as string | undefined),
						),
					) ?? "active";

				const note =
					getString(
						(record.phaseNote as string | undefined) ??
							(record.note as string | undefined) ??
							(record.summary as string | undefined),
					) ?? undefined;

				phases = phases.map((phase, index) => {
					if (index < targetIndex) {
						return { ...phase, status: "done" };
					}

					if (index === targetIndex) {
						return { ...phase, status: incomingStatus, note };
					}

					return { ...phase, status: "pending" };
				});
			}
		}
	};

	const pushStep = (
		message: string,
		detail?: string,
		kind: Step["kind"] = "info",
	) => {
		const id = crypto.randomUUID
			? crypto.randomUUID()
			: `${Date.now()}-${Math.random()}`;

		const entry: Step = {
			id,
			message,
			detail,
			kind,
			timestamp: new Date().toISOString(),
		};

		steps = [entry, ...steps];
	};

	const startCallbackStream = () => {
		if (!browser) return;

		eventSource?.close();
		eventSource = new EventSource(callbackStreamUrl);

		eventSource.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data) as {
					type: string;
					message?: string;
					payload?: unknown;
				};
				const detail =
					typeof data.payload === "string"
						? data.payload
						: data.payload
							? JSON.stringify(data.payload, null, 2)
							: undefined;

				if (data.type === "connected") {
					pushStep(
						data.message ?? "Callback listener ready",
						undefined,
						"success",
					);
				} else {
					pushStep(
						data.message ?? "Callback update received",
						detail,
					);

					if (data.type === "callback") {
						callbackCount += 1;
						lastCallbackAt = new Date().toISOString();
						handleAutomationSignal(data.payload);
					}
				}
			} catch (error) {
				console.error("Failed to parse callback stream event", error);
			}
		};

		eventSource.onerror = () => {
			pushStep(
				"Callback stream disconnected. Retrying...",
				undefined,
				"error",
			);
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
		const growthCriteria =
			growthCriteriaInput.trim() || defaultStoryType.prompt;
		const vanityHandle = youtubeVanityHandle.trim();
		const postUrl = currentPostUrl.trim();

		if (!YOUTUBE_VANITY_PATTERN.test(vanityHandle)) {
			errorMessage =
				"YouTube vanity URL must start with @ and cannot contain spaces.";
			return;
		}

		if (!postUrl) {
			errorMessage =
				"Provide a URL for the selected POST endpoint before running the automation.";
			return;
		}
		isLoading = true;
		latestResponse = "";
		errorMessage = "";
		steps = [];

		prepareForRun();

		const payload = JSON.stringify({
			growth_criteria: growthCriteria,
			youtubeVanityUrl: vanityHandle,
			callbackUrl,
		});

		pushStep("Sending POST request", `Endpoint: ${postUrl}\n${payload}`);

		try {
			const response = await fetch(postUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: payload,
			});
			const text = await response.text();

			if (!response.ok) {
				errorMessage = `Request failed with status ${response.status}`;
				pushStep(
					"POST response received with errors",
					`Status: ${response.status}\n${text}`,
					"error",
				);
			} else {
				pushStep(
					"POST response received",
					`Status: ${response.status}`,
					"success",
				);
			}

			latestResponse = text || "(empty response body)";
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: "Unknown error occurred";
			pushStep("POST request failed", errorMessage, "error");
		} finally {
			isLoading = false;
			pushStep(
				"POST run complete",
				undefined,
				errorMessage ? "error" : "success",
			);
		}
	};

	const setStoryType = (storyId: StoryType["id"]) => {
		selectedStoryTypeId = storyId;
		const matched = STORY_TYPES.find((story) => story.id === storyId);
		if (matched) {
			growthCriteriaInput = matched.prompt;
		}
	};
	$: {
		const matched = STORY_TYPES.find(
			(story) => story.prompt === growthCriteriaInput,
		);
		const nextId = matched ? matched.id : null;
		if (nextId !== selectedStoryTypeId) {
			selectedStoryTypeId = nextId;
		}
	}

	$: growthCriteriaPreviewValue =
		growthCriteriaInput.trim() || defaultStoryType.prompt;
	$: vanityPreviewValue = youtubeVanityHandle.trim();
	$: currentPostUrl = endpointMode === "prod" ? prodUrl : testUrl;
	$: payloadPreview = {
		growth_criteria: growthCriteriaPreviewValue,
		youtubeVanityUrl: vanityPreviewValue,
		callbackUrl,
		endpointMode,
		postUrl: currentPostUrl,
	};
	$: computedProgress =
		progressOverride ?? Math.round(progressFromPhases(phases));
	$: clampedProgress = Math.min(100, Math.max(0, computedProgress));
	$: lastCallbackLabel = lastCallbackAt
		? new Date(lastCallbackAt).toLocaleTimeString([], {
				hour: "2-digit",
				minute: "2-digit",
				second: "2-digit",
			})
		: "No callback yet";
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
				<p class="badge bg-primary-electric/10 text-primary-electric">
					AI News Aggregator
				</p>
				<h2 class="text-2xl font-semibold text-primary-navy">
					Start researching
				</h2>
				<p class="text-secondary-slate/90">
					Feed the automation with investigation prompts for new video
					ideas, send it to your POST endpoint, and watch the response
					land without leaving this page. We default to Cambermast's
					dry-run webhook so you can test instantly.
				</p>
			</div>

			<form
				class="space-y-4"
				on:submit|preventDefault={runPost}
				aria-describedby="post-run-tip"
			>
				<p
					id="post-run-tip"
					class="text-xs uppercase tracking-[0.3em] text-secondary-slate/70"
				>
					Fill every input before triggering the workflow POST.
				</p>
				<label
					class="block text-sm font-medium text-secondary-slate/90"
					for="youtube-vanity"
				>
					YouTube vanity URL
				</label>
				<input
					id="youtube-vanity"
					name="youtube-vanity"
					class="w-full rounded-2xl border border-white/60 bg-white/80 p-4 text-primary-navy shadow-inner focus:border-primary-electric focus:outline-none"
					bind:value={youtubeVanityHandle}
					placeholder="@liamottley"
					type="text"
					required
					pattern="^@[A-Za-z0-9._-]+$"
					title="Start with @ and use letters, numbers, periods, underscores, or hyphens only"
					inputmode="text"
					aria-describedby="youtube-vanity-tip"
				/>
				<p
					id="youtube-vanity-tip"
					class="text-xs text-secondary-slate/80"
				>
					Paste the vanity handle from your channel (e.g., <code
						>@liamottley</code
					>). The automation requires the leading @ and no spaces.
				</p>

				<label
					class="block text-sm font-medium text-secondary-slate/90"
					for="growth-criteria-input"
				>
					Growth criteria prompt
				</label>
				<div class="space-y-2">
					<input
						id="growth-criteria-input"
						name="growth-criteria-input"
						class="h-16 w-full rounded-3xl border-2 border-primary-electric/60 bg-white px-6 text-lg font-semibold text-primary-navy shadow-card focus:border-primary-electric focus:outline-none"
						bind:value={growthCriteriaInput}
						placeholder={defaultStoryType.prompt}
						type="text"
						required
						aria-describedby="growth-criteria-help"
					/>
					<p
						id="growth-criteria-help"
						class="text-xs text-secondary-slate/80"
					>
						We send this text to the automation as the <code
							>growth_criteria</code
						> payload. Edit it or pick a preset below.
					</p>
				</div>

				<div
					class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
					role="group"
					aria-label="Suggested investigation presets"
				>
					{#each STORY_TYPES as story (story.id)}
						{@const isActive = selectedStoryTypeId === story.id}
						<label
							class={`group relative block cursor-pointer overflow-hidden rounded-2xl border-2 px-4 py-3 text-left shadow-sm transition-all ${
								isActive
									? "border-primary-electric bg-primary-electric/10 text-primary-navy shadow-lg ring-2 ring-primary-electric/40"
									: "border-primary-electric/30 bg-white/80 text-secondary-slate outline outline-1 outline-primary-electric/10 hover:-translate-y-0.5 hover:border-primary-electric/50 hover:bg-white hover:outline-primary-electric/30"
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
							<span
								class="text-[0.65rem] font-bold uppercase tracking-[0.2em] opacity-90"
								>{story.title}</span
							>
							<p
								class="mt-0.5 text-xs font-medium text-secondary-slate/90 leading-snug"
							>
								{story.description}
							</p>
						</label>
					{/each}
				</div>

				<button
					type="submit"
					class="inline-flex h-16 w-full items-center justify-center rounded-3xl bg-primary-electric px-8 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary-electric/80 disabled:cursor-not-allowed disabled:opacity-70"
					disabled={isLoading}
				>
					{#if isLoading}
						Scanning...
					{:else}
						Submit idea
					{/if}
				</button>

				<div
					class="space-y-3 rounded-3xl border border-white/70 bg-white/85 p-4 shadow-card"
				>
					<div class="space-y-3">
						<div class="space-y-2">
							<p class="text-sm font-semibold text-primary-navy">
								Hostinger n8n URL endpoints
							</p>
							<p class="text-xs text-secondary-slate/80">
								Leave the box unchecked to use the safe TEST
								webhook. Toggle it on only when you're ready to
								hit PROD.
							</p>
						</div>
						<label
							class="inline-flex items-center gap-3 rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-sm font-semibold text-primary-navy shadow-inner"
						>
							<input
								type="checkbox"
								class="h-5 w-5 rounded border-primary-electric text-primary-electric focus:ring-primary-electric"
								checked={endpointMode === "prod"}
								on:change={(event) =>
									(endpointMode = event.currentTarget.checked
										? "prod"
										: "test")}
							/>
							<span>Use production endpoint (PROD)</span>
						</label>
						<p class="text-xs text-secondary-slate/80">
							Currently posting to <span
								class="font-semibold text-primary-navy"
								>{endpointMode === "prod"
									? "Production"
									: "Test"}</span
							>
						</p>
					</div>

					<details
						class="rounded-2xl border border-white/60 bg-white/90 p-4"
						aria-label="Custom endpoint URLs"
					>
						<summary
							class="flex cursor-pointer items-center justify-between text-sm font-semibold text-primary-navy"
						>
							<span>View & edit endpoint URLs</span>
							<span class="text-xs text-secondary-slate/80"
								>Tap to reveal or hide</span
							>
						</summary>
						<div class="mt-4 space-y-4">
							<div>
								<label
									class="block text-xs font-semibold uppercase tracking-[0.3em] text-secondary-slate/80"
									for="test-endpoint-url"
								>
									Test endpoint
								</label>
								<input
									id="test-endpoint-url"
									name="test-endpoint-url"
									class="mt-1 w-full rounded-2xl border border-white/60 bg-white/95 p-3 text-sm text-primary-navy shadow-inner focus:border-primary-electric focus:outline-none"
									type="url"
									bind:value={testUrl}
									placeholder="https://example.com/test-webhook"
									aria-describedby="test-endpoint-help"
								/>
								<div
									class="mt-2 flex items-center justify-between text-xs text-secondary-slate/80"
								>
									<p id="test-endpoint-help">
										Used when the switch is set to Test.
									</p>
									<button
										type="button"
										class="rounded-xl border border-white/50 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-primary-navy hover:border-primary-navy disabled:cursor-not-allowed disabled:opacity-60"
										on:click={() =>
											(testUrl = TEST_POST_URL)}
										disabled={testUrl === TEST_POST_URL}
									>
										Reset
									</button>
								</div>
							</div>
							<div>
								<label
									class="block text-xs font-semibold uppercase tracking-[0.3em] text-secondary-slate/80"
									for="prod-endpoint-url"
								>
									Production endpoint
								</label>
								<input
									id="prod-endpoint-url"
									name="prod-endpoint-url"
									class="mt-1 w-full rounded-2xl border border-white/60 bg-white/95 p-3 text-sm text-primary-navy shadow-inner focus:border-primary-electric focus:outline-none"
									type="url"
									bind:value={prodUrl}
									placeholder="https://example.com/prod-webhook"
									aria-describedby="prod-endpoint-help"
								/>
								<div
									class="mt-2 flex items-center justify-between text-xs text-secondary-slate/80"
								>
									<p id="prod-endpoint-help">
										Used when the switch is set to
										Production.
									</p>
									<button
										type="button"
										class="rounded-xl border border-white/50 px-3 py-1 font-semibold uppercase tracking-[0.2em] text-primary-navy hover:border-primary-navy disabled:cursor-not-allowed disabled:opacity-60"
										on:click={() =>
											(prodUrl = PROD_POST_URL)}
										disabled={prodUrl === PROD_POST_URL}
									>
										Reset
									</button>
								</div>
							</div>
							<div>
								<label
									class="block text-xs font-semibold uppercase tracking-[0.3em] text-secondary-slate/80"
									for="callback-url"
								>
									Callback URL
								</label>
								<input
									id="callback-url"
									name="callback-url"
									class="mt-1 w-full rounded-2xl border border-white/60 bg-white/95 p-3 text-sm text-primary-navy shadow-inner focus:border-primary-electric focus:outline-none"
									type="url"
									bind:value={callbackUrl}
									placeholder="https://example.com/callback"
									aria-describedby="callback-tip"
								/>
								<p
									id="callback-tip"
									class="mt-2 text-xs text-secondary-slate/80"
								>
									This optional URL receives workflow
									callbacks. We pre-fill it with your
									session-aware stream endpoint.
								</p>
							</div>
							<div>
								<p
									class="text-xs font-semibold uppercase tracking-[0.3em] text-secondary-slate/80"
								>
									Payload preview
								</p>
								<pre
									class="mt-2 overflow-auto rounded-2xl border border-white/60 bg-black/80 p-4 text-sm text-white">
{JSON.stringify(payloadPreview, null, 2)}
								</pre>
							</div>
						</div>
					</details>
				</div>
			</form>
		</div>
	</section>

	<section
		class="section-shell border border-white/50"
		aria-label="Automation Progress"
	>
		{#if steps.length > 0 || isLoading || phases.some((p) => p.status !== "pending")}
			<div class="space-y-8">
				<!-- Phase Tracker -->
				<div class="grid gap-6 md:grid-cols-2">
					{#each phases as phase (phase.id)}
						{@const isDone = phase.status === "done"}
						{@const isActive = phase.status === "active"}
						{@const isPending = phase.status === "pending"}

						<div
							class={`relative overflow-hidden rounded-3xl border p-6 transition-all duration-500 ${
								isActive
									? "border-primary-electric bg-primary-electric/5 shadow-2xl ring-1 ring-primary-electric/50"
									: isDone
										? "border-accent-mint/50 bg-accent-mint/5 opacity-80"
										: "border-white/20 bg-white/40 opacity-50"
							}`}
						>
							<div class="flex items-start gap-4">
								<div
									class={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm transition-transform duration-500 ${
										isActive
											? "scale-110 bg-white"
											: "bg-white/60"
									}`}
								>
									{phase.emoji}
								</div>
								<div class="space-y-1">
									<h3
										class={`font-bold uppercase tracking-wider ${isActive ? "text-primary-navy" : "text-secondary-slate"}`}
									>
										{phase.title}
									</h3>
									<p class="text-sm text-secondary-slate/90">
										{phase.description}
									</p>
								</div>
							</div>

							<!-- Status Indicator -->
							<div class="mt-6 flex items-center gap-3">
								{#if isDone}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-accent-mint/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-navy"
									>
										<span
											class="h-2 w-2 rounded-full bg-accent-mint"
										></span>
										Complete
									</span>
								{:else if isActive}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-primary-electric/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-electric"
									>
										<span class="relative flex h-2 w-2">
											<span
												class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-electric opacity-75"
											></span>
											<span
												class="relative inline-flex h-2 w-2 rounded-full bg-primary-electric"
											></span>
										</span>
										Processing...
									</span>
								{:else}
									<span
										class="inline-flex items-center gap-1.5 rounded-full bg-secondary-slate/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-secondary-slate/60"
									>
										Pending
									</span>
								{/if}

								{#if phase.note}
									<p
										class="text-xs text-secondary-slate/80 line-clamp-1"
									>
										{phase.note}
									</p>
								{/if}
							</div>

							<!-- Progress Bar (Active Only) -->
							{#if isActive}
								<div
									class="absolute bottom-0 left-0 h-1 w-full bg-primary-electric/10"
								>
									<div
										class="h-full animate-progress-indeterminate bg-primary-electric"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Live Log Stream (Simplified) -->
				{#if steps.length > 0 && !latestResponse}
					<div
						class="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-inner"
					>
						<div class="flex items-center gap-3">
							<div
								class="h-2 w-2 animate-pulse rounded-full bg-primary-electric"
							></div>
							<p class="text-sm font-medium text-secondary-slate">
								{steps[0].message}
							</p>
						</div>
					</div>
				{/if}

				<!-- Final Result -->
				{#if latestResponse}
					<div
						class="overflow-hidden rounded-3xl border border-primary-electric/20 bg-white shadow-xl"
					>
						<div
							class="border-b border-secondary-slate/10 bg-gradient-to-r from-primary-electric/5 to-transparent px-6 py-4"
						>
							<h3
								class="flex items-center gap-2 text-lg font-bold text-primary-navy"
							>
								<span>📝</span>
								<span>Investigation Result</span>
							</h3>
						</div>
						<div class="p-6">
							<div
								class="prose prose-sm max-w-none text-secondary-slate"
							>
								<pre
									class="whitespace-pre-wrap font-sans text-sm leading-relaxed text-secondary-slate">{latestResponse}</pre>
							</div>

							<div class="mt-6 flex justify-end">
								<button
									class="rounded-xl border border-secondary-slate/20 px-4 py-2 text-sm font-semibold text-primary-navy hover:bg-secondary-slate/5"
									on:click={() => {
										latestResponse = "";
										steps = [];
										setIdleStatus();
									}}
								>
									Start New Search
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Empty State -->
			<div
				class="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-white/40 bg-white/20 p-8 text-center"
			>
				<div class="rounded-full bg-white/40 p-4 text-3xl opacity-50">
					✨
				</div>
				<div class="max-w-md space-y-1">
					<p class="font-medium text-primary-navy">
						Ready for your input
					</p>
					<p class="text-sm text-secondary-slate/80">
						Results will appear here once you start an
						investigation.
					</p>
				</div>
			</div>
		{/if}
	</section>
</article>
