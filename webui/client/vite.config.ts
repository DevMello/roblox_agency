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
      '/api': 'http://127.0.0.1:7432',
      '/ws': { target: 'ws://127.0.0.1:7432', ws: true },
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
