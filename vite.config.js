import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        bills: './bills.html',
        blog: './blog.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
})

