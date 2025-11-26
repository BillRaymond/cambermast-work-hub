import type { Config } from 'tailwindcss';

const config: Config = {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					navy: '#0A2342',
					electric: '#2F80ED'
				},
				secondary: {
					slate: '#4A5568',
					cool: '#E2E8F0'
				},
				accent: {
					mint: '#3DDBA7'
				},
				semantic: {
					success: '#3DDBA7',
					warning: '#FF9F1C',
					error: '#D7263D'
				}
			},
			fontFamily: {
				display: ['"Satoshi"', '"Inter"', '"Source Sans 3"', 'system-ui', 'sans-serif'],
				sans: ['"Inter"', '"Source Sans 3"', 'system-ui', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'SFMono-Regular', 'ui-monospace', 'monospace']
			},
			boxShadow: {
				card: '0 18px 35px rgba(10, 35, 66, 0.12)'
			},
			borderRadius: {
				'4xl': '2.5rem'
			},
			backgroundImage: {
				'grid-light':
					'radial-gradient(circle at 1px 1px, rgba(47, 128, 237, 0.12) 1px, transparent 0)'
			}
		}
	},
	plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')]
};

export default config;

