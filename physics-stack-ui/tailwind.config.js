/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Neon game theme
        primary: '#00ffff',
        secondary: '#ff00ff',
        accent: '#ffff00',
        dark: '#0a0a0a',
        darker: '#050505',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
      }
    },
  },
  plugins: [],
}

