// "I tuoi dati": informativa, scarica i miei dati, cancella l'account (con la password).

import { useState, type FormEvent } from 'react'
import { ChevronRight, Download, ShieldCheck, Trash2 } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import { Collegamento } from '../comune/router'

export default function PrivacyProfilo({ onEliminato }: { onEliminato: () => void }) {
  const [apri, setApri] = useState(false)
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function elimina(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      await api.eliminaAccount(password)
      onEliminato()
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <section>
      <div className="titolo-sezione"><h2>I tuoi dati</h2></div>
      <ul className="elenco scheda">
        <li>
          <Collegamento a="/privacy" className="riga-scelta">
            <span className="funzione-icona verde"><ShieldCheck size={20} /></span>
            <span className="riga-testo"><strong>Come trattiamo i dati</strong><span>Cosa salviamo, chi lo vede, per quanto</span></span>
            <ChevronRight size={20} />
          </Collegamento>
        </li>
        <li>
          <a className="riga-scelta" href={api.datiPersonali} download="unicare-i-miei-dati.json">
            <span className="funzione-icona blu"><Download size={20} /></span>
            <span className="riga-testo"><strong>Scarica i miei dati</strong><span>Un file con tutto quello che riguarda te</span></span>
          </a>
        </li>
        <li>
          <button className="riga-scelta" onClick={() => setApri(!apri)} aria-expanded={apri}>
            <span className="funzione-icona rosso"><Trash2 size={20} /></span>
            <span className="riga-testo"><strong>Cancella il mio account</strong><span>Per sempre, non si torna indietro</span></span>
          </button>
        </li>
      </ul>
      {apri && (
        <form className="modulo scheda pericolo entra" onSubmit={elimina}>
          <p className="senza-margine">
            Cancelliamo il tuo account e i tuoi dati. Nei cerchi che amministri il ruolo passa a un altro familiare.
            <strong> Se sei l’unico familiare, il cerchio viene cancellato con la scheda, i documenti e tutto il resto.</strong>
          </p>
          <label>Scrivi la tua password per confermare
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {errore && <p className="errore" role="alert">{errore}</p>}
          <div className="riga-pulsanti">
            <button type="button" className="pulsante fantasma" onClick={() => setApri(false)}>Annulla</button>
            <button className="pulsante pericolo" disabled={invio || !password}>{invio ? 'Cancello…' : 'Cancella per sempre'}</button>
          </div>
        </form>
      )}
    </section>
  )
}
