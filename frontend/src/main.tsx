import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ascoltaNotifiche } from './comune/campanello'
import { caricaLingua } from './comune/lingua'

// Il logo d'avvio (in index.html) resta almeno 1,8 secondi, poi sfuma.
const avvio = document.getElementById('avvio')
if (avvio) {
  const resta = Math.max(0, 1800 - performance.now())
  setTimeout(() => {
    avvio.classList.add('via')
    setTimeout(() => avvio.remove(), 450)
  }, resta)
}

// Prima la lingua, poi l'app: così anche i testi delle costanti escono tradotti.
caricaLingua()
  .catch(() => {})
  .then(() => import('./App.tsx'))
  .then(({ default: App }) => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })

// Registra il service worker: senza, l'app non è installabile e non riceve notifiche.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
  ascoltaNotifiche()
}
