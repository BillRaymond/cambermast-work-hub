import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { publishToSession } from '$lib/server/liamottley/callbackBus';

export const POST: RequestHandler = async ({ params, request }) => {
	const { sessionId } = params;

	if (!sessionId) {
		return json({ error: 'Missing session id' }, { status: 400 });
	}

	let payload: unknown;

	try {
		const text = await request.text();
		try {
			payload = JSON.parse(text);
		} catch {
			payload = text;
		}
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to read body' }, { status: 400 });
	}

	publishToSession(sessionId, {
		type: 'callback',
		message: 'Callback payload received',
		payload
	});

	return json({ ok: true });
};
