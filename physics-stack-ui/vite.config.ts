import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

const port = Number(process.env.PORT)
const listenPort = Number.isFinite(port) && port > 0 ? port : undefined

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  root: '.',
  server: {
    // Render / containers: must listen on all interfaces (not only localhost)
    host: '0.0.0.0',
    ...(listenPort != null ? { port: listenPort, strictPort: true } : {}),
    fs: {
      // Restrict file system access to only the project directory
      allow: ['.']
    }
  },
  preview: {
    host: '0.0.0.0',
    ...(listenPort != null ? { port: listenPort, strictPort: true } : {}),
  },
})
