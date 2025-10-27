import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'var(--background)',
  			foreground: 'var(--foreground)',
  			card: {
  				DEFAULT: 'var(--card)',
  				foreground: 'var(--card-foreground)'
  			},
  			primary: {
  				DEFAULT: 'var(--primary)',
  				foreground: 'var(--primary-foreground)'
  			},
  			secondary: {
  				DEFAULT: 'var(--secondary)',
  				foreground: 'var(--secondary-foreground)'
  			},
  			destructive: {
  				DEFAULT: 'var(--destructive)',
  				foreground: 'var(--destructive-foreground)'
  			},
  			muted: {
  				DEFAULT: 'var(--muted)',
  				foreground: 'var(--muted-foreground)'
  			},
  			accent: {
  				DEFAULT: 'var(--accent)',
  				foreground: 'var(--accent-foreground)'
  			},
  			border: 'var(--border)',
  			input: 'var(--input)',
  			ring: 'var(--ring)',
  			popover: {
  				DEFAULT: 'var(--popover)',
  				foreground: 'var(--popover-foreground)'
  			},
  			chart: {
  				'1': 'var(--chart-1)',
  				'2': 'var(--chart-2)',
  				'3': 'var(--chart-3)',
  				'4': 'var(--chart-4)',
  				'5': 'var(--chart-5)'
  			},
  			// Semantic color tokens for consistent status/state indication
  			success: {
  				bg: 'hsl(142, 76%, 95%)',
  				bgSubtle: 'hsl(142, 76%, 90%)',
  				border: 'hsl(142, 76%, 85%)',
  				text: 'hsl(142, 76%, 25%)',
  				textMuted: 'hsl(142, 76%, 35%)',
  				DEFAULT: 'hsl(142, 76%, 45%)',
  			},
  			warning: {
  				bg: 'hsl(45, 93%, 95%)',
  				bgSubtle: 'hsl(45, 93%, 90%)',
  				border: 'hsl(45, 93%, 85%)',
  				text: 'hsl(45, 93%, 25%)',
  				textMuted: 'hsl(45, 93%, 35%)',
  				DEFAULT: 'hsl(45, 93%, 47%)',
  			},
  			error: {
  				bg: 'hsl(0, 93%, 95%)',
  				bgSubtle: 'hsl(0, 93%, 90%)',
  				border: 'hsl(0, 93%, 85%)',
  				text: 'hsl(0, 93%, 30%)',
  				textMuted: 'hsl(0, 93%, 40%)',
  				DEFAULT: 'hsl(0, 93%, 50%)',
  			},
  			info: {
  				bg: 'hsl(210, 93%, 95%)',
  				bgSubtle: 'hsl(210, 93%, 90%)',
  				border: 'hsl(210, 93%, 85%)',
  				text: 'hsl(210, 93%, 25%)',
  				textMuted: 'hsl(210, 93%, 35%)',
  				DEFAULT: 'hsl(210, 93%, 50%)',
  			},
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
