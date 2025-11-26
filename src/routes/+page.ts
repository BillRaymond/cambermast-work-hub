import type { PageLoad } from './$types';
import type { ProjectSpace } from '$lib/data/projects';
import { projects } from '$lib/data/projects';

export type OverviewData = {
	featured: ProjectSpace;
	supporting: ProjectSpace[];
	insights: Array<{ label: string; value: string }>;
};

export const prerender = true;

export const load = (() => {
	const [featured, ...supporting] = projects;

	const insights = [
		{ label: 'Projects online', value: `${projects.length}` },
		{ label: 'Shared UI tokens', value: '18' },
		{ label: 'Automation hooks', value: '6 n8n flows' }
	];

	return {
		featured,
		supporting,
		insights
	};
}) satisfies PageLoad<OverviewData>;
