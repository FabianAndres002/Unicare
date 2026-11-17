// "Vuoi che il telefono suoni per le medicine?": attiva le notifiche sul telefono dell'anziano.

import { useEffect, useState } from 'react'
import { BellRing, Volume2 } from 'lucide-react'
import { api } from '../comune/api'
import { suonaCampanello } from '../comune/campanello'
import { attivaNotifiche, SPIEGAZIONE, statoNotifiche, type StatoNotifiche } from '../comune/notifiche'
import { t } from '../comune/lingua'

export default function NotificheSenior() {
  const [stato, setStato] = useState<StatoNotifiche | null>(null)
  const [invio, setInvio] = useState(false)

  useEffect(() => {
    statoNotifiche().then(
      async (s) => {
        // Già attive in questo browser: ci assicuriamo che il server le colleghi a questo telefono.
        if (s === 'attive') await attivaNotifiche(api.senior.iscriviPush).catch(() => {})
        setStato(s)
      },
      () => setStato('non-supportate'),
    )
  }, [])

  if (!stato) return null
  // Notifiche attive: si può provare il campanello (e alzare il volume se serve).
  if (stato === 'attive') {
    return (
      <button type="button" className="senior-prova-suono" onClick={() => void suonaCampanello()}>
        <Volume2 size={22} />{' '}{t('Prova il suono delle medicine')}
      </button>
    )
  }

  async function attiva() {
    setInvio(true)
    setStato(await attivaNotifiche(api.senior.iscriviPush).catch(() => 'spente' as const))
    setInvio(false)
  }

  return (
    <div className="senior-notifiche">
      <p><BellRing size={22} className="senior-icona-stato" /> <strong>{t('Vuoi che il telefono suoni')}</strong>{' '}{t('per le medicine e quando qualcuno ti risponde?')}</p>
      {stato === 'spente'
        ? <button className="senior-pulsante" disabled={invio} onClick={attiva}>{t('Sì, attiva le notifiche')}</button>
        : <p>{SPIEGAZIONE[stato]}</p>}
    </div>
  )
}
