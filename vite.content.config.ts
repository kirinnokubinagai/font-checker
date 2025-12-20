import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  publicDir: false, // Don't copy public assets again
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        // Inline everything into the entry file
        inlineDynamicImports: true, 
        format: 'iife',
      }
    },
    outDir: 'dist',
    emptyOutDir: false, // Don't clear dist, we append to it
    cssCodeSplit: false, // Inline CSS or single file
  },
})
