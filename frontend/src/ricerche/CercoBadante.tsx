// Famiglia: "Cerco una badante". Scrive cosa serve; le badanti della zona si propongono.

import { useState, type FormEvent } from 'react'
import { ArrowLeft, ChevronRight, Megaphone, Plus, Search } from 'lucide-react'
import { api, messaggioErrore, type Cerchio, type DatiRicerca, type Disponibilita, type Servizio } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { DISPONIBILITA, PROVINCE, SERVIZI } from '../badanti/aspetto'
import CartaRicerca from './CartaRicerca'

const VUOTA: DatiRicerca = { provincia: '', comune: '', descrizione: '', orario: '', servizi: [], disponibilita: [] }

function NuovaRicerca({ cerchioId, onAnnulla }: { cerchioId: number; onAnnulla?: () => void }) {
  const [d, setD] = useState(VUOTA)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const cambia = <K extends keyof DatiRicerca>(k: K, v: DatiRicerca[K]) => setD({ ...d, [k]: v })
  const alterna = <T extends string>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

  async function pubblica(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      const { id } = await api.pubblicaRicerca(cerchioId, d)
      naviga(`/cerco-badante/${id}`)
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo" onSubmit={pubblica}>
      <div className="scheda modulo">
        <div className="due-colonne">
          <label>Provincia
            <select className="campo" value={d.provincia} onChange={(e) => cambia('provincia', e.target.value)} required>
              <option value="">Scegli…</option>
              {PROVINCE.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
            </select>
          </label>
          <label>Comune<input value={d.comune} onChange={(e) => cambia('comune', e.target.value)} required minLength={2} maxLength={80} placeholder="Es. Caserta" /></label>
        </div>
        <label>Di cosa avete bisogno
          <textarea rows={4} maxLength={1000} required minLength={20} value={d.descrizione} onChange={(e) => cambia('descrizione', e.target.value)}
            placeholder="Es. Mia madre ha 82 anni e vive da sola. Cerchiamo qualcuno che le faccia compagnia, prepari il pranzo e la accompagni a fare la spesa." />
        </label>
        <label><span>Giorni e orari <span className="nota">facoltativo</span></span>
          <input value={d.orario} onChange={(e) => cambia('orario', e.target.value)} maxLength={120} placeholder="Es. dal lunedì al venerdì, 9-13" />
        </label>
      </div>

      <fieldset className="scheda scelte-multiple">
        <legend>Che tipo di presenza</legend>
        {(Object.keys(DISPONIBILITA) as Disponibilita[]).map((k) => (
          <label key={k} className={d.disponibilita.includes(k) ? 'attiva' : ''}>
            <input type="checkbox" className="sr-only" checked={d.disponibilita.includes(k)} onChange={() => cambia('disponibilita', alterna(d.disponibilita, k))} />
            {DISPONIBILITA[k]}
          </label>
        ))}
      </fieldset>

      <fieldset className="scheda scelte-multiple">
        <legend>Cosa serve</legend>
        {(Object.keys(SERVIZI) as Servizio[]).map((k) => (
          <label key={k} className={d.servizi.includes(k) ? 'attiva' : ''}>
            <input type="checkbox" className="sr-only" checked={d.servizi.includes(k)} onChange={() => cambia('servizi', alterna(d.servizi, k))} />
            {SERVIZI[k]}
          </label>
        ))}
      </fieldset>

      <p className="nota senza-margine">Le badanti vedono comune, orari e quello che scrivi qui. Non vedono il vostro nome né quello di chi assistete: lo scoprono solo se decidete di scrivere a una di loro.</p>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <button className="pulsante con-icona" disabled={invio}><Megaphone size={20} /> {invio ? 'Pubblico…' : 'Pubblica la ricerca'}</button>
      {onAnnulla && <button type="button" className="pulsante fantasma" onClick={onAnnulla}>Annulla</button>}
    </form>
  )
}

export default function CercoBadante({ cerchio }: { cerchio: Cerchio }) {
  const { dati, errore } = useCarica(() => api.ricercheBadante(cerchio.id), `ricerche-${cerchio.id}`, 60)
  const [nuova, setNuova] = useState(false)
  const aperte = dati?.filter((r) => !r.chiusa) ?? []
  const chiuse = dati?.filter((r) => r.chiusa) ?? []
  const mostraModulo = nuova || (dati !== null && dati.length === 0)

  return (
    <div className="pagina-app entra">
      <Collegamento a="/badanti" className="indietro"><ArrowLeft size={18} /> Trova una badante</Collegamento>
      <header className="intestazione-pagina">
        <h1>Cerco una badante</h1>
        <p className="sottotitolo">Scrivi di cosa avete bisogno: le badanti della zona lo leggono e si propongono. Poi scegli tu a chi rispondere.</p>
      </header>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}

      {aperte.length > 0 && (
        <section>
          <div className="titolo-sezione"><h2>Le vostre ricerche</h2></div>
          <div className="pila-appuntamenti">
            {aperte.map((r) => (
              <Collegamento key={r.id} a={`/cerco-badante/${r.id}`} className="scheda carta-link">
                <CartaRicerca r={r} breve />
                <span className="riga-proposte">
                  {r.nuove > 0
                    ? <span className="distintivo urgente">{r.nuove === 1 ? '1 proposta nuova' : `${r.nuove} proposte nuove`}</span>
                    : <span className="nota senza-margine">{r.proposte === 0 ? 'Ancora nessuna proposta' : `${r.proposte} ${r.proposte === 1 ? 'proposta' : 'proposte'}`}</span>}
                  <ChevronRight size={20} />
                </span>
              </Collegamento>
            ))}
          </div>
        </section>
      )}

      {dati && (mostraModulo ? (
        <section>
          <div className="titolo-sezione"><h2><Search size={18} className="icona-inline" /> Nuova ricerca</h2></div>
          <NuovaRicerca cerchioId={cerchio.id} onAnnulla={dati.length > 0 ? () => setNuova(false) : undefined} />
        </section>
      ) : (
        <button className="pulsante secondario con-icona" onClick={() => setNuova(true)}><Plus size={20} /> Pubblica un’altra ricerca</button>
      ))}

      {chiuse.length > 0 && (
        <section>
          <div className="titolo-sezione"><h2>Chiuse</h2></div>
          <ul className="elenco scheda">
            {chiuse.map((r) => (
              <li key={r.id}>
                <Collegamento a={`/cerco-badante/${r.id}`} className="riga-scelta">
                  <span className="riga-testo"><strong>{r.comune}</strong><span>{r.proposte} {r.proposte === 1 ? 'proposta' : 'proposte'}</span></span>
                  <ChevronRight size={18} />
                </Collegamento>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
