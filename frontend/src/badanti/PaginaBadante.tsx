// Famiglia: il profilo completo di una badante e "Scrivile".

import { useState, type FormEvent } from 'react'
import { ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import CartaBadante from './CartaBadante'

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
      <Collegamento a="/badanti" className="indietro"><ArrowLeft size={18} /> Tutte le badanti</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && (
        <>
          <div className="scheda"><CartaBadante nome={dati.nome} cognome={dati.cognome} p={dati} /></div>
          {dati.contattoId ? (
            <Collegamento a={`/contatti/${dati.contattoId}`} className="pulsante con-icona"><MessageCircle size={20} /> Apri la conversazione con {dati.nome}</Collegamento>
          ) : (
            <form className="modulo scheda" onSubmit={invia}>
              <label>Scrivi a {dati.nome}
                <textarea rows={4} maxLength={2000} required value={testo} onChange={(e) => setTesto(e.target.value)}
                  placeholder="Presentati: chi assiste, dove, quali giorni e orari, cosa serve." />
              </label>
              {erroreInvio && <p className="errore" role="alert">{erroreInvio}</p>}
              <button className="pulsante con-icona" disabled={invio || !testo.trim()}><MessageCircle size={20} /> {invio ? 'Invio…' : 'Manda il messaggio'}</button>
              <p className="nota senza-margine"><ShieldCheck size={15} className="icona-inline" /> {dati.nome} non vede la tua email né il tuo telefono: vi scrivete qui, e decidete voi se scambiarvi il numero.</p>
            </form>
          )}
        </>
      )}
    </div>
  )
}
