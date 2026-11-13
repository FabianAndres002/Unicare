// Registrare un messaggio vocale con il microfono del telefono.
//
// Si registra con il microfono del telefono (MediaRecorder): il browser chiede il permesso
// la prima volta. Chrome registra in webm, l'iPhone in mp4: il server li accetta tutti e due.

import { useEffect, useRef, useState } from 'react'

export const DURATA_MASSIMA = 120

export type Registrazione = { audio: Blob; durata: number; url: string }
type Stato = 'fermo' | 'permesso' | 'registra' | 'pronto'

/** "0:07", "1:30". */
export const minutiSecondi = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const FORMATI = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']

export function useRegistratore() {
  const [stato, setStato] = useState<Stato>('fermo')
  const [secondi, setSecondi] = useState(0)
  const [registrazione, setRegistrazione] = useState<Registrazione | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const registratore = useRef<MediaRecorder | null>(null)
  const microfono = useRef<MediaStream | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const scarta = useRef(false)

  function spegniMicrofono() {
    clearInterval(timer.current)
    microfono.current?.getTracks().forEach((t) => t.stop())
    microfono.current = null
  }

  useEffect(() => () => {
    scarta.current = true
    if (registratore.current?.state === 'recording') registratore.current.stop()
    spegniMicrofono()
  }, [])

  useEffect(() => () => { if (registrazione) URL.revokeObjectURL(registrazione.url) }, [registrazione])

  async function inizia() {
    setErrore(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setErrore('Questo telefono non riesce a registrare. Prova ad aggiornare il browser.')
      return
    }
    setStato('permesso')
    try {
      microfono.current = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStato('fermo')
      setErrore('Serve il permesso di usare il microfono. Puoi darlo dalle impostazioni del telefono.')
      return
    }
    const formato = FORMATI.find((f) => MediaRecorder.isTypeSupported(f))
    const r = new MediaRecorder(microfono.current, formato ? { mimeType: formato } : undefined)
    const pezzi: Blob[] = []
    const inizio = Date.now()
    scarta.current = false
    r.ondataavailable = (e) => { if (e.data.size) pezzi.push(e.data) }
    r.onstop = () => {
      spegniMicrofono()
      if (scarta.current) return
      const durata = Math.min(DURATA_MASSIMA, (Date.now() - inizio) / 1000)
      if (durata < 1) {
        setStato('fermo')
        setErrore('Troppo corto: parla un po’ di più prima di fermare.')
        return
      }
      const audio = new Blob(pezzi, { type: (r.mimeType || formato || 'audio/webm').replace(/\s/g, '') })
      setRegistrazione({ audio, durata, url: URL.createObjectURL(audio) })
      setStato('pronto')
    }
    registratore.current = r
    r.start(250)
    setSecondi(0)
    setStato('registra')
    timer.current = window.setInterval(() => {
      const s = (Date.now() - inizio) / 1000
      setSecondi(s)
      if (s >= DURATA_MASSIMA && r.state === 'recording') r.stop()
    }, 250)
  }

  /** Smette di registrare e tiene il messaggio, pronto da mandare. */
  function ferma() {
    if (registratore.current?.state === 'recording') registratore.current.stop()
  }

  /** Butta via il messaggio (anche mentre registra). */
  function annulla() {
    scarta.current = true
    if (registratore.current?.state === 'recording') registratore.current.stop()
    spegniMicrofono()
    setRegistrazione(null)
    setStato('fermo')
  }

  return { stato, secondi, registrazione, errore, inizia, ferma, annulla }
}
