import type { RequestHandler } from './$types';
import { registerConnection, unregisterConnection } from '$lib/server/liamottley/callbackBus';

export const GET: RequestHandler = async ({ params }) => {
	const { sessionId } = params;

	if (!sessionId) {
		return new Response('Missing session id', { status: 400 });
	}

	const stream = new ReadableStream<string>({
		start(controller) {
			const connection = registerConnection(sessionId, controller);
			controller.enqueue(':\n\n'); // comment keeps the stream open

			return () => {
				unregisterConnection(connection);
			};
		},
		cancel() {
			// handled via return in start
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive'
		}
	});
};
