// S1: il primo avvio sul telefono dell'anziano. Si scrive il codice di 6 cifre
// che un familiare ha generato dalla scheda dell'anziano. Con "aggiungi" serve a mettere
// un'altra persona sullo stesso telefono (due nonni, un telefono).

import { useState, type FormEvent } from 'react'
import { api, messaggioErrore } from '../comune/api'
import { t } from '../comune/lingua'
import ScegliLingua from '../comune/ScegliLingua'
import { Collegamento } from '../comune/router'

type Props = { onCollegato: (anzianoId: number) => void; aggiungi?: boolean }

export default function CodiceSenior({ onCollegato, aggiungi = false }: Props) {
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      const { anzianoId } = await api.senior.collega(codice)
      onCollegato(anzianoId)
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="senior-pagina entra" onSubmit={invia}>
      {!aggiungi && <ScegliLingua grande className="senior-lingua-alto" />}
      <img src="/icone/icona-192.png" alt="" width={72} height={72} className="senior-logo" />
      <h1>{aggiungi ? t('Un’altra persona su questo telefono') : t('Benvenuto in Unicare')}</h1>
      <p className="senior-testo">
        {aggiungi
          ? t('Scrivi il codice di 6 numeri della seconda persona: la famiglia lo trova nella sua scheda, alla voce “Collega il telefono”.')
          : t('Scrivi il codice di 6 numeri che ti ha dato la tua famiglia.')}
      </p>
      <label className="sr-only" htmlFor="codice">{t('Codice')}</label>
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
        {invio ? t('Un momento…') : t('Entra')}
      </button>
      {aggiungi
        ? <Collegamento a="/senior" className="senior-pulsante chiaro">{t('Annulla')}</Collegamento>
        : <p className="senior-nota">{t('Non hai il codice? Chiedilo a un familiare: lo trova nella tua scheda, alla voce “Collega il telefono”.')}</p>}
    </form>
  )
}
