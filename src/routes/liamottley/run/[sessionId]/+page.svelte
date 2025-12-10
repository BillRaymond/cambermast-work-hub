<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import type { PageData } from "./$types";

    export let data: PageData;

    const { sessionId } = $page.params;
    const callbackStreamUrl = `${data.callbackBaseUrl}/api/liamottley/callback/stream/${sessionId}`;

    let growthCriteria = "";
    let vanityHandle = "";
    let postUrl = "";
    let callbackUrl = "";

    let isStarted = false;
    let isComplete = false;
    let eventSource: EventSource | null = null;
    let errorMessage = "";

    const runWorkflow = async () => {
        if (!postUrl) {
            errorMessage = "Configuration error: Missing POST URL";
            return;
        }

        isStarted = true;
        const payload = JSON.stringify({
            growth_criteria: growthCriteria,
            youtubeVanityUrl: vanityHandle,
            callbackUrl,
        });

        console.log("Sending payload:", payload);

        try {
            const response = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: payload,
            });

            if (!response.ok) {
                const text = await response.text();
                errorMessage = `Request failed: ${response.status} ${text}`;
                isStarted = false; // Reset so they can try again
            } else {
                // Check if the response itself indicates success
                try {
                    const data = await response.json();
                    if (data && data.success === true) {
                        isComplete = true;
                    }
                } catch (e) {
                    // Response might be empty or not JSON, which is fine, we wait for callback
                }
            }
        } catch (e) {
            errorMessage = e instanceof Error ? e.message : "Network error";
            isStarted = false;
        }
    };

    onMount(() => {
        if (browser) {
            // Restore state from navigation OR sessionStorage
            // Read params from URL
            const params = $page.url.searchParams;
            growthCriteria = params.get("growth_criteria") || "";
            vanityHandle = params.get("vanity_handle") || "";
            postUrl = params.get("post_url") || "";
            callbackUrl = params.get("callback_url") || "";

            eventSource = new EventSource(callbackStreamUrl);
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // Check for completion signals
                    if (data.type === "callback") {
                        const payload =
                            typeof data.payload === "object"
                                ? data.payload
                                : {};
                        const status = (
                            payload.phaseStatus ||
                            payload.state ||
                            ""
                        ).toLowerCase();
                        const percent =
                            payload.progress ??
                            payload.percentComplete ??
                            payload.completion;

                        if (
                            status === "done" ||
                            status === "complete" ||
                            percent === 100 ||
                            payload.complete === true ||
                            payload.success === true
                        ) {
                            isComplete = true;
                        }
                    }
                } catch (e) {
                    // ignore
                }
            };

            eventSource.onerror = () => {
                eventSource?.close();
            };
        }
    });

    onDestroy(() => {
        if (browser) eventSource?.close();
    });
</script>

<article
    class="w-full bg-white/95 border-b border-primary-electric/20 backdrop-blur-md shadow-sm"
>
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <!-- Left: Context -->
        <div class="flex items-center gap-8">
            <div class="flex items-center gap-3">
                <div
                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-electric/10 text-xl"
                >
                    ⚡
                </div>
                <div>
                    <p
                        class="text-[0.65rem] font-bold uppercase tracking-widest text-secondary-slate/60"
                    >
                        Target Channel
                    </p>
                    <p
                        class="text-sm font-bold text-primary-navy tracking-wide"
                    >
                        {vanityHandle || "..."}
                    </p>
                </div>
            </div>

            <div class="hidden h-8 w-px bg-secondary-slate/10 sm:block"></div>

            <div class="hidden sm:block">
                <p
                    class="text-[0.65rem] font-bold uppercase tracking-widest text-secondary-slate/60"
                >
                    Prompt
                </p>
                <p
                    class="text-xs font-semibold text-secondary-slate max-w-md truncate"
                >
                    {growthCriteria || "..."}
                </p>
            </div>
        </div>

        <!-- Right: Status -->
        <div class="flex items-center gap-4">
            {#if isComplete}
                <div
                    class="flex items-center gap-2 rounded-full bg-accent-mint/10 px-4 py-2 pr-5"
                >
                    <span
                        class="flex h-6 w-6 items-center justify-center rounded-full bg-accent-mint text-white"
                    >
                        <svg
                            class="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="3"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </span>
                    <span
                        class="text-xs font-bold uppercase tracking-wider text-primary-navy"
                        >Content generated!</span
                    >
                </div>
            {:else if isStarted}
                <div class="flex items-center gap-3">
                    <p
                        class="text-xs font-bold uppercase tracking-wider text-primary-electric animate-pulse"
                    >
                        Processing
                    </p>
                    <div
                        class="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-electric/10"
                    >
                        <svg
                            class="h-4 w-4 text-primary-electric animate-spin"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                class="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                stroke-width="4"
                            ></circle>
                            <path
                                class="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                        </svg>
                    </div>
                </div>
            {:else}
                <div class="flex items-center gap-4">
                    {#if errorMessage}
                        <p class="text-xs font-bold text-semantic-warning">
                            {errorMessage}
                        </p>
                    {/if}
                    <button
                        on:click={runWorkflow}
                        class="rounded-xl bg-primary-electric px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-lg transition-transform hover:scale-105 hover:bg-primary-electric/90 active:scale-95"
                    >
                        Generate Content
                    </button>
                </div>
            {/if}
        </div>
    </div>
</article>
