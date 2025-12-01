import process from 'node:process';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const sharedHost = '0.0.0.0';
const previewPort = Number(process.env.PORT ?? 4173);
const buildTimestamp = new Date().toISOString();

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		__BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp)
	},
	server: {
		host: sharedHost,
		port: 5173,
		strictPort: true,
		allowedHosts: ['w.cambermast.com','laptop.tail8a5127.ts.net']
	},
	preview: {
		host: sharedHost,
		port: previewPort,
		strictPort: true,
		allowedHosts: ['w.cambermast.com','laptop.tail8a5127.ts.net']
	}
});
