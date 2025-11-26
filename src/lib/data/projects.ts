export type ProjectSpace = {
	slug: string;
	title: string;
	status: 'Discovery' | 'Beta' | 'GA';
	tone: 'info' | 'success' | 'warning';
	description: string;
	tags: string[];
	highlights: string[];
	metrics: Array<{ label: string; value: string }>;
	nextSteps: string[];
	narrative: string;
	sections: Array<{
		title: string;
		body: string;
		points?: string[];
	}>;
};

export const projects: ProjectSpace[] = [
	{
		slug: 'project-a',
		title: 'Atlas Workspace',
		status: 'Discovery',
		tone: 'info',
		description:
			'Connected knowledge base that mixes SvelteKit UI with Django and Postgres data drawn from the homelab.',
		tags: ['SvelteKit', 'Postgres', 'Content API'],
		highlights: [
			'Composable landing section builder',
			'Hands-free sync with PostgreSQL views',
			'Embeddable showcase cards for other sites'
		],
		metrics: [
			{ label: 'Demo routes', value: '4 ready' },
			{ label: 'Latency via Tailscale', value: '< 60 ms' },
			{ label: 'Content blocks', value: '12 reusable' }
		],
		nextSteps: [
			'Wire in Luma events for livestream drop-ins',
			'Expose secure webhook endpoints for n8n'
		],
		narrative:
			'Atlas is the entry point for external demos. Each route is assembled from tokens so experiments can be rearranged without redeploying the container.',
		sections: [
			{
				title: 'Experience goals',
				body: 'Responsive grids, quick publish workflow, and automation hooks keep demos aligned with production.',
				points: [
					'Curated hero patterns for narrative builds',
					'Realtime feed of operational metrics',
					'Self-documenting component usage notes'
				]
			},
			{
				title: 'Technical wiring',
				body: 'SvelteKit handles SSR while Tailwind tokens match the Cambermast design language.',
				points: ['TypeScript strict mode', 'Caddy reverse proxy over homelab_net', 'Tailscale reachability']
			},
			{
				title: 'What to try next',
				body: 'Clone this route, update the data source, and the navigation + hero will update automatically.',
				points: ['Duplicate src/lib/data/projects.ts entry', 'Add new /project-* route content', 'Refresh container']
			}
		]
	},
	{
		slug: 'project-b',
		title: 'Field Notes Portal',
		status: 'Beta',
		tone: 'success',
		description: 'Story-driven portal for publishing release notes and lab diaries.',
		tags: ['Markdown', 'Automation', 'n8n'],
		highlights: [
			'MD to HTML pipeline powered by n8n',
			'Auto-linking to supporting assets on homelab storage',
			'Mint-accent highlights for achievements'
		],
		metrics: [
			{ label: 'Entries synced', value: '28 posts' },
			{ label: 'Automation coverage', value: '70%' },
			{ label: 'Change review time', value: '< 10 min' }
		],
		nextSteps: ['Expose RSS endpoint', 'Add audience targeting toggles'],
		narrative:
			'Field Notes keeps stakeholders in the loop. It is optimized for quick publishing and scheduled digests.',
		sections: [
			{
				title: 'Publishing workflow',
				body: 'Markdown drafts flow through pandoc and Gotenberg for PDF snapshots before landing here.',
				points: ['Hot folder watched by n8n', 'Review links expire after 48 hours']
			},
			{
				title: 'Audience modes',
				body: 'Tags drive which updates surface on the homepage, letting you curate investor vs. engineering views.'
			},
			{
				title: 'Next integrations',
				body: 'Plan to accept form submissions routed via n8n to update the backlog automatically.',
				points: ['n8n form endpoints', 'Luma RSVP status badges']
			}
		]
	},
	{
		slug: 'project-lab',
		title: 'Signal Lab',
		status: 'GA',
		tone: 'warning',
		description: 'Live observability wall for any workloads running behind the homelab network.',
		tags: ['Dashboards', 'Telemetry'],
		highlights: [
			'Composable widget system for Svelte components',
			'Contrast-safe palette for mission crit views',
			'Embeds nicely into existing caddy sites'
		],
		metrics: [
			{ label: 'Widgets online', value: '9' },
			{ label: 'Refresh interval', value: '15s' },
			{ label: 'Avg. uptime', value: '99.8%' }
		],
		nextSteps: ['Add on-call rotation timeline', 'Surface incident postmortems'],
		narrative:
			'Signal Lab focuses on reliability drills. Every widget can be popped out into its own /project-* route.',
		sections: [
			{
				title: 'Observability grid',
				body: 'Flexbox + CSS grid primitives make it easy to rearrange telemetry panels.'
			},
			{
				title: 'Accessibility',
				body: 'All colors are double-A compliant and include dark overlays for readability.'
			},
			{
				title: 'Expansion',
				body: 'Use web sockets or server-sent events to bring in real-time notifications.'
			}
		]
	}
];

export const getProject = (slug: string) => projects.find((project) => project.slug === slug);

