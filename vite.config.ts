import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? process.env.VITE_BASE_PATH || '/cinequim-ffclrp/' : '/',
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { output: { manualChunks: { katex: ['katex'] } } } },
}))
