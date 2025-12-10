<script lang="ts">
	import { DEV_TITLE_PREFIX } from "$lib/title-prefix";
	import { browser } from "$app/environment";
	import type { PageData } from "./$types";
	import { onDestroy, onMount } from "svelte";
	import { goto } from "$app/navigation";

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
		"https://n8n.cambermast.com/webhook/2999c2ae-9b07-40be-ae0e-8ae5bb56090b";
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
	let youtubeVanityHandle = "@liamottley";
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

	onMount(() => {
		const savedHandle = sessionStorage.getItem("youtubeVanityHandle");
		if (savedHandle) {
			youtubeVanityHandle = savedHandle;
		}
	});

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

		if (browser) {
			sessionStorage.setItem("youtubeVanityHandle", vanityHandle);
		}

		if (!postUrl) {
			errorMessage =
				"Provide a URL for the selected POST endpoint before running the automation.";
			return;
		}
		isLoading = true;
		latestResponse = "";
		errorMessage = "";
		// Simplified navigation only - logic moved to Run page

		const params = new URLSearchParams();
		params.set("growth_criteria", growthCriteriaInput);
		params.set("vanity_handle", youtubeVanityHandle);
		params.set("post_url", currentPostUrl);
		params.set("callback_url", callbackUrl);

		const resultsUrl = `/liamottley/run/${data.sessionId}?${params.toString()}`;

		await goto(resultsUrl);
		isLoading = false; // Reset loading state after navigation
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

				{#if errorMessage}
					<div
						class="mb-4 rounded-xl border border-semantic-warning/20 bg-semantic-warning/10 p-3 text-center text-sm font-semibold text-semantic-warning"
					>
						Cannot connect to workflow. Verify it is running and try
						again.
					</div>
				{/if}

				<button
					type="submit"
					class="inline-flex h-16 w-full items-center justify-center rounded-3xl bg-primary-electric px-8 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary-electric/80 disabled:cursor-not-allowed disabled:opacity-70"
				>
					Ready
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
</article>
```
