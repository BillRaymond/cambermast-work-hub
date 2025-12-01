<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	const navigation = [
		{ href: '/', label: 'Overview' },
		{ href: '/liamottley', label: 'Liam Ottley' }
	];

	let { children } = $props();
	const currentYear = new Date().getFullYear();
	const currentPath = $derived($page.url.pathname);
</script>

<svelte:head>
	<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
</svelte:head>

<div class="min-h-screen bg-secondary-cool/80 text-secondary-slate">
	<a
		href="#main-content"
		class="skip-link focus-visible:outline-none"
	>
		Skip to main content
	</a>
	<div
		class="pointer-events-none fixed inset-0 -z-10 bg-grid-light bg-[length:28px_28px] opacity-60"
		aria-hidden="true"
	></div>

	<header class="border-b border-white/40 bg-white/80 backdrop-blur">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
			<a href="/" class="flex flex-col">
				<span class="text-xs uppercase tracking-[0.3em] text-primary-electric">Cambermast</span>
				<span class="text-2xl font-bold text-primary-navy">Work Hub</span>
			</a>

			<nav
				class="flex flex-wrap items-center gap-4 text-sm font-semibold text-secondary-slate/80"
				aria-label="Primary navigation"
			>
				{#each navigation as item}
					{@const isCurrent =
						item.href === '/' ? currentPath === '/' : currentPath.startsWith(item.href)}
					<a
						href={item.href}
						class="rounded-full px-4 py-2 transition hover:bg-primary-electric/10 hover:text-primary-navy"
						aria-current={isCurrent ? 'page' : undefined}
					>
						{item.label}
					</a>
				{/each}
			</nav>

			<a
				class="inline-flex items-center gap-2 rounded-full bg-primary-electric px-5 py-2 font-semibold text-white shadow-lg shadow-primary-electric/30 transition hover:-translate-y-0.5"
				href="https://www.cambermast.com/contact"
				target="_blank"
				rel="noreferrer"
			>
				Contact Cambermast
				<span aria-hidden="true">↗</span>
			</a>
		</div>
	</header>

	<main
		id="main-content"
		class="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-10"
		tabindex="-1"
	>
		{@render children()}
	</main>

	<footer class="border-t border-white/40 bg-white/80 text-sm text-secondary-slate/80">
		<div class="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
			<p class="font-semibold">© {currentYear} Cambermast Work Hub</p>
			<p class="font-semibold text-primary-navy">Private in-progress workspace</p>
		</div>
	</footer>
</div>
