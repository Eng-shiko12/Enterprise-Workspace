import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // Where the API runs during `npm run dev` (the browser only ever talks to the Vite origin,
  // so cookies stay first-party and no CORS setup is needed locally)
  const target = env.DEV_API_TARGET || 'http://localhost:5000'

  return {
    plugins: [react()],
    test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.js'], css: false },
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/socket.io': { target, ws: true, changeOrigin: true },
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rolldownOptions: {
        output: {
          advancedChunks: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
              { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
              { name: 'dnd', test: /node_modules[\\/]@hello-pangea[\\/]/ },
            ],
          },
        },
      },
    },
  }
})
