import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Development only: browser requests stay same-origin; deployed gates remain.
  server: { proxy: { "/api/v1": { target: "http://localhost:4321", changeOrigin: false } } },
})
