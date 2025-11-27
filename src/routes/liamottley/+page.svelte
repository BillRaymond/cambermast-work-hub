<svelte:head>
	<title>Liam Ottley · Cambermast Work Hub</title>
	<meta
		name="description"
		content="Progress tracker for the Liam Ottley collaboration inside the Cambermast Work Hub."
	/>
</svelte:head>

<script lang="ts">
	import { browser } from '$app/environment';
	import type { PageData } from './$types';
	import { onDestroy } from 'svelte';

	type Step = {
		id: string;
		message: string;
		detail?: string;
		kind?: 'info' | 'error' | 'success';
		timestamp: string;
	};

	export let data: PageData;

	const defaultUrl = 'https://n8n.cambermast.com/webhook-test/2999c2ae-9b07-40be-ae0e-8ae5bb56090b';
	const investigateValue = 'Latest AI News';

	const derivedCallbackUrl = `${data.callbackBaseUrl}/api/liamottley/callback/${data.sessionId}`;
	const callbackStreamUrl = `${data.callbackBaseUrl}/api/liamottley/callback/stream/${data.sessionId}`;

	let targetUrl = defaultUrl;
	let callbackUrl = derivedCallbackUrl;
	let isLoading = false;
	let latestResponse = '';
	let errorMessage = '';
	let steps: Step[] = [];
	let eventSource: EventSource | null = null;

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
		isLoading = true;
		latestResponse = '';
		errorMessage = '';

		const payload = JSON.stringify({
			investigate: investigateValue,
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
</script>

<article class="space-y-10">
	<section class="section-shell border border-white/50">
		<div class="space-y-6">
			<div class="space-y-2">
				<h1 class="text-4xl font-semibold text-primary-navy">Liam Ottley · Webhook tester</h1>
				<p class="text-secondary-slate/90">
					Enter a POST endpoint, trigger it, and inspect the response without leaving this route. The field
					defaults to the testing webhook we use for Cambermast automation dry runs.
				</p>
			</div>

				<form class="space-y-4" on:submit|preventDefault={runPost}>
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
					/>
					<div class="flex gap-3">
						<button
							type="submit"
							class="rounded-2xl bg-primary-electric px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-primary-electric/80 disabled:cursor-not-allowed disabled:opacity-70"
							disabled={isLoading}
						>
							{#if isLoading}
								Sending...
							{:else}
								Run POST
							{/if}
						</button>
						<button
							type="button"
							class="rounded-2xl border border-white/60 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary-navy hover:border-primary-navy"
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
					/>
				</form>

				<div class="rounded-2xl border border-white/60 bg-white/60 p-4 text-sm text-secondary-slate/90">
					<p class="font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">Payload preview</p>
					<pre class="mt-3 overflow-auto rounded-xl bg-black/80 p-4 text-white">
{JSON.stringify({ investigate: investigateValue, callbackUrl }, null, 2)}
					</pre>
				</div>
			</div>
		</section>

	<section class="section-shell border border-white/50">
		<h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">Run activity</h2>
		{#if steps.length === 0}
			<p class="mt-4 text-secondary-slate/80">Trigger a POST to watch each step appear here.</p>
		{:else}
			<ul class="mt-4 space-y-3">
				{#each steps as step (step.id)}
					<li
						class={`rounded-2xl border p-4 ${
							step.kind === 'error'
								? 'border-semantic-warning/50 bg-semantic-warning/10 text-semantic-warning'
								: step.kind === 'success'
									? 'border-accent-mint/40 bg-accent-mint/10 text-primary-navy'
									: 'border-white/60 bg-white/70 text-primary-navy'
						}`}
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

	<section class="section-shell border border-white/40">
		<h2 class="text-sm font-semibold uppercase tracking-[0.3em] text-secondary-slate/70">Latest response</h2>
		{#if isLoading}
			<p class="mt-4 text-secondary-slate/90">Waiting for the server to respond...</p>
		{:else}
			{#if errorMessage}
				<p class="mt-4 rounded-2xl border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-semantic-warning">
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
</article>
