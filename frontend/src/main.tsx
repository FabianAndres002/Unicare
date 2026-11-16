import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ascoltaNotifiche } from './comune/campanello'

// Il logo d'avvio (in index.html) resta almeno 1,5 secondi, poi sfuma.
const avvio = document.getElementById('avvio')
if (avvio) {
  const resta = Math.max(0, 1500 - performance.now())
  setTimeout(() => {
    avvio.classList.add('via')
    setTimeout(() => avvio.remove(), 450)
  }, resta)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registra il service worker: senza, l'app non è installabile e non riceve notifiche.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
  ascoltaNotifiche()
}
