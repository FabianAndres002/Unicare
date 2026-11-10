// Un piccolo "router": decide la pagina dall'indirizzo (location.pathname)
// e cambia indirizzo senza ricaricare la pagina (history.pushState).

import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'

const EVENTO = 'unicare:naviga'

/** Va a un'altra pagina dell'app. */
export function naviga(percorso: string, sostituisci = false): void {
  if (sostituisci) history.replaceState(null, '', percorso)
  else history.pushState(null, '', percorso)
  window.dispatchEvent(new Event(EVENTO))
  window.scrollTo(0, 0)
}

/** L'indirizzo attuale; il componente si aggiorna quando cambia (anche col tasto Indietro). */
export function usePercorso(): string {
  const [percorso, setPercorso] = useState(location.pathname)
  useEffect(() => {
    const aggiorna = () => setPercorso(location.pathname)
    window.addEventListener('popstate', aggiorna)
    window.addEventListener(EVENTO, aggiorna)
    return () => {
      window.removeEventListener('popstate', aggiorna)
      window.removeEventListener(EVENTO, aggiorna)
    }
  }, [])
  return percorso
}

type PropsCollegamento = { a: string; className?: string; children: ReactNode; 'aria-current'?: 'page' }

/** Come <a href>, ma senza ricaricare la pagina. */
export function Collegamento({ a, children, ...altro }: PropsCollegamento) {
  function clic(e: MouseEvent) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return // apri in nuova scheda: lascia fare al browser
    e.preventDefault()
    naviga(a)
  }
  return <a href={a} onClick={clic} {...altro}>{children}</a>
}
