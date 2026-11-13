// S3-S4: "Di cosa hai bisogno?" con 5 pulsanti grandi, una conferma
// (per non chiedere per sbaglio) e poi "Fatto, ho avvisato la tua famiglia".

import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { api, messaggioErrore, type Categoria, type SeniorIo } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import { CATEGORIE } from '../richieste/aspetto'
import { COSA_CHIEDO } from './parole'

type Props = { io: SeniorIo; onInviata: () => void }
type Scelta = Exclude<Categoria, 'ALTRO'>

const SCELTE = Object.keys(COSA_CHIEDO) as Scelta[]

export default function ChiediAiuto({ io, onInviata }: Props) {
  const [scelta, setScelta] = useState<Scelta | null>(null)
  const [inviata, setInviata] = useState(false)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function conferma() {
    if (!scelta) return
    setInvio(true)
    setErrore(null)
    try {
      await api.senior.chiedi(scelta)
      setInviata(true)
      onInviata()
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setInvio(false)
  }

  if (inviata) {
    const familiari = io.famiglia.map((f) => f.nome)
    return (
      <div className="senior-pagina senior-centro entra">
        <span className="senior-fatto"><Check size={64} strokeWidth={3} /></span>
        <h1>Fatto!</h1>
        <p className="senior-testo">
          Ho avvisato {familiari.length ? familiari.join(', ').replace(/, ([^,]*)$/, ' e $1') : 'la tua famiglia'}.
          Ti dirò qui chi se ne occupa.
        </p>
        <button className="senior-pulsante" onClick={() => naviga('/senior', true)}>Torna all'inizio</button>
      </div>
    )
  }

  if (scelta) {
    const { Icona, colore } = CATEGORIE[scelta]
    return (
      <div className="senior-pagina senior-centro entra">
        <span className={`funzione-icona senior-icona-conferma ${colore}`}><Icona size={56} /></span>
        <h1>{COSA_CHIEDO[scelta].domanda}</h1>
        {errore && <p className="senior-errore" role="alert">{errore}</p>}
        <button className="senior-pulsante" onClick={conferma} disabled={invio}>{invio ? 'Un momento…' : 'Sì, chiedi'}</button>
        <button className="senior-pulsante chiaro" onClick={() => setScelta(null)} disabled={invio}>No, torna indietro</button>
      </div>
    )
  }

  return (
    <div className="senior-pagina entra">
      <Collegamento a="/senior" className="senior-indietro"><ArrowLeft size={28} /> Indietro</Collegamento>
      <h1>Di cosa hai bisogno?</h1>
      <div className="senior-griglia">
        {SCELTE.map((c) => {
          const { Icona, colore } = CATEGORIE[c]
          return (
            <button key={c} className="senior-scelta" onClick={() => setScelta(c)}>
              <span className={`funzione-icona ${colore}`}><Icona size={40} /></span>
              <span>{COSA_CHIEDO[c].titolo}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
