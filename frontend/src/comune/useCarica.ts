// Carica dati dal backend e li ricarica da solo: ogni tot secondi e quando torni sulla pagina.
// Così se un familiare prende una richiesta, gli altri lo vedono senza ricaricare.

import { useCallback, useEffect, useRef, useState } from 'react'
import { messaggioErrore } from './api'

export function useCarica<T>(carica: () => Promise<T>, chiave: unknown, ogniSecondi = 30) {
  const [dati, setDati] = useState<T | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const funzione = useRef(carica)
  useEffect(() => {
    funzione.current = carica // sempre l'ultima versione della funzione
  })

  const ricarica = useCallback(async () => {
    try {
      setDati(await funzione.current())
      setErrore(null)
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
  }, [])

  useEffect(() => {
    setDati(null)
    ricarica()
    const timer = setInterval(() => document.visibilityState === 'visible' && ricarica(), ogniSecondi * 1000)
    const visibile = () => document.visibilityState === 'visible' && ricarica()
    document.addEventListener('visibilitychange', visibile)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visibile)
    }
  }, [chiave, ogniSecondi, ricarica])

  return { dati, errore, ricarica, setDati }
}
