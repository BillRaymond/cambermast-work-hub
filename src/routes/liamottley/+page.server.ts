import { randomUUID } from 'node:crypto';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	return {
		sessionId: randomUUID(),
		callbackBaseUrl: url.origin
	};
};
