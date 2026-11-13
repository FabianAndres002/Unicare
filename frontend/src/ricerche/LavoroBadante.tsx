// Badante: le famiglie che cercano una badante nella sua zona, e le sue proposte.

import { useState } from 'react'
import { ChevronRight, Eye, Megaphone, SearchX, UserRound } from 'lucide-react'
import { api, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { PROVINCE } from '../badanti/aspetto'
import CartaRicerca from './CartaRicerca'
import { STATO_PROPOSTA } from './statoProposta'

export default function LavoroBadante({ profilo }: { profilo: Profilo }) {
  const { dati: mio } = useCarica(() => api.mioProfiloBadante(), `mio-profilo-${profilo.id}`, 300)
  const [provincia, setProvincia] = useState('')
  const { dati, errore } = useCarica(() => api.ricercheAperte(provincia || undefined), `ricerche-${provincia}`, 60)
  const { dati: proposte } = useCarica(() => api.mieProposte(), 'mie-proposte', 60)
  const p = mio?.profilo
  const scelta = provincia || dati?.provincia || ''

  return (
    <div className="pagina-app entra">
      <header className="intestazione-pagina">
        <h1>Lavoro</h1>
        <p className="sottotitolo">Famiglie che cercano una badante. Se fa per te, proponiti: la famiglia vede il tuo profilo e decide se scriverti.</p>
      </header>

      {mio && !p && (
        <Collegamento a="/lavoro/profilo" className="scheda-proponiti">
          <Megaphone size={30} />
          <span><strong>Prima compila il tuo profilo</strong><br />Le famiglie lo vedono insieme alla tua proposta. Bastano 3 minuti.</span>
          <ChevronRight size={22} />
        </Collegamento>
      )}
      {p && (
        <Collegamento a="/lavoro/profilo" className="scheda riga-cerchio">
          <span className={`funzione-icona ${p.visibile ? 'verde' : 'grigio'}`}>{p.visibile ? <Eye size={22} /> : <UserRound size={22} />}</span>
          <span className="riga-testo testo-a-capo">
            <strong>Il mio profilo</strong>
            <span>{p.visibile ? 'Ti proponi anche nella lista delle badanti' : 'Non sei nella lista delle badanti: le famiglie ti vedono solo quando ti proponi'}</span>
          </span>
          <ChevronRight size={20} />
        </Collegamento>
      )}

      {proposte && proposte.length > 0 && (
        <section>
          <div className="titolo-sezione"><h2>Le mie proposte</h2></div>
          <ul className="elenco scheda">
            {proposte.slice(0, 5).map((x) => (
              <li key={x.id}>
                <Collegamento a={x.contattoId ? `/contatti/${x.contattoId}` : `/lavoro/ricerche/${x.ricerca.id}`} className="riga-scelta">
                  <span className="riga-testo">
                    <strong>{x.ricerca.comune}</strong>
                    <span>{x.ricerca.orario ?? x.ricerca.descrizione}</span>
                  </span>
                  <span className={`stato ${STATO_PROPOSTA[x.stato].classe}`}>{STATO_PROPOSTA[x.stato].testo}</span>
                </Collegamento>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="titolo-sezione"><h2>Famiglie che cercano</h2></div>
        <select className="campo" value={scelta} onChange={(e) => setProvincia(e.target.value)} aria-label="Provincia">
          {!scelta && <option value="">Scegli la provincia…</option>}
          {PROVINCE.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
        </select>
        {errore && <p className="errore">{errore}</p>}
        {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
        {dati && dati.ricerche.length === 0 && (
          <div className="scheda vuoto"><SearchX size={28} /><p>In questo momento nessuna famiglia cerca in questa provincia. Ti avvisiamo noi appena qualcuno pubblica.</p></div>
        )}
        <div className="pila-appuntamenti">
          {dati?.ricerche.map((r) => (
            <Collegamento key={r.id} a={`/lavoro/ricerche/${r.id}`} className="scheda carta-link">
              <CartaRicerca r={r} breve />
              {r.miaProposta
                ? <span className={`stato ${STATO_PROPOSTA[r.miaProposta.stato].classe}`}>La tua proposta: {STATO_PROPOSTA[r.miaProposta.stato].testo.toLowerCase()}</span>
                : <span className="link-sezione">Leggi e proponiti <ChevronRight size={16} className="icona-inline" /></span>}
            </Collegamento>
          ))}
        </div>
      </section>
    </div>
  )
}
