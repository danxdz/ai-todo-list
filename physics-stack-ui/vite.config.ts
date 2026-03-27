import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  root: '.',
  server: {
    fs: {
      // Restrict file system access to only the project directory
      allow: ['.']
    }
  }
})
