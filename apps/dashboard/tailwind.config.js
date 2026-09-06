/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy aliases — kept for backward compat
        'deep-taupe':   '#4d4c4c',
        'warm-brown':   '#804e3f',
        'silver-gray':  '#d8c8b6',
        'sand':         '#cbb19d',
        'stone':        '#bfae9b',
        'dove':         '#e2d4c6',
        'cloud':        '#e9e8e6',
        'charcoal':     '#4d4c4c',

        // Design system scales
        brand: {
          50:  '#fdf6f3',
          100: '#f9ebe4',
          200: '#f0d0c3',
          300: '#e3a98f',
          400: '#d47d5e',
          500: '#804e3f',   // ← PRIMARY
          600: '#6b3e31',
          700: '#572f24',
          800: '#41211a',
          900: '#2c150f',
        },
        status: {
          available:          '#16a34a',
          'available-bg':     '#dcfce7',
          'available-ring':   '#86efac',
          adopted:            '#4f46e5',
          'adopted-bg':       '#e0e7ff',
          'adopted-ring':     '#a5b4fc',
          pending:            '#d97706',
          'pending-bg':       '#fef3c7',
          'pending-ring':     '#fde68a',
          foster:             '#9333ea',
          'foster-bg':        '#f3e8ff',
          'foster-ring':      '#d8b4fe',
          medical:            '#dc2626',
          'medical-bg':       '#fee2e2',
          'medical-ring':     '#fca5a5',
        },
        surface: {
          base:   '#f5f0ee',
          card:   '#ffffff',
          muted:  '#f9f5f3',
          border: '#e8ddd9',
        },
      },
      borderRadius: {
        'card': '16px',
        'chip': '999px',
        'btn':  '10px',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(128,78,63,0.12), 0 2px 4px rgba(0,0,0,0.06)',
        'modal':      '0 20px 60px rgba(0,0,0,0.15)',
      },
      fontFamily: {
        heading: ['"Noto Serif Display"', 'Georgia', 'serif'],
        body:    ['Poppins', 'system-ui', 'sans-serif'],
        // Legacy aliases
        'serif': ['"Noto Serif Display"', 'Georgia', 'serif'],
        'sans':  ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'fade-up':  'fade-up 0.2s ease-out',
        'slide-in': 'slide-in 0.15s ease-out',
        'toast-progress': 'toast-progress 4s linear forwards',
      },
      keyframes: {
        skeleton: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.45' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'toast-progress': {
          '0%':   { width: '100%' },
          '100%': { width: '0%' },
        },
      },
    },
  },
  plugins: [],
}
