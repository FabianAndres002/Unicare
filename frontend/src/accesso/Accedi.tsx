import { useState, type FormEvent } from 'react'
import { api, ErroreApi, type Profilo } from '../comune/api'
import Intestazione from './Intestazione'

type Props = {
  onEntrato: (profilo: Profilo) => void
  onVaiARegistrati: () => void
}

export default function Accedi({ onEntrato, onVaiARegistrati }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      onEntrato(await api.login(email, password))
    } catch (err) {
      setErrore(err instanceof ErroreApi ? err.message : 'Connessione non riuscita. Riprova.')
    } finally {
      setInvio(false)
    }
  }

  return (
    <main className="pagina">
      <Intestazione sottotitolo="Bentornato" />
      <form className="scheda modulo" onSubmit={invia}>
        <label>
          Email
          <input type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {errore && <p className="errore" role="alert">{errore}</p>}
        <button className="pulsante" type="submit" disabled={invio}>
          {invio ? 'Accesso…' : 'Accedi'}
        </button>
      </form>
      <p className="cambio">
        Non hai un account?{' '}
        <button className="link" type="button" onClick={onVaiARegistrati}>Registrati</button>
      </p>
    </main>
  )
}
