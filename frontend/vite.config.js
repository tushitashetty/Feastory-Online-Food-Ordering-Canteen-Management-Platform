import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, /api and /uploads are proxied to the FastAPI server so the app
// works with no CORS config. In production VITE_API_URL points at the API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000',
    },
  },
})
