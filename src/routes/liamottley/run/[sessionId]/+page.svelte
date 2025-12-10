<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { page } from "$app/stores";
    import { browser } from "$app/environment";
    import { quintOut } from "svelte/easing";
    import { flip } from "svelte/animate";
    import type { PageData } from "./$types";

    export let data: PageData;

    const { sessionId } = $page.params;

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

    const callbackStreamUrl = `${data.callbackBaseUrl}/api/liamottley/callback/stream/${sessionId}`;
    // Construct callbackUrl for the payload
    const callbackUrl = `${data.callbackBaseUrl}/api/liamottley/callback/${sessionId}`;

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

    let steps: Step[] = [];
    let phases: PhaseState[] = PHASE_BLUEPRINT.map((phase, index) => ({
        ...phase,
        status: index === 0 ? "active" : "pending",
    }));
    let latestResponse = "";
    let errorMessage = "";
    let eventSource: EventSource | null = null;
    let progressOverride: number | null = null;
    let hasStarted = false;

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

    onMount(() => {
        if (browser) {
            // Restore state from navigation if available
            if (history.state) {
                if (history.state.phases) phases = history.state.phases;
                if (history.state.steps) steps = history.state.steps;
                if (history.state.latestResponse)
                    latestResponse = history.state.latestResponse;
            }

            // Start Stream to listen for further updates
            eventSource = new EventSource(callbackStreamUrl);
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const detail =
                        typeof data.payload === "string"
                            ? data.payload
                            : data.payload
                              ? JSON.stringify(data.payload, null, 2)
                              : undefined;

                    if (data.type === "connected") {
                        // Connected
                    } else {
                        pushStep(data.message ?? "Update received", detail);
                        if (data.type === "callback") {
                            handleAutomationSignal(data.payload);
                        }
                    }
                } catch (e) {
                    console.error("Error parsing event", e);
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

    $: computedProgress =
        progressOverride ?? Math.round(progressFromPhases(phases));
    $: clampedProgress = Math.min(100, Math.max(0, computedProgress));
</script>

<article class="space-y-10">
    <section
        class="section-shell border border-white/50"
        aria-label="Automation Progress"
    >
        <div class="space-y-8">
            <!-- Phase Tracker -->
            <div class="grid gap-6 md:grid-cols-2">
                {#each phases as phase (phase.id)}
                    {@const isDone = phase.status === "done"}
                    {@const isActive = phase.status === "active"}

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

            <!-- Live Log Stream as Cards -->
            <div class="space-y-4">
                {#each steps as step (step.id)}
                    <div
                        class="rounded-2xl border border-white/60 bg-white/60 p-4 shadow-sm"
                        animate:flip={{ duration: 350, easing: quintOut }}
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class={`h-2 w-2 rounded-full ${step.kind === "error" ? "bg-semantic-warning" : "bg-primary-electric"}`}
                            ></div>
                            <p class="text-sm font-medium text-secondary-slate">
                                {step.message}
                            </p>
                        </div>
                        {#if step.detail}
                            <pre
                                class="mt-2 text-xs text-secondary-slate/70 whitespace-pre-wrap">{step.detail}</pre>
                        {/if}
                    </div>
                {/each}
            </div>

            <!-- Final Result -->
            {#if errorMessage}
                <div
                    class="overflow-hidden rounded-3xl border border-semantic-warning/40 bg-white shadow-xl"
                >
                    <div
                        class="border-b border-semantic-warning/10 bg-semantic-warning/5 px-6 py-4"
                    >
                        <h3
                            class="flex items-center gap-2 text-lg font-bold text-semantic-warning"
                        >
                            <span>⚠️</span>
                            <span>Connection Error</span>
                        </h3>
                    </div>
                    <div class="p-6">
                        <p class="font-semibold text-primary-navy mb-2">
                            {errorMessage}
                        </p>

                        <div class="mt-6 flex justify-end">
                            <a
                                href="/liamottley"
                                class="rounded-xl border border-secondary-slate/20 px-4 py-2 text-sm font-semibold text-primary-navy hover:bg-secondary-slate/5"
                            >
                                Try Again
                            </a>
                        </div>
                    </div>
                </div>
            {:else if latestResponse}
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
                            <a
                                href="/liamottley"
                                class="rounded-xl border border-secondary-slate/20 px-4 py-2 text-sm font-semibold text-primary-navy hover:bg-secondary-slate/5"
                            >
                                Start New Search
                            </a>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </section>
</article>
