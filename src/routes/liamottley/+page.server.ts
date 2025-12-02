import { randomUUID } from 'node:crypto';
import { env as privateEnv } from '$env/dynamic/private';
import { PUBLIC_SITE_ORIGIN } from '$env/static/public';
import type { PageServerLoad } from './$types';

const parseForwarded = (value: string | null) =>
	value
		?.split(',')
		.map((part) => part.trim())
		.find(Boolean);

const normalizeHost = (host: string) => host.split(':')[0]?.toLowerCase();
const cleanProtocol = (value?: string | null) => (value ? value.replace(/:$/, '').toLowerCase() : undefined);

const resolveManualCallbackBaseUrl = () => {
	const manualValue = privateEnv.CALLBACK_BASE_URL;

	if (!manualValue) {
		return null;
	}

	try {
		return new URL(manualValue).origin;
	} catch (error) {
		console.warn('Invalid CALLBACK_BASE_URL value, ignoring override.', error);
		return null;
	}
};

const getConfiguredOrigin = (forwardedHost: string | undefined, urlHost: string) => {
	if (!PUBLIC_SITE_ORIGIN) {
		return null;
	}

	try {
		const configured = new URL(PUBLIC_SITE_ORIGIN);
		const candidateHost = forwardedHost ? normalizeHost(forwardedHost) : normalizeHost(urlHost);

		if (candidateHost && configured.hostname === candidateHost) {
			return configured;
		}
	} catch (error) {
		console.warn('Invalid PUBLIC_SITE_ORIGIN value, falling back to request origin.', error);
	}

	return null;
};

const resolveCallbackBaseUrl = (url: URL, headers: Headers) => {
	const manualBaseUrl = resolveManualCallbackBaseUrl();

	if (manualBaseUrl) {
		return manualBaseUrl;
	}

	const forwardedHost = parseForwarded(headers.get('x-forwarded-host'));
	const forwardedProto = parseForwarded(headers.get('x-forwarded-proto'));
	const configuredOrigin = getConfiguredOrigin(forwardedHost, url.host);

	const protocol =
		cleanProtocol(forwardedProto) ??
		cleanProtocol(configuredOrigin?.protocol) ??
		cleanProtocol(url.protocol)!;

	const host = forwardedHost ?? configuredOrigin?.host ?? url.host;

	return `${protocol}://${host}`;
};

export const load: PageServerLoad = async ({ url, request }) => {
	return {
		sessionId: randomUUID(),
		callbackBaseUrl: resolveCallbackBaseUrl(url, request.headers)
	};
};
