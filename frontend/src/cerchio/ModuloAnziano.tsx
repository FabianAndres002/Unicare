// Dati della persona assistita: usato sia per crearla sia per modificarla.

import { useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { messaggioErrore, type DatiAnziano } from '../comune/api'

type Props = {
  iniziale?: DatiAnziano
  /** true = nuova scheda: serve il consenso privacy. */
  nuovo: boolean
  testoPulsante: string
  onSalva: (dati: DatiAnziano) => Promise<void>
}

const OGGI = new Date().toISOString().slice(0, 10)

const VUOTO: DatiAnziano = { nome: '', cognome: '', dataNascita: '', comune: '' }

export default function ModuloAnziano({ iniziale = VUOTO, nuovo, testoPulsante, onSalva }: Props) {
  const [dati, setDati] = useState<DatiAnziano>({ ...iniziale, dataNascita: iniziale.dataNascita ?? '', comune: iniziale.comune ?? '' })
  const [consenso, setConsenso] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  const cambia = (campo: keyof DatiAnziano) => (valore: string) => setDati((d) => ({ ...d, [campo]: valore }))

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      await onSalva({ ...dati, dataNascita: dati.dataNascita || null, comune: dati.comune || null })
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo" onSubmit={invia}>
      <div className="due-colonne">
        <label>
          Nome
          <input required value={dati.nome} onChange={(e) => cambia('nome')(e.target.value)} placeholder="Giuseppina" />
        </label>
        <label>
          Cognome
          <input required value={dati.cognome} onChange={(e) => cambia('cognome')(e.target.value)} placeholder="Rossi" />
        </label>
      </div>
      <div className="due-colonne">
        <label>
          <span>Data di nascita <span className="nota">facoltativa</span></span>
          <input type="date" value={dati.dataNascita ?? ''} max={OGGI}
            onChange={(e) => cambia('dataNascita')(e.target.value)} />
        </label>
        <label>
          <span>Comune <span className="nota">facoltativo</span></span>
          <input value={dati.comune ?? ''} onChange={(e) => cambia('comune')(e.target.value)} placeholder="Caserta" />
        </label>
      </div>
      {nuovo && (
        <label className="consenso">
          <input type="checkbox" required checked={consenso} onChange={(e) => setConsenso(e.target.checked)} />
          <span>
            <ShieldCheck size={18} className="icona-inline" />
            Ho informato {dati.nome.trim() || 'la persona'} e ho il suo consenso (o di chi la rappresenta) a usare
            questi dati in Unicare per organizzare la sua assistenza. Non inseriamo dati sanitari.
          </span>
        </label>
      )}
      {errore && <p className="errore" role="alert">{errore}</p>}
      <button className="pulsante" type="submit" disabled={invio || (nuovo && !consenso)}>
        {invio ? 'Salvataggio…' : testoPulsante}
      </button>
    </form>
  )
}
