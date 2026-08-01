/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#1f2937',
          foreground: '#f9fafb',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: '#1f2937',
          foreground: '#9ca3af',
        },
        accent: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
        popover: {
          DEFAULT: '#111827',
          foreground: '#f9fafb',
        },
        card: {
          DEFAULT: '#111827',
          foreground: '#f9fafb',
        },
        sidebar: {
          DEFAULT: '#0f172a',
          foreground: '#f9fafb',
          primary: '#10b981',
          'primary-foreground': '#ffffff',
          accent: '#1f2937',
          'accent-foreground': '#f9fafb',
          border: '#172131',
          ring: '#10b981',
        },
        nexora: {
          bg: '#0b0f17',
          panel: '#111827',
          card: '#1f2937',
          emerald: '#10b981',
          emeraldDark: '#047857',
          text: '#f9fafb',
          muted: '#9ca3af',
        }
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      transitionDuration: {
        150: '150ms',
        200: '200ms',
      }
    },
  },
  plugins: [],
}
