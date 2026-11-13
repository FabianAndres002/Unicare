// S1: il primo avvio sul telefono dell'anziano. Si scrive il codice di 6 cifre
// che un familiare ha generato dalla scheda dell'anziano.

import { useState, type FormEvent } from 'react'
import { api, messaggioErrore } from '../comune/api'

type Props = { onCollegato: () => void }

export default function CodiceSenior({ onCollegato }: Props) {
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      await api.senior.collega(codice)
      onCollegato()
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="senior-pagina entra" onSubmit={invia}>
      <img src="/icone/icona-192.png" alt="" width={72} height={72} className="senior-logo" />
      <h1>Benvenuto in Unicare</h1>
      <p className="senior-testo">Scrivi il codice di 6 numeri che ti ha dato la tua famiglia.</p>
      <label className="sr-only" htmlFor="codice">Codice</label>
      <input
        id="codice"
        className="senior-codice"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="000000"
        value={codice}
        onChange={(e) => setCodice(e.target.value.replace(/\D/g, '').slice(0, 6))}
        autoFocus
      />
      {errore && <p className="senior-errore" role="alert">{errore}</p>}
      <button className="senior-pulsante" type="submit" disabled={codice.length !== 6 || invio}>
        {invio ? 'Un momento…' : 'Entra'}
      </button>
      <p className="senior-nota">Non hai il codice? Chiedilo a un familiare: lo trova nella tua scheda, alla voce “Collega il telefono”.</p>
    </form>
  )
}
