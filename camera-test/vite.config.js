// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true, // listen on all network interfaces
    port: 5173, // optional, default 5173
    strictPort: true,
    allowedHosts: [
      'listless-suborganic-karsyn.ngrok-free.dev', // add your ngrok host here
    ],
  },
})
