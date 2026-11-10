import { useState, type FormEvent } from 'react'
import { api, messaggioErrore, type Profilo } from '../comune/api'

type Props = { onEntrato: (profilo: Profilo) => void; emailIniziale?: string }

export default function ModuloAccedi({ onEntrato, emailIniziale = '' }: Props) {
  const [email, setEmail] = useState(emailIniziale)
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
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo" onSubmit={invia}>
      <label>
        Email
        <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label>
        Password
        <input type="password" autoComplete="current-password" required value={password}
          onChange={(e) => setPassword(e.target.value)} />
      </label>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <button className="pulsante" type="submit" disabled={invio}>{invio ? 'Accesso…' : 'Accedi'}</button>
    </form>
  )
}
