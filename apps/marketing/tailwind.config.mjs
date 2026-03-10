/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'deep-taupe': '#4d4c4c',
        'warm-brown': '#804e3f',
        'silver-gray': '#d8c8b6',
        sand:         '#cbb19d',
        stone:        '#bfae9b',
        dove:         '#e2d4c6',
        cloud:        '#e9e8e6',
      },
      fontFamily: {
        serif: ['"Noto Serif Display"', 'Georgia', 'serif'],
        sans:  ['Poppins', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
