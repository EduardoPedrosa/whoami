import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/socket.io': { target: 'http://localhost:3005', ws: true },
      '/api': 'http://localhost:3005',
    },
  },
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|scheduler)\//, priority: 30 },
            {
              name: 'motion',
              test: /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//,
              priority: 20,
            },
            {
              name: 'realtime',
              test: /node_modules\/(socket.io-client|engine.io-client|socket.io-parser|engine.io-parser)\//,
              priority: 10,
            },
          ],
        },
      },
    },
  },
})
