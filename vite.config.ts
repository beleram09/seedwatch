import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // In production, Transmission serves from /transmission/web/
  base: process.env.NODE_ENV === 'production' ? '/transmission/web/' : '/',
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    port: 3000,
    allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(',') || [],
    proxy: {
      '/transmission': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:9091',
        changeOrigin: true,
      },
    },
  },
})
