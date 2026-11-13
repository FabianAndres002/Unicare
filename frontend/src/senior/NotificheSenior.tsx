// "Vuoi che il telefono suoni per le medicine?": attiva le notifiche sul telefono dell'anziano.

import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { api } from '../comune/api'
import { attivaNotifiche, SPIEGAZIONE, statoNotifiche, type StatoNotifiche } from '../comune/notifiche'

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

  if (!stato || stato === 'attive') return null

  async function attiva() {
    setInvio(true)
    setStato(await attivaNotifiche(api.senior.iscriviPush).catch(() => 'spente' as const))
    setInvio(false)
  }

  return (
    <div className="senior-notifiche">
      <p><BellRing size={22} className="senior-icona-stato" /> <strong>Vuoi che il telefono suoni</strong> per le medicine e quando qualcuno ti risponde?</p>
      {stato === 'spente'
        ? <button className="senior-pulsante" disabled={invio} onClick={attiva}>Sì, attiva le notifiche</button>
        : <p>{SPIEGAZIONE[stato]}</p>}
    </div>
  )
}
