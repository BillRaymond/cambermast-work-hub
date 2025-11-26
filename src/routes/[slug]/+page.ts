import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import type { ProjectSpace } from '$lib/data/projects';
import { getProject } from '$lib/data/projects';

export const prerender = true;

export type DetailData = {
	project: ProjectSpace;
};

export const load = (({ params }) => {
	const project = getProject(params.slug);

	if (!project) {
		throw error(404, 'Project not found');
	}

	return { project };
}) satisfies PageLoad<DetailData>;
