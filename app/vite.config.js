import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'strip-crossorigin',
      transformIndexHtml: h => h.replace(/ crossorigin(="[^"]*")?/g, ''),
    },
  ],
})
