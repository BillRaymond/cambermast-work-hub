import type { Handle } from '@sveltejs/kit';

const robotsValue = 'noindex, nofollow, noarchive, nosnippet, noimageindex';

export const handle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Robots-Tag', robotsValue);
	return response;
};
