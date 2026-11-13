// Registra un messaggio vocale, lo fa riascoltare e lo manda.
// grande: la versione per la Senior App, con pulsanti enormi.

import { useState } from 'react'
import { Check, Mic, RotateCcw, Send, Square, X } from 'lucide-react'
import { messaggioErrore } from './api'
import { DURATA_MASSIMA, minutiSecondi, useRegistratore } from './registratore'
import Riproduci from './Riproduci'

type Props = {
  grande?: boolean
  /** Il testo del pulsante iniziale. */
  invito: string
  /** Cosa dire dopo l'invio. */
  inviato: string
  onInvia: (audio: Blob, durata: number) => Promise<unknown>
}

export default function RegistraVocale({ grande, invito, inviato, onInvia }: Props) {
  const r = useRegistratore()
  const [invio, setInvio] = useState(false)
  const [fatto, setFatto] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const p = grande ? 'senior-pulsante' : 'pulsante'
  const icona = grande ? 30 : 20

  async function invia() {
    if (!r.registrazione) return
    setInvio(true)
    setErrore(null)
    try {
      await onInvia(r.registrazione.audio, r.registrazione.durata)
      r.annulla()
      setFatto(true)
      setTimeout(() => setFatto(false), 4000)
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setInvio(false)
  }

  if (fatto) {
    return <p className={`${grande ? 'senior-avviso' : 'avviso-ok'} entra`} role="status"><Check size={icona} /> {inviato}</p>
  }

  return (
    <div className={`registra ${grande ? 'grande' : ''}`}>
      {(r.stato === 'fermo' || r.stato === 'permesso') && (
        <button className={`${p} con-icona registra-inizia`} onClick={r.inizia} disabled={r.stato === 'permesso'}>
          <Mic size={grande ? 40 : 22} /> {r.stato === 'permesso' ? 'Consenti il microfono…' : invito}
        </button>
      )}

      {r.stato === 'registra' && (
        <div className="registra-in-corso" role="status">
          <span className="registra-punto" aria-hidden="true" />
          <strong>Sto registrando</strong>
          <span className="registra-tempo">{minutiSecondi(r.secondi)} <small>/ {minutiSecondi(DURATA_MASSIMA)}</small></span>
          <button className={`${p} con-icona`} onClick={r.ferma}><Square size={icona} fill="currentColor" /> Ho finito</button>
          <button className={`${p} ${grande ? 'chiaro' : 'fantasma'} con-icona`} onClick={r.annulla}><X size={icona} /> Annulla</button>
        </div>
      )}

      {r.stato === 'pronto' && r.registrazione && (
        <div className="registra-pronto">
          <p className="registra-domanda">Ascoltalo, poi mandalo.</p>
          <Riproduci sorgente={r.registrazione.audio} durata={r.registrazione.durata} grande={grande} etichetta="Riascolta" />
          <button className={`${p} con-icona`} onClick={invia} disabled={invio}><Send size={icona} /> {invio ? 'Invio…' : 'Manda'}</button>
          <button className={`${p} ${grande ? 'chiaro' : 'fantasma'} con-icona`} onClick={r.annulla} disabled={invio}><RotateCcw size={icona} /> Rifallo</button>
        </div>
      )}

      {(r.errore || errore) && <p className={grande ? 'senior-errore' : 'errore'} role="alert">{r.errore ?? errore}</p>}
    </div>
  )
}
