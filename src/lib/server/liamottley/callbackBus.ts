type Connection = {
	sessionId: string;
	controller: ReadableStreamDefaultController<string>;
};

type CallbackEvent = {
	type: string;
	message?: string;
	payload?: unknown;
	timestamp: string;
};

const connections = new Map<string, Set<Connection>>();

const formatEvent = (event: CallbackEvent) => `data: ${JSON.stringify(event)}\n\n`;

export const registerConnection = (sessionId: string, controller: ReadableStreamDefaultController<string>) => {
	let controllers = connections.get(sessionId);

	if (!controllers) {
		controllers = new Set();
		connections.set(sessionId, controllers);
	}

	const connection: Connection = { sessionId, controller };
	controllers.add(connection);

	// send immediate ack so the client knows it is listening
	controller.enqueue(
		formatEvent({
			type: 'connected',
			message: 'Callback stream connected',
			timestamp: new Date().toISOString()
		})
	);

	return connection;
};

export const unregisterConnection = (connection: Connection) => {
	const controllers = connections.get(connection.sessionId);
	if (!controllers) return;

	controllers.delete(connection);

	if (controllers.size === 0) {
		connections.delete(connection.sessionId);
	}
};

export const publishToSession = (sessionId: string, event: Omit<CallbackEvent, 'timestamp'>) => {
	const controllers = connections.get(sessionId);
	if (!controllers || controllers.size === 0) {
		return;
	}

	const payload = formatEvent({
		...event,
		timestamp: new Date().toISOString()
	});

	for (const connection of controllers) {
		try {
			connection.controller.enqueue(payload);
		} catch (error) {
			console.error('Failed to push callback event', error);
		}
	}
};
