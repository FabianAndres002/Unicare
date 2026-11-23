// "Password dimenticata?": l'email riceve un codice di 6 numeri, con quello si sceglie
// una password nuova. Gli accessi vecchi sugli altri telefoni si chiudono.

import { useState, type FormEvent } from 'react'
import { api, messaggioErrore, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { t } from '../comune/lingua'
import LayoutAccesso from './LayoutAccesso'
import CampoCodice from './CampoCodice'

export default function PasswordDimenticata({ onEntrato }: { onEntrato: (p: Profilo) => void }) {
  const [email, setEmail] = useState('')
  const [mandato, setMandato] = useState(false)
  const [codice, setCodice] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function chiediCodice(e?: FormEvent) {
    e?.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      await api.passwordDimenticata(email)
      setMandato(true)
    } catch (err) {
      setErrore(messaggioErrore(err))
    }
    setInvio(false)
  }

  async function cambia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      onEntrato(await api.nuovaPassword({ email, codice, password }))
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <LayoutAccesso titolo={t('Password dimenticata?')}
      sottotitolo={mandato
        ? t('Se {0} è registrata su Unicare, ti è arrivato un codice di 6 numeri. Scrivilo qui e scegli la nuova password.', email)
        : t('Scrivi la tua email: ti mandiamo un codice per scegliere una nuova password.')}>
      {!mandato ? (
        <form className="modulo" onSubmit={chiediCodice}>
          <label>
            {t('Email')}
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {errore && <p className="errore" role="alert">{errore}</p>}
          <button className="pulsante" type="submit" disabled={invio}>{invio ? t('Un momento…') : t('Mandami il codice')}</button>
        </form>
      ) : (
        <form className="modulo" onSubmit={cambia}>
          <CampoCodice valore={codice} onCambia={setCodice} />
          <label>
            <span>{t('Nuova password')}{' '}<span className="nota">{t('almeno 8 caratteri')}</span></span>
            <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {errore && <p className="errore" role="alert">{errore}</p>}
          <button className="pulsante" type="submit" disabled={codice.length !== 6 || invio}>{invio ? t('Un momento…') : t('Cambia password ed entra')}</button>
          <p className="cambio">{t('Non è arrivata? Guarda anche nello spam.')}{' '}<button type="button" className="link" onClick={() => chiediCodice()}>{t('Mandala di nuovo')}</button></p>
        </form>
      )}
      <p className="cambio"><Collegamento a="/" className="link">{t('Torna all’accesso')}</Collegamento></p>
    </LayoutAccesso>
  )
}
