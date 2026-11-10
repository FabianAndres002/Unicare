import { useState, type FormEvent } from 'react'
import { api, ErroreApi, type DatiRegistrazione, type Profilo } from '../comune/api'
import Intestazione from './Intestazione'

type Props = {
  onEntrato: (profilo: Profilo) => void
  onVaiAdAccedi: () => void
}

const VUOTO: DatiRegistrazione = { email: '', password: '', nome: '', cognome: '', tipo: 'FAMILIARE' }

export default function Registrati({ onEntrato, onVaiAdAccedi }: Props) {
  const [dati, setDati] = useState<DatiRegistrazione>(VUOTO)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  // Aggiorna un solo campo del modulo.
  const cambia = (campo: keyof DatiRegistrazione) => (valore: string) =>
    setDati((d) => ({ ...d, [campo]: valore }))

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    if (dati.password.length < 8) {
      setErrore('La password deve avere almeno 8 caratteri.')
      return
    }
    setInvio(true)
    try {
      onEntrato(await api.registrati(dati))
    } catch (err) {
      setErrore(err instanceof ErroreApi ? err.message : 'Connessione non riuscita. Riprova.')
    } finally {
      setInvio(false)
    }
  }

  return (
    <main className="pagina">
      <Intestazione sottotitolo="Crea il tuo account" />
      <form className="scheda modulo" onSubmit={invia}>
        <fieldset className="scelta">
          <legend>Chi sei?</legend>
          <label className={dati.tipo === 'FAMILIARE' ? 'attiva' : ''}>
            <input type="radio" name="tipo" checked={dati.tipo === 'FAMILIARE'}
              onChange={() => cambia('tipo')('FAMILIARE')} />
            Un familiare
          </label>
          <label className={dati.tipo === 'BADANTE' ? 'attiva' : ''}>
            <input type="radio" name="tipo" checked={dati.tipo === 'BADANTE'}
              onChange={() => cambia('tipo')('BADANTE')} />
            Una badante
          </label>
        </fieldset>
        <label>
          Nome
          <input autoComplete="given-name" required value={dati.nome}
            onChange={(e) => cambia('nome')(e.target.value)} />
        </label>
        <label>
          Cognome
          <input autoComplete="family-name" required value={dati.cognome}
            onChange={(e) => cambia('cognome')(e.target.value)} />
        </label>
        <label>
          Email
          <input type="email" autoComplete="email" required value={dati.email}
            onChange={(e) => cambia('email')(e.target.value)} />
        </label>
        <label>
          Password <span className="nota">(almeno 8 caratteri)</span>
          <input type="password" autoComplete="new-password" required value={dati.password}
            onChange={(e) => cambia('password')(e.target.value)} />
        </label>
        {errore && <p className="errore" role="alert">{errore}</p>}
        <button className="pulsante" type="submit" disabled={invio}>
          {invio ? 'Creazione…' : 'Crea account'}
        </button>
      </form>
      <p className="cambio">
        Hai già un account?{' '}
        <button className="link" type="button" onClick={onVaiAdAccedi}>Accedi</button>
      </p>
    </main>
  )
}
