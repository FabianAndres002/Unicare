// Badante: una famiglia che cerca. Legge cosa serve e si propone con due righe.

import { useState, type FormEvent } from 'react'
import { ArrowLeft, HeartHandshake, MessageCircle, Send, ShieldCheck, Undo2 } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import CartaRicerca from './CartaRicerca'
import { STATO_PROPOSTA } from './statoProposta'
import { t } from '../comune/lingua'

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
      <Collegamento a="/lavoro" className="indietro"><ArrowLeft size={18} />{' '}{t('Lavoro')}</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label={t('Caricamento')} />}
      {dati && (
        <>
          <header className="palco-pagina cat-compagnia">
            <span className="palco-icona"><HeartHandshake size={26} /></span>
            <div className="palco-testi">
              <h1>{t('Una famiglia cerca aiuto')}</h1>
              <p className="sottotitolo">{t('Il nome della famiglia lo saprai se decidono di scriverti.')}</p>
            </div>
          </header>
          <div className="scheda"><CartaRicerca r={dati} /></div>

          {mia && mia.stato !== 'RITIRATA' ? (
            <section className="scheda modulo">
              <div className="titolo-sezione">
                <h2>{t('La tua proposta')}</h2>
                <span className={`stato ${STATO_PROPOSTA[mia.stato].classe}`}>{STATO_PROPOSTA[mia.stato].testo}</span>
              </div>
              <p className="citazione">{mia.messaggio}</p>
              {mia.stato === 'INVIATA' && (
                <>
                  <p className="nota senza-margine">{t('La famiglia ha ricevuto un avviso. Se ti sceglie, ti scrive e la conversazione la trovi in Messaggi.')}</p>
                  <button className="pulsante fantasma con-icona" disabled={invio} onClick={() => esegui(() => api.ritiraProposta(mia.id))}>
                    <Undo2 size={18} />{' '}{t('Ritira la proposta')}
                  </button>
                </>
              )}
              {mia.stato === 'SCELTA' && contattoId && (
                <Collegamento a={`/contatti/${contattoId}`} className="pulsante con-icona"><MessageCircle size={20} />{' '}{t('Apri la conversazione')}</Collegamento>
              )}
              {mia.stato === 'NON_SCELTA' && <p className="nota senza-margine">{t('Questa volta la famiglia ha scelto diversamente. Grazie lo stesso: ci sono altre famiglie che cercano.')}</p>}
            </section>
          ) : dati.chiusa ? (
            <p className="nota">{t('Questa famiglia non cerca più.')}</p>
          ) : mio && !mio.profilo ? (
            <Collegamento a="/lavoro/profilo" className="pulsante con-icona">{t('Compila il profilo per proporti')}</Collegamento>
          ) : (
            <form className="modulo scheda" onSubmit={proponi}>
              <label>{t('Mi propongo')}
                <textarea rows={4} maxLength={1000} required minLength={20} value={messaggio} onChange={(e) => setMessaggio(e.target.value)}
                  placeholder={t('Es. Buongiorno, abito vicino e la mattina sono libera. Ho seguito per 3 anni una signora con difficoltà a camminare.')} />
              </label>
              <p className="nota senza-margine"><ShieldCheck size={15} className="icona-inline" />{' '}{t('La famiglia vede il tuo messaggio e il tuo profilo (nome, iniziale del cognome, esperienza). Email e telefono no.')}</p>
              <button className="pulsante con-icona" disabled={invio || messaggio.trim().length < 20}><Send size={18} /> {invio ? t('Invio…') : t('Invia la proposta')}</button>
            </form>
          )}
          {erroreInvio && <p className="errore" role="alert">{erroreInvio}</p>}
        </>
      )}
    </div>
  )
}
