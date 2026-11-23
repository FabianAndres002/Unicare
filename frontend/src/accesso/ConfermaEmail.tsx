// Dopo la registrazione (se le email partono davvero): si entra solo scrivendo il codice
// di 6 numeri arrivato per email. Così nessuno si iscrive con l'email di un altro.

import { useState, type FormEvent } from 'react'
import { api, messaggioErrore, type Profilo } from '../comune/api'
import { t } from '../comune/lingua'
import LayoutAccesso from './LayoutAccesso'
import CampoCodice from './CampoCodice'

type Props = { profilo: Profilo; onConfermato: (p: Profilo) => void; onEsci: () => void }

export default function ConfermaEmail({ profilo, onConfermato, onEsci }: Props) {
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [avviso, setAvviso] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function conferma(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      onConfermato(await api.confermaEmail(codice))
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  async function reinvia() {
    setErrore(null)
    setAvviso(null)
    try {
      await api.reinviaConferma()
      setAvviso(t('Ti abbiamo mandato un codice nuovo.'))
    } catch (err) {
      setErrore(messaggioErrore(err))
    }
  }

  return (
    <LayoutAccesso titolo={t('Controlla la tua email')} sottotitolo={t('Ti abbiamo mandato un codice di 6 numeri a {0}. Scrivilo qui per entrare.', profilo.email)}>
      <form className="modulo" onSubmit={conferma}>
        <CampoCodice valore={codice} onCambia={setCodice} />
        {errore && <p className="errore" role="alert">{errore}</p>}
        {avviso && <p className="avviso-ok" role="status">{avviso}</p>}
        <button className="pulsante" type="submit" disabled={codice.length !== 6 || invio}>{invio ? t('Un momento…') : t('Conferma')}</button>
      </form>
      <p className="cambio">{t('Non è arrivata? Guarda anche nello spam.')}{' '}<button type="button" className="link" onClick={reinvia}>{t('Mandala di nuovo')}</button></p>
      <p className="cambio">{t('Email sbagliata?')}{' '}<button type="button" className="link" onClick={onEsci}>{t('Esci e registrati di nuovo')}</button></p>
    </LayoutAccesso>
  )
}
