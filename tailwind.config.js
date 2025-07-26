/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'slide-down': {
  				from: { height: '0', opacity: '0' },
  				to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' }
  			},
  			'slide-up': {
  				from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
  				to: { height: '0', opacity: '0' }
  			}
  		},
  		animation: {
  			'slide-down': 'slide-down 0.3s ease-out',
  			'slide-up': 'slide-up 0.3s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
