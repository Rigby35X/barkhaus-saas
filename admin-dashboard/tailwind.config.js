/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-taupe': '#4d4c4c',
        'warm-brown': '#804e3f',
        'sand': '#cbb19d',
        'stone': '#bfae9b',
        'dove': '#e2d4c6',
        'cloud': '#e9e8e6',
      },
      fontFamily: {
        'serif': ['Noto Serif Display', 'serif'],
        'sans': ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
