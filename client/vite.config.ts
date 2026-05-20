import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:7432',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:7432',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          // Suppress ECONNRESET noise when uvicorn reloads and drops WS connections.
          // The frontend reconnects automatically via exponential backoff.
          proxy.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code !== 'ECONNRESET') console.error('[ws proxy]', err)
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          editor: ['@codemirror/view', '@codemirror/state', '@uiw/react-codemirror'],
          markdown: ['react-markdown', 'remark-gfm', 'mermaid'],
        },
      },
    },
  },
})
