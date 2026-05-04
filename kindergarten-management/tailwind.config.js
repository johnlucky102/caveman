/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ['class'],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: '#FF6B6B',
					foreground: '#FFFFFF',
					50: '#FFF0F0',
					100: '#FFE0E0',
					200: '#FFC5C5',
					300: '#FFA0A0',
					400: '#FF8080',
					500: '#FF6B6B',
					600: '#E85555',
					700: '#CC3F3F',
					800: '#A82F2F',
					900: '#8A2525',
				},
				secondary: {
					DEFAULT: '#4ECDC4',
					foreground: '#FFFFFF',
					50: '#EDFAF9',
					100: '#D0F4F2',
					200: '#A6EBE8',
					300: '#76DDD9',
					400: '#4ECDC4',
					500: '#35B5AC',
					600: '#278F87',
					700: '#1E6E68',
					800: '#175350',
					900: '#113D3A',
				},
				kidgarden: {
					bg: '#F8FAFC',
					textPrimary: '#1E293B',
					textSecondary: '#64748B',
					border: '#E2E8F0',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
			keyframes: {
				'accordion-down': {
					from: { height: 0 },
					to: { height: 'var(--radix-accordion-content-height)' },
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: 0 },
				},
				'fade-in': {
					from: { opacity: 0, transform: 'translateY(8px)' },
					to: { opacity: 1, transform: 'translateY(0)' },
				},
				'slide-in-left': {
					from: { transform: 'translateX(-100%)' },
					to: { transform: 'translateX(0)' },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.2s ease-out',
				'slide-in-left': 'slide-in-left 0.25s ease-out',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
}
