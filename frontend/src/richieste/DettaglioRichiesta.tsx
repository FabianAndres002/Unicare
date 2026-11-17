// Una richiesta da vicino: cosa serve, a che punto è, i pulsanti per farla avanzare e la sua storia.

import { useState } from 'react'
import { ArrowLeft, Check, CircleCheck, Hand, Plus, Undo2, X } from 'lucide-react'
import { api, messaggioErrore, type AzioneRichiesta, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { useDiretta } from '../comune/diretta'
import { tempoFa } from '../comune/utili'
import { CATEGORIE, STATI } from './aspetto'
import { t } from '../comune/lingua'

const TESTO_EVENTO = {
  CREATA: t('ha chiesto aiuto'),
  PRESA: t('se ne occupa'),
  RILASCIATA: t('non riesce più a occuparsene'),
  COMPLETATA: t('ha segnato “Fatto”'),
  ANNULLATA: t('ha annullato la richiesta'),
}
const ICONA_EVENTO = { CREATA: Plus, PRESA: Hand, RILASCIATA: Undo2, COMPLETATA: Check, ANNULLATA: X }

export default function DettaglioRichiesta({ id, profilo }: { id: number; profilo: Profilo }) {
  const { dati: r, errore, setDati, ricarica } = useCarica(() => api.richiesta(id), id, 20)
  // Se un altro la prende o la chiude mentre la guardi, la pagina si aggiorna (dati null = ci siamo ricollegati).
  useDiretta('/api/diretta', 'richiesta', (dati) => {
    if (!dati || (dati as { id?: number }).id === id) ricarica()
  })
  const [erroreAzione, setErroreAzione] = useState<string | null>(null)
  const [invio, setInvio] = useState<AzioneRichiesta | null>(null)
  const [nota, setNota] = useState('')

  async function esegui(azione: AzioneRichiesta) {
    if (azione === 'ANNULLA' && !confirm(t('Annullare questa richiesta?'))) return
    setErroreAzione(null)
    setInvio(azione)
    try {
      setDati(await api.azioneRichiesta(id, azione, azione === 'COMPLETA' ? nota : undefined))
      setNota('')
    } catch (e) {
      setErroreAzione(messaggioErrore(e))
      setDati(await api.richiesta(id).catch(() => r))
    }
    setInvio(null)
  }

  if (errore && !r) return <div className="pagina-app"><p className="errore">{errore}</p></div>
  if (!r) return <div className="centrato"><span className="rotella" aria-label={t('Caricamento')} /></div>

  const { etichetta, Icona } = CATEGORIE[r.categoria]
  const stato = STATI[r.stato]
  const mia = r.presaDa?.id === profilo.id

  return (
    <div className="pagina-app entra">
      <Collegamento a="/richieste" className="indietro"><ArrowLeft size={18} />{' '}{t('Richieste')}</Collegamento>

      <section className={`scheda dettaglio-richiesta cat-${r.categoria.toLowerCase()}`}>
        <div className="dettaglio-testa">
          <span className="tessera-icona dettaglio-icona"><Icona size={30} /></span>
          <div>
            <span className={`stato ${stato.classe}`}><i className="stato-punto" aria-hidden="true" />{stato.etichetta}</span>
            <h1>{etichetta}</h1>
            <p className="nota">{t('Per {0} · chiesta', r.anziano.nome)}{' '}{tempoFa(r.creataIl)}</p>
          </div>
        </div>
        {r.testo && <p className="dettaglio-testo">{r.testo}</p>}

        {r.stato === 'PRESA_IN_CARICO' && (
          <p className="chi-se-ne-occupa"><Hand size={18} /> {mia ? t('Te ne stai occupando tu') : t('Se ne occupa {0}', r.presaDa?.nome)}</p>
        )}
        {r.stato === 'COMPLETATA' && <p className="chi-se-ne-occupa fatta"><CircleCheck size={18} />{' '}{t('Fatta {0}', tempoFa(r.chiusaIl!))}</p>}

        {erroreAzione && <p className="errore" role="alert">{erroreAzione}</p>}

        {r.azioni.length > 0 && (
          <div className="pila azioni-richiesta">
            {r.azioni.includes('PRENDI') && (
              <button className="pulsante con-icona" onClick={() => esegui('PRENDI')} disabled={!!invio}><Hand size={20} />{' '}{t('Me ne occupo io')}</button>
            )}
            {r.azioni.includes('COMPLETA') && (
              <>
                <input className="campo" placeholder={t('Una nota per gli altri (facoltativa)')} maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
                <button className="pulsante con-icona" onClick={() => esegui('COMPLETA')} disabled={!!invio}><Check size={20} />{' '}{t('Fatto!')}</button>
              </>
            )}
            {r.azioni.includes('RILASCIA') && (
              <button className="pulsante secondario con-icona" onClick={() => esegui('RILASCIA')} disabled={!!invio}><Undo2 size={20} />{' '}{t('Non riesco più, la lascio ad altri')}</button>
            )}
            {r.azioni.includes('ANNULLA') && (
              <button className="pulsante fantasma con-icona" onClick={() => esegui('ANNULLA')} disabled={!!invio}><X size={20} />{' '}{t('Non serve più')}</button>
            )}
          </div>
        )}
      </section>

      <section>
        <div className="titolo-sezione"><h2>{t('Storia')}</h2></div>
        <ol className="storia">
          {r.eventi.map((e, i) => {
            const IconaEvento = ICONA_EVENTO[e.tipo]
            return (
              <li key={i}>
                <span className={`storia-punto evento-${e.tipo.toLowerCase()}`}><IconaEvento size={14} /></span>
                <div>
                  <p><strong>{e.utente ?? r.anziano.nome}</strong> {TESTO_EVENTO[e.tipo]}</p>
                  {e.nota && <p className="storia-nota">“{e.nota}”</p>}
                  <span className="nota">{tempoFa(e.il)}</span>
                </div>
              </li>
            )
          })}
        </ol>
      </section>
    </div>
  )
}
