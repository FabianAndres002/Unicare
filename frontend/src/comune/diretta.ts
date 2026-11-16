// Aggiornamenti in diretta dal server (Server-Sent Events).
//
// Una sola connessione per pagina, condivisa da tutti i componenti che ascoltano.
// Il server manda solo "la richiesta 12 è cambiata": chi ascolta ricarica i suoi dati.
// Se la linea cade (telefono in tasca, rete che salta) il browser si ricollega da solo;
// al ritorno chiamiamo tutti, perché nel frattempo potremmo aver perso qualcosa.

import { useEffect, useRef } from 'react'

type Ascoltatore = (dati: unknown) => void
type Fonte = { es: EventSource; ascoltatori: Map<string, Set<Ascoltatore>>; giaAperta: boolean; chiusura?: number }

const fonti = new Map<string, Fonte>()

function apri(url: string): Fonte {
  const esistente = fonti.get(url)
  if (esistente) {
    clearTimeout(esistente.chiusura)
    return esistente
  }
  const fonte: Fonte = { es: new EventSource(url), ascoltatori: new Map(), giaAperta: false }
  fonte.es.addEventListener('open', () => {
    if (fonte.giaAperta) for (const tutti of fonte.ascoltatori.values()) for (const a of tutti) a(null)
    fonte.giaAperta = true
  })
  fonti.set(url, fonte)
  return fonte
}

function ascolta(url: string, evento: string, fn: Ascoltatore): () => void {
  const fonte = apri(url)
  let suoi = fonte.ascoltatori.get(evento)
  if (!suoi) {
    const nuovi = new Set<Ascoltatore>()
    suoi = nuovi
    fonte.ascoltatori.set(evento, nuovi)
    fonte.es.addEventListener(evento, (e) => {
      let dati: unknown = null
      try { dati = JSON.parse((e as MessageEvent).data) } catch { /* niente dati */ }
      for (const a of nuovi) a(dati)
    })
  }
  suoi.add(fn)
  return () => {
    suoi.delete(fn)
    const vuota = [...fonte.ascoltatori.values()].every((s) => s.size === 0)
    // Si chiude dopo qualche secondo: passando da una pagina all'altra la connessione resta.
    if (vuota) {
      fonte.chiusura = window.setTimeout(() => {
        fonte.es.close()
        fonti.delete(url)
      }, 5000)
    }
  }
}

/**
 * Chiama "quando" ogni volta che il server annuncia l'evento (per esempio "richiesta").
 * url null = non collegarti (per esempio prima del login).
 */
export function useDiretta(url: string | null, evento: string, quando: (dati: unknown) => void) {
  const fn = useRef(quando)
  useEffect(() => {
    fn.current = quando
  })
  useEffect(() => {
    if (!url || typeof EventSource === 'undefined') return
    return ascolta(url, evento, (d) => fn.current(d))
  }, [url, evento])
}
