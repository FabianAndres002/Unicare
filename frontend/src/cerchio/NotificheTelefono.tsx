// "Notifiche su questo telefono" nel profilo: attiva o spegne le notifiche push.

import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { api } from '../comune/api'
import { attivaNotifiche, SPIEGAZIONE, spegniNotifiche, statoNotifiche, type StatoNotifiche } from '../comune/notifiche'
import { t } from '../comune/lingua'

export default function NotificheTelefono() {
  const [stato, setStato] = useState<StatoNotifiche | null>(null)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const [prova, setProva] = useState<string | null>(null)

  useEffect(() => {
    statoNotifiche().then(async (s) => {
      // Già attive: ricordiamo l'iscrizione al server (link del tunnel nuovo, database nuovo…).
      if (s === 'attive') s = await attivaNotifiche(api.push.iscrivi).catch(() => s)
      setStato(s)
    }, () => setStato('non-supportate'))
  }, [])

  async function mandaProva() {
    setProva(t('Invio…'))
    try {
      const r = await api.push.prova()
      if (r.consegnate > 0) setProva(t('Inviata! Deve arrivare entro pochi secondi, anche con l’app chiusa. Se non arriva, controlla nelle impostazioni del telefono che le notifiche di Unicare (o del browser) siano permesse e che non sia attivo “Non disturbare”.'))
      else if (r.errori.length) setProva(t('Il server non riesce a consegnarla: {0}', r.errori[0]!))
      else setProva(t('Il server non ha nessun telefono iscritto per te. Tocca “Spegni” e poi “Attiva”.'))
    } catch (e) {
      setProva(e instanceof Error ? e.message : String(e))
    }
  }

  async function cambia(attiva: boolean) {
    setInvio(true)
    setErrore(null)
    try {
      if (attiva) setStato(await attivaNotifiche(api.push.iscrivi))
      else {
        await spegniNotifiche()
        setStato('spente')
      }
    } catch {
      setErrore(t('Non sono riuscito ad attivare le notifiche. Riprova.'))
    }
    setInvio(false)
  }

  return (
    <div className="scheda notifiche-riga">
      <span className="funzione-icona verde"><BellRing size={22} /></span>
      <span className="riga-testo">
        <strong>{t('Notifiche su questo telefono')}</strong>
        <span>{stato ? SPIEGAZIONE[stato] : t('Controllo…')}</span>
      </span>
      {stato === 'spente' && <button className="pulsante piccolo" disabled={invio} onClick={() => cambia(true)}>{t('Attiva')}</button>}
      {stato === 'attive' && <button className="pulsante piccolo secondario" disabled={invio} onClick={() => cambia(false)}>{t('Spegni')}</button>}
      {errore && <p className="errore piccolo larga">{errore}</p>}
      {stato === 'attive' && (
        <div className="larga notifiche-prova">
          <button type="button" className="pulsante fantasma piccolo" onClick={mandaProva}>{t('Manda una notifica di prova')}</button>
          {prova && <p className="nota" role="status">{prova}</p>}
        </div>
      )}
    </div>
  )
}
