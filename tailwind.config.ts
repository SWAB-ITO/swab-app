import type { Config } from "tailwindcss";

export default {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
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
