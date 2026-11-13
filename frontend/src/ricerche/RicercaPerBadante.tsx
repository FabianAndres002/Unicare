// Badante: una famiglia che cerca. Legge cosa serve e si propone con due righe.

import { useState, type FormEvent } from 'react'
import { ArrowLeft, MessageCircle, Send, ShieldCheck, Undo2 } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import CartaRicerca from './CartaRicerca'
import { STATO_PROPOSTA } from './statoProposta'

export default function RicercaPerBadante({ id }: { id: number }) {
  const { dati, errore, ricarica } = useCarica(() => api.ricercaAperta(id), `ricerca-${id}`, 60)
  const { dati: mio } = useCarica(() => api.mioProfiloBadante(), 'mio-profilo', 300)
  const { dati: proposte } = useCarica(() => api.mieProposte(), `mie-proposte-${id}`, 60)
  const [messaggio, setMessaggio] = useState('')
  const [invio, setInvio] = useState(false)
  const [erroreInvio, setErroreInvio] = useState<string | null>(null)
  const mia = dati?.miaProposta
  const contattoId = proposte?.find((p) => p.id === mia?.id)?.contattoId ?? null

  async function esegui(lavoro: () => Promise<unknown>) {
    setInvio(true)
    setErroreInvio(null)
    try {
      await lavoro()
      await ricarica()
    } catch (err) {
      setErroreInvio(messaggioErrore(err))
    }
    setInvio(false)
  }

  function proponi(e: FormEvent) {
    e.preventDefault()
    esegui(() => api.proponiti(id, messaggio))
  }

  return (
    <div className="pagina-app entra">
      <Collegamento a="/lavoro" className="indietro"><ArrowLeft size={18} /> Lavoro</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && (
        <>
          <header className="intestazione-pagina">
            <h1>Una famiglia cerca aiuto</h1>
            <p className="sottotitolo">Il nome della famiglia lo saprai se decidono di scriverti.</p>
          </header>
          <div className="scheda"><CartaRicerca r={dati} /></div>

          {mia && mia.stato !== 'RITIRATA' ? (
            <section className="scheda modulo">
              <div className="titolo-sezione">
                <h2>La tua proposta</h2>
                <span className={`stato ${STATO_PROPOSTA[mia.stato].classe}`}>{STATO_PROPOSTA[mia.stato].testo}</span>
              </div>
              <p className="citazione">{mia.messaggio}</p>
              {mia.stato === 'INVIATA' && (
                <>
                  <p className="nota senza-margine">La famiglia ha ricevuto un avviso. Se ti sceglie, ti scrive e la conversazione la trovi in Messaggi.</p>
                  <button className="pulsante fantasma con-icona" disabled={invio} onClick={() => esegui(() => api.ritiraProposta(mia.id))}>
                    <Undo2 size={18} /> Ritira la proposta
                  </button>
                </>
              )}
              {mia.stato === 'SCELTA' && contattoId && (
                <Collegamento a={`/contatti/${contattoId}`} className="pulsante con-icona"><MessageCircle size={20} /> Apri la conversazione</Collegamento>
              )}
              {mia.stato === 'NON_SCELTA' && <p className="nota senza-margine">Questa volta la famiglia ha scelto diversamente. Grazie lo stesso: ci sono altre famiglie che cercano.</p>}
            </section>
          ) : dati.chiusa ? (
            <p className="nota">Questa famiglia non cerca più.</p>
          ) : mio && !mio.profilo ? (
            <Collegamento a="/lavoro/profilo" className="pulsante con-icona">Compila il profilo per proporti</Collegamento>
          ) : (
            <form className="modulo scheda" onSubmit={proponi}>
              <label>Mi propongo
                <textarea rows={4} maxLength={1000} required minLength={20} value={messaggio} onChange={(e) => setMessaggio(e.target.value)}
                  placeholder="Es. Buongiorno, abito vicino e la mattina sono libera. Ho seguito per 3 anni una signora con difficoltà a camminare." />
              </label>
              <p className="nota senza-margine"><ShieldCheck size={15} className="icona-inline" /> La famiglia vede il tuo messaggio e il tuo profilo (nome, iniziale del cognome, esperienza). Email e telefono no.</p>
              <button className="pulsante con-icona" disabled={invio || messaggio.trim().length < 20}><Send size={18} /> {invio ? 'Invio…' : 'Invia la proposta'}</button>
            </form>
          )}
          {erroreInvio && <p className="errore" role="alert">{erroreInvio}</p>}
        </>
      )}
    </div>
  )
}
