import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En desarrollo, Vite reenvía /api y /socket.io a la API (mismo origen: la cookie
// de sesión funciona sin CORS). En Dokploy lo hace nginx (ver nginx.conf).
const API = process.env.API_URL ?? 'http://localhost:3001'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/socket.io': { target: API, changeOrigin: true, ws: true },
    },
  },
})
