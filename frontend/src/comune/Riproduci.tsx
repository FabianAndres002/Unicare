// Pulsante per ascoltare un messaggio vocale, con la barra di avanzamento.

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { scaricaAudio } from './api'
import { minutiSecondi } from './registratore'

/**
 * Pulsante play/pausa. "sorgente" è l'indirizzo dell'audio sul server (si scarica al primo tocco)
 * oppure un audio appena registrato.
 */
export default function Riproduci(props: {
  sorgente: string | Blob
  durata: number
  grande?: boolean
  etichetta?: string
  onAscoltato?: () => void
}) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const [suona, setSuona] = useState(false)
  const [carica, setCarica] = useState(false)
  const [posizione, setPosizione] = useState(0)
  const [errore, setErrore] = useState(false)

  useEffect(() => () => {
    audio.current?.pause()
    if (audio.current?.src.startsWith('blob:')) URL.revokeObjectURL(audio.current.src)
  }, [])

  async function tocca() {
    if (audio.current && suona) {
      audio.current.pause()
      return
    }
    setErrore(false)
    try {
      if (!audio.current) {
        setCarica(true)
        const blob = typeof props.sorgente === 'string' ? await scaricaAudio(props.sorgente) : props.sorgente
        const a = new Audio(URL.createObjectURL(blob))
        a.ontimeupdate = () => setPosizione(a.currentTime)
        a.onplay = () => setSuona(true)
        a.onpause = () => setSuona(false)
        a.onended = () => { setSuona(false); setPosizione(0) }
        audio.current = a
        setCarica(false)
        props.onAscoltato?.()
      }
      await audio.current.play()
    } catch {
      setCarica(false)
      setErrore(true)
    }
  }

  const avanzamento = Math.min(100, (posizione / props.durata) * 100)
  return (
    <div className={`riproduci ${props.grande ? 'grande' : ''}`}>
      <button type="button" className="riproduci-tasto" onClick={tocca} disabled={carica}
        aria-label={suona ? 'Pausa' : props.etichetta ?? 'Ascolta il messaggio'}>
        {carica ? <span className="rotella piccola" /> : suona ? <Pause size={props.grande ? 34 : 20} fill="currentColor" /> : <Play size={props.grande ? 34 : 20} fill="currentColor" />}
      </button>
      <span className="riproduci-barra" aria-hidden="true"><span style={{ width: `${avanzamento}%` }} /></span>
      <span className="riproduci-tempo">{minutiSecondi(suona || posizione ? posizione : props.durata)}</span>
      {errore && <span className="errore piccolo">Non riesco a farlo suonare. Riprova.</span>}
    </div>
  )
}
