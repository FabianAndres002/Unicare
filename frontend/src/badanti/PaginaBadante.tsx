// Famiglia: il profilo completo di una badante e "Scrivile".

import { useState, type FormEvent } from 'react'
import { ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import CartaBadante from './CartaBadante'
import { t } from '../comune/lingua'

export default function PaginaBadante({ id }: { id: number }) {
  const { dati, errore } = useCarica(() => api.schedaBadante(id), id, 300)
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [erroreInvio, setErroreInvio] = useState<string | null>(null)

  async function invia(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErroreInvio(null)
    try {
      const { contattoId } = await api.scriviABadante(id, testo)
      naviga(`/contatti/${contattoId}`)
    } catch (err) {
      setErroreInvio(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <div className="pagina-app entra">
      <Collegamento a="/badanti" className="indietro"><ArrowLeft size={18} />{' '}{t('Tutte le badanti')}</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label={t('Caricamento')} />}
      {dati && (
        <>
          <div className="scheda"><CartaBadante nome={dati.nome} cognome={dati.cognome} foto={dati.foto} p={dati} /></div>
          {dati.contattoId ? (
            <Collegamento a={`/contatti/${dati.contattoId}`} className="pulsante con-icona"><MessageCircle size={20} />{' '}{t('Apri la conversazione con {0}', dati.nome)}</Collegamento>
          ) : (
            <form className="modulo scheda" onSubmit={invia}>
              <label>{t('Scrivi a {0}', dati.nome)}
                <textarea rows={4} maxLength={2000} required value={testo} onChange={(e) => setTesto(e.target.value)}
                  placeholder={t('Presentati: chi assiste, dove, quali giorni e orari, cosa serve.')} />
              </label>
              {erroreInvio && <p className="errore" role="alert">{erroreInvio}</p>}
              <button className="pulsante con-icona" disabled={invio || !testo.trim()}><MessageCircle size={20} /> {invio ? t('Invio…') : t('Manda il messaggio')}</button>
              <p className="nota senza-margine"><ShieldCheck size={15} className="icona-inline" />{' '}{t('{0} non vede la tua email né il tuo telefono: vi scrivete qui, e decidete voi se scambiarvi il numero.', dati.nome)}</p>
            </form>
          )}
        </>
      )}
    </div>
  )
}
