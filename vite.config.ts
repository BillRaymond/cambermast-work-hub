import process from 'node:process';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const sharedHost = '0.0.0.0';
const previewPort = Number(process.env.PORT ?? 4173);

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		host: sharedHost,
		port: 5173,
		strictPort: true
	},
	preview: {
		host: sharedHost,
		port: previewPort,
		strictPort: true,
		allowedHosts: ['w.cambermast.com']
	}
});

