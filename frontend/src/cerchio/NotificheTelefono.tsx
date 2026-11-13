// "Notifiche su questo telefono" nel profilo: attiva o spegne le notifiche push.

import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { api } from '../comune/api'
import { attivaNotifiche, SPIEGAZIONE, spegniNotifiche, statoNotifiche, type StatoNotifiche } from '../comune/notifiche'

export default function NotificheTelefono() {
  const [stato, setStato] = useState<StatoNotifiche | null>(null)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    statoNotifiche().then(setStato, () => setStato('non-supportate'))
  }, [])

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
      setErrore('Non sono riuscito ad attivare le notifiche. Riprova.')
    }
    setInvio(false)
  }

  return (
    <div className="scheda notifiche-riga">
      <span className="funzione-icona verde"><BellRing size={22} /></span>
      <span className="riga-testo">
        <strong>Notifiche su questo telefono</strong>
        <span>{stato ? SPIEGAZIONE[stato] : 'Controllo…'}</span>
      </span>
      {stato === 'spente' && <button className="pulsante piccolo" disabled={invio} onClick={() => cambia(true)}>Attiva</button>}
      {stato === 'attive' && <button className="pulsante piccolo secondario" disabled={invio} onClick={() => cambia(false)}>Spegni</button>}
      {errore && <p className="errore piccolo larga">{errore}</p>}
    </div>
  )
}
