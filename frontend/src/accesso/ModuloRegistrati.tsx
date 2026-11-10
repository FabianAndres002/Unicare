import { useState, type FormEvent } from 'react'
import { HeartHandshake, Users } from 'lucide-react'
import { api, messaggioErrore, type DatiRegistrazione, type Profilo, type TipoUtente } from '../comune/api'

type Props = {
  onEntrato: (profilo: Profilo) => void
  /** Dall'invito: email e tipo sono già decisi. */
  emailIniziale?: string
  tipoFisso?: TipoUtente
}

export default function ModuloRegistrati({ onEntrato, emailIniziale = '', tipoFisso }: Props) {
  const [dati, setDati] = useState<DatiRegistrazione>({
    email: emailIniziale, password: '', nome: '', cognome: '', tipo: tipoFisso ?? 'FAMILIARE',
  })
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  const cambia = (campo: keyof DatiRegistrazione) => (valore: string) => setDati((d) => ({ ...d, [campo]: valore }))

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
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo" onSubmit={invia}>
      {!tipoFisso && (
        <fieldset className="scelta">
          <legend>Chi sei?</legend>
          <label className={dati.tipo === 'FAMILIARE' ? 'attiva' : ''}>
            <input type="radio" name="tipo" checked={dati.tipo === 'FAMILIARE'} onChange={() => cambia('tipo')('FAMILIARE')} />
            <Users size={22} /> Un familiare
          </label>
          <label className={dati.tipo === 'BADANTE' ? 'attiva' : ''}>
            <input type="radio" name="tipo" checked={dati.tipo === 'BADANTE'} onChange={() => cambia('tipo')('BADANTE')} />
            <HeartHandshake size={22} /> Una badante
          </label>
        </fieldset>
      )}
      <div className="due-colonne">
        <label>
          Nome
          <input autoComplete="given-name" required value={dati.nome} onChange={(e) => cambia('nome')(e.target.value)} />
        </label>
        <label>
          Cognome
          <input autoComplete="family-name" required value={dati.cognome} onChange={(e) => cambia('cognome')(e.target.value)} />
        </label>
      </div>
      <label>
        Email
        <input type="email" autoComplete="email" required value={dati.email} readOnly={!!emailIniziale}
          onChange={(e) => cambia('email')(e.target.value)} />
      </label>
      <label>
        <span>Password <span className="nota">almeno 8 caratteri</span></span>
        <input type="password" autoComplete="new-password" required value={dati.password}
          onChange={(e) => cambia('password')(e.target.value)} />
      </label>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <button className="pulsante" type="submit" disabled={invio}>{invio ? 'Creazione…' : 'Crea account'}</button>
    </form>
  )
}
