import type { RequestHandler } from './$types';
import { registerConnection, unregisterConnection } from '$lib/server/liamottley/callbackBus';

export const GET: RequestHandler = async ({ params }) => {
	const { sessionId } = params;

	if (!sessionId) {
		return new Response('Missing session id', { status: 400 });
	}

	const encoder = new TextEncoder();
	let connection: ReturnType<typeof registerConnection> | null = null;
	let keepAlive: ReturnType<typeof setInterval> | null = null;

	const enqueueComment = () => {
		try {
			connection?.controller.enqueue(encoder.encode(':\n\n'));
		} catch (error) {
			console.error('Unable to enqueue keep-alive comment', error);
		}
	};

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			connection = registerConnection(sessionId, controller);
			enqueueComment();
			keepAlive = setInterval(enqueueComment, 15000);
		},
		cancel() {
			if (keepAlive) {
				clearInterval(keepAlive);
				keepAlive = null;
			}
			if (connection) {
				unregisterConnection(connection);
				connection = null;
			}
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
