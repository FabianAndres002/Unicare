import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In sviluppo il frontend gira su http://localhost:5173 e il backend su :8080.
// Il proxy gira le chiamate /api al backend, così il browser vede un solo indirizzo
// (come in produzione, dove Spring Boot servirà anche questi file).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
