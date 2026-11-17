// "La tua famiglia usa già Unicare?": si entra in un cerchio esistente con il link d'invito
// che manda l'amministratore. Il link è la prova che ti hanno invitato davvero: per questo
// non basta conoscere il nome del cerchio o avere la stessa email.

import { useState, type FormEvent } from 'react'
import { Link2 } from 'lucide-react'
import { naviga } from '../comune/router'
import { t } from '../comune/lingua'

/** Accetta il link intero (anche dentro un messaggio di WhatsApp) o solo il codice. */
function tokenDa(testo: string): string | null {
  const t = testo.trim()
  const dalLink = t.match(/\/invito\/([A-Za-z0-9_-]{20,})/)
  if (dalLink) return dalLink[1]!
  return /^[A-Za-z0-9_-]{20,}$/.test(t) ? t : null
}

export default function EntraConInvito() {
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)

  function entra(e: FormEvent) {
    e.preventDefault()
    const token = tokenDa(testo)
    if (!token) return setErrore(t('Non riconosco il link. Copialo intero dal messaggio che hai ricevuto.'))
    naviga(`/invito/${token}`)
  }

  return (
    <form className="modulo scheda" onSubmit={entra}>
      <strong className="con-icona-piccola"><Link2 size={18} />{' '}{t('La tua famiglia usa già Unicare?')}</strong>
      <p className="nota senza-margine">
        {t('Chiedi a chi ha creato il cerchio di invitarti: in “Invita” scrive la tua email e ti manda un link (per esempio su WhatsApp). Apri il link, oppure incollalo qui.')}
      </p>
      <label>{t('Link d’invito')}
        <input value={testo} onChange={(e) => { setTesto(e.target.value); setErrore(null) }} placeholder="https://…/invito/…" />
      </label>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <button className="pulsante secondario" disabled={!testo.trim()}>{t('Entra nel cerchio')}</button>
    </form>
  )
}
