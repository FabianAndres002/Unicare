import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In sviluppo il frontend gira su http://localhost:5173 e il backend su :8080.
// Il proxy gira le chiamate /api al backend, così il browser vede un solo indirizzo
// (come in produzione, dove il backend servirà anche questi file).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
    // Per le prove sui telefoni (comando "Prova sui telefoni" di VS Code): l'indirizzo
    // https temporaneo di Cloudflare finisce sempre con .trycloudflare.com.
    allowedHosts: ['.trycloudflare.com'],
  },
})
