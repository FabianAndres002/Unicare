// Una richiesta in un elenco: icona, cosa serve, chi se ne occupa, e il pulsante "Me ne occupo io".

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { api, messaggioErrore, type Richiesta } from '../comune/api'
import { Collegamento } from '../comune/router'
import { tempoFa } from '../comune/utili'
import { CATEGORIE, STATI } from './aspetto'

type Props = { richiesta: Richiesta; mioId: number; onCambiata: () => void }

export default function SchedaRichiesta({ richiesta: r, mioId, onCambiata }: Props) {
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const { etichetta, Icona, colore } = CATEGORIE[r.categoria]
  const stato = STATI[r.stato]

  async function prendi() {
    setInvio(true)
    setErrore(null)
    try {
      await api.azioneRichiesta(r.id, 'PRENDI')
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setInvio(false)
    onCambiata()
  }

  const autore = r.creataDa?.nome ?? (r.creataDallAnziano ? `${r.anziano.nome} dal suo telefono` : null)
  let chi = `Chiesta ${tempoFa(r.creataIl)}${autore ? ` da ${autore}` : ''}`
  if (r.stato === 'PRESA_IN_CARICO') chi = r.presaDa?.id === mioId ? 'Te ne stai occupando tu' : `Se ne occupa ${r.presaDa?.nome}`
  if (r.chiusaIl) chi = `${stato.etichetta} ${tempoFa(r.chiusaIl)}${r.presaDa && r.stato === 'COMPLETATA' ? ` da ${r.presaDa.nome}` : ''}`

  return (
    <article className={`richiesta ${r.stato === 'APERTA' ? 'richiesta-aperta' : ''}`}>
      <Collegamento a={`/richieste/${r.id}`} className="richiesta-corpo">
        <span className={`funzione-icona ${colore}`}><Icona size={22} /></span>
        <span className="riga-testo">
          <span className="richiesta-titolo">
            <strong>{etichetta}</strong>
            <span className={`stato ${stato.classe}`}>{stato.etichetta}</span>
          </span>
          {r.testo && <span className="richiesta-testo">{r.testo}</span>}
          <span>Per {r.anziano.nome} · {chi}</span>
        </span>
        <ChevronRight size={20} className="freccia" />
      </Collegamento>
      {r.azioni.includes('PRENDI') && (
        <div className="richiesta-azione">
          {errore && <p className="errore piccolo">{errore}</p>}
          <button className="pulsante piccolo" onClick={prendi} disabled={invio}>{invio ? 'Un momento…' : 'Me ne occupo io'}</button>
        </div>
      )}
    </article>
  )
}
