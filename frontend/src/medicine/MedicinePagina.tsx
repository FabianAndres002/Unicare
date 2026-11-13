// Medicine dell'anziano (schermate P1-P2): cosa è successo oggi e i promemoria.
// Familiari e amministratore li impostano; la badante li vede soltanto.

import { useState } from 'react'
import { ArrowLeft, BellRing, Check, Clock, ShieldCheck, Trash2 } from 'lucide-react'
import { api, messaggioErrore, type Anziano, type MedicineAnziano, type Momento, type Promemoria } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { MOMENTI, ORDINE_MOMENTI, oraBreve, statoMedicina } from './aspetto'

type Props = { anziano: Anziano }

function RigaPromemoria(props: {
  momento: Momento
  promemoria: Promemoria | undefined
  puoModificare: boolean
  serveConsenso: boolean
  consenso: boolean
  anzianoId: number
  onCambiato: (nuovi?: MedicineAnziano) => void
}) {
  const { momento, promemoria: p, puoModificare } = props
  const { etichetta, titolo, oraPredefinita, Icona, colore } = MOMENTI[momento]
  const [ora, setOra] = useState(p?.ora ?? oraPredefinita)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function esegui(lavoro: () => Promise<MedicineAnziano | void>) {
    setInvio(true)
    setErrore(null)
    try {
      props.onCambiato((await lavoro()) ?? undefined)
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setInvio(false)
  }

  return (
    <div className={`scheda promemoria-riga ${p && !p.attivo ? 'spento' : ''}`}>
      <span className={`funzione-icona ${colore}`}><Icona size={22} /></span>
      <span className="riga-testo">
        <strong>{etichetta}</strong>
        <span>{p ? (p.attivo ? `“${titolo}” alle ${p.ora}` : 'Spento') : 'Nessun promemoria'}</span>
      </span>
      {puoModificare && (
        <div className="promemoria-comandi">
          <input
            type="time"
            className="campo campo-ora"
            aria-label={`Orario ${etichetta.toLowerCase()}`}
            value={ora}
            onChange={(e) => setOra(e.target.value)}
            onBlur={() => p && ora && ora !== p.ora && esegui(() => api.modificaPromemoria(p.id, { ora }))}
          />
          {p ? (
            <>
              <input type="checkbox" role="switch" className="interruttore" aria-label={`${etichetta} acceso`} checked={p.attivo}
                disabled={invio} onChange={(e) => esegui(() => api.modificaPromemoria(p.id, { attivo: e.target.checked }))} />
              <button className="pulsante-icona tenue" aria-label={`Togli il promemoria del ${etichetta.toLowerCase()}`} disabled={invio}
                onClick={() => esegui(() => api.eliminaPromemoria(p.id))}>
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <button className="pulsante piccolo" disabled={invio || !ora || (props.serveConsenso && !props.consenso)}
              onClick={() => esegui(() => api.creaPromemoria(props.anzianoId, momento, ora, props.serveConsenso ? true : undefined))}>
              Aggiungi
            </button>
          )}
        </div>
      )}
      {errore && <p className="errore piccolo larga">{errore}</p>}
    </div>
  )
}

export default function MedicinePagina({ anziano }: Props) {
  const { dati, errore, ricarica, setDati } = useCarica(() => api.medicine(anziano.id), anziano.id)
  const [consenso, setConsenso] = useState(false)

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="intestazione-pagina">
        <h1>Medicine di {anziano.nome}</h1>
        <p className="sottotitolo">All’orario il telefono di {anziano.nome} suona e chiede “Fatto”. Se dopo un’ora non risponde, avvisiamo i familiari.</p>
      </header>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}

      {dati && (
        <>
          <section>
            <div className="titolo-sezione"><h2>Oggi</h2></div>
            {dati.oggi.length === 0 ? (
              <div className="scheda vuoto"><Clock size={28} /><p>Nessuna medicina in programma oggi.</p></div>
            ) : (
              <ul className="elenco scheda">
                {dati.oggi.map((o) => {
                  const { titolo, Icona, colore } = MOMENTI[o.momento]
                  const s = statoMedicina(o)
                  return (
                    <li key={o.id}>
                      <span className={`funzione-icona ${colore}`}><Icona size={20} /></span>
                      <span className="riga-testo"><strong>{titolo}</strong><span>Previste alle {oraBreve(o.previstoIl)}</span></span>
                      <span className={`stato ${s.classe}`}>{o.stato === 'FATTO' && <Check size={12} />} {s.testo}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <div className="titolo-sezione"><h2>Promemoria</h2></div>
            {dati.puoModificare && !dati.consenso && (
              <label className="consenso-medicine">
                <input type="checkbox" checked={consenso} onChange={(e) => setConsenso(e.target.checked)} />
                <span>
                  <ShieldCheck size={18} className="icona-inline" />
                  <strong>{anziano.nome} è d’accordo</strong> a ricevere i promemoria e che la famiglia veda quando conferma di aver preso le medicine.
                  Lo chiediamo una volta sola e lo registriamo con la data.
                </span>
              </label>
            )}
            {ORDINE_MOMENTI.map((m) => {
              const p = dati.promemoria.find((x) => x.momento === m)
              return (
                <RigaPromemoria key={`${m}-${p?.id ?? 'nuovo'}`} momento={m} promemoria={p} anzianoId={anziano.id}
                  puoModificare={dati.puoModificare} serveConsenso={!dati.consenso} consenso={consenso}
                  onCambiato={(nuovi) => (nuovi ? setDati(nuovi) : ricarica())} />
              )
            })}
            <p className="nota">
              <BellRing size={16} className="icona-inline" />
              Il nome delle medicine non si scrive: nelle notifiche compare solo “Medicine del mattino”, “del pranzo” o “della sera”.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
