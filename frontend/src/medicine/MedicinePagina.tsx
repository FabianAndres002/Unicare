// Medicine dell'anziano (schermate P1-P2): cosa è successo oggi e i promemoria.
// Ogni promemoria: momento della giornata, orario e i nomi delle medicine da prendere.
// Nello stesso momento ce ne possono essere più d'uno (per esempio 8:00 e 10:30).
// Familiari e amministratore li impostano; la badante li vede soltanto.

import { useState, type FormEvent } from 'react'
import { ArrowLeft, BellRing, Check, Clock, Pencil, Pill, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { api, messaggioErrore, type Anziano, type MedicineAnziano, type Momento, type Promemoria } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { MOMENTI, ORDINE_MOMENTI, oraBreve, statoMedicina } from './aspetto'

type Props = { anziano: Anziano }

/** Orario e nomi delle medicine, per un promemoria nuovo o da modificare. */
function ModuloPromemoria(props: {
  momento: Momento
  iniziale?: Promemoria
  disabilitato?: boolean
  onSalva: (ora: string, medicine: string[]) => Promise<void>
  onAnnulla: () => void
}) {
  const { etichetta, oraPredefinita } = MOMENTI[props.momento]
  const [ora, setOra] = useState(props.iniziale?.ora ?? oraPredefinita)
  const [medicine, setMedicine] = useState<string[]>(props.iniziale?.medicine.length ? props.iniziale.medicine : [''])
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function salva(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      await props.onSalva(ora, medicine.map((m) => m.trim()).filter(Boolean))
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo modulo-promemoria" onSubmit={salva}>
      <label>Orario
        <input type="time" className="campo campo-ora" required value={ora} onChange={(e) => setOra(e.target.value)} aria-label={`Orario ${etichetta.toLowerCase()}`} />
      </label>
      <fieldset className="elenco-medicine">
        <legend>Quali medicine</legend>
        {medicine.map((m, i) => (
          <div key={i} className="riga-medicina">
            <input value={m} maxLength={80} aria-label={`Medicina ${i + 1}`} placeholder={i === 0 ? 'Es. Cardioaspirina 100 mg' : 'Un’altra medicina'}
              onChange={(e) => setMedicine(medicine.map((x, j) => (j === i ? e.target.value : x)))} />
            {medicine.length > 1 && (
              <button type="button" className="pulsante-icona tenue" aria-label={`Togli la medicina ${i + 1}`}
                onClick={() => setMedicine(medicine.filter((_, j) => j !== i))}><X size={18} /></button>
            )}
          </div>
        ))}
        {medicine.length < 10 && (
          <button type="button" className="pulsante fantasma con-icona" onClick={() => setMedicine([...medicine, ''])}>
            <Plus size={18} /> Aggiungi un’altra medicina
          </button>
        )}
      </fieldset>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <div className="riga-pulsanti">
        <button type="button" className="pulsante fantasma" onClick={props.onAnnulla}>Annulla</button>
        <button className="pulsante" disabled={invio || props.disabilitato || !ora}>{invio ? 'Salvo…' : 'Salva'}</button>
      </div>
    </form>
  )
}

function SchedaPromemoria(props: { p: Promemoria; puoModificare: boolean; onCambiato: () => void }) {
  const { p } = props
  const [modifica, setModifica] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function esegui(lavoro: () => Promise<unknown>) {
    setInvio(true)
    setErrore(null)
    try {
      await lavoro()
      props.onCambiato()
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setInvio(false)
  }

  if (modifica) {
    return (
      <div className="scheda">
        <ModuloPromemoria momento={p.momento} iniziale={p} onAnnulla={() => setModifica(false)}
          onSalva={async (ora, medicine) => {
            await api.modificaPromemoria(p.id, { ...(ora !== p.ora ? { ora } : {}), medicine })
            setModifica(false)
            props.onCambiato()
          }} />
      </div>
    )
  }

  return (
    <div className={`scheda promemoria-scheda ${p.attivo ? '' : 'spento'}`}>
      <div className="promemoria-alto">
        <strong className="promemoria-ora"><Clock size={18} /> {p.ora}</strong>
        {props.puoModificare && (
          <div className="promemoria-comandi">
            <input type="checkbox" role="switch" className="interruttore" aria-label={`Promemoria delle ${p.ora} acceso`} checked={p.attivo}
              disabled={invio} onChange={(e) => esegui(() => api.modificaPromemoria(p.id, { attivo: e.target.checked }))} />
            <button className="pulsante-icona tenue" aria-label={`Modifica il promemoria delle ${p.ora}`} onClick={() => setModifica(true)}><Pencil size={18} /></button>
            <button className="pulsante-icona tenue" aria-label={`Togli il promemoria delle ${p.ora}`} disabled={invio}
              onClick={() => esegui(() => api.eliminaPromemoria(p.id))}><Trash2 size={18} /></button>
          </div>
        )}
      </div>
      {p.medicine.length > 0
        ? <ul className="nomi-medicine">{p.medicine.map((m) => <li key={m}><Pill size={15} /> {m}</li>)}</ul>
        : <p className="nota senza-margine">Nessun nome: compare solo “{MOMENTI[p.momento].titolo}”.</p>}
      {!p.attivo && <span className="stato stato-annullata">Spento</span>}
      {errore && <p className="errore piccolo">{errore}</p>}
    </div>
  )
}

function SezioneMomento({ momento, dati, anzianoId, serveConsenso, consenso, onCambiato }: {
  momento: Momento; dati: MedicineAnziano; anzianoId: number; serveConsenso: boolean; consenso: boolean; onCambiato: () => void
}) {
  const { etichetta, titolo, Icona, colore } = MOMENTI[momento]
  const [nuovo, setNuovo] = useState(false)
  const lista = dati.promemoria.filter((p) => p.momento === momento)
  return (
    <section className="momento-medicine">
      <div className="titolo-momento">
        <span className={`funzione-icona ${colore}`}><Icona size={20} /></span>
        <h3>{etichetta}</h3>
      </div>
      {lista.length === 0 && !nuovo && <p className="nota senza-margine">Nessuna medicina.</p>}
      {lista.map((p) => <SchedaPromemoria key={p.id} p={p} puoModificare={dati.puoModificare} onCambiato={onCambiato} />)}
      {dati.puoModificare && (nuovo ? (
        <div className="scheda">
          <ModuloPromemoria momento={momento} disabilitato={serveConsenso && !consenso} onAnnulla={() => setNuovo(false)}
            onSalva={async (ora, medicine) => {
              await api.creaPromemoria(anzianoId, momento, ora, medicine, serveConsenso ? true : undefined)
              setNuovo(false)
              onCambiato()
            }} />
          {serveConsenso && !consenso && <p className="nota senza-margine">Prima spunta il consenso qui sopra.</p>}
        </div>
      ) : (
        <button className="pulsante secondario con-icona" onClick={() => setNuovo(true)}>
          <Plus size={18} /> {lista.length ? 'Aggiungi un altro orario' : `Aggiungi ${titolo.toLowerCase()}`}
        </button>
      ))}
    </section>
  )
}

export default function MedicinePagina({ anziano }: Props) {
  const { dati, errore, ricarica } = useCarica(() => api.medicine(anziano.id), anziano.id)
  const [consenso, setConsenso] = useState(false)

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="palco-pagina cat-farmacia">
        <span className="palco-icona"><Pill size={26} /></span>
        <div className="palco-testi">
          <h1>Medicine di {anziano.nome}</h1>
          <p className="sottotitolo">All’orario il telefono di {anziano.nome} suona e chiede “Fatto”. Se dopo un’ora non risponde, avvisiamo i familiari.</p>
        </div>
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
                      <span className="riga-testo">
                        <strong>{oraBreve(o.previstoIl)} · {titolo}</strong>
                        <span>{o.medicine.length ? o.medicine.join(', ') : 'Senza nomi'}</span>
                      </span>
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
                  <strong>{anziano.nome} è d’accordo</strong> a ricevere i promemoria, che salviamo i nomi delle sue medicine
                  e che la famiglia veda quando conferma di averle prese. Lo chiediamo una volta sola e lo registriamo con la data.
                </span>
              </label>
            )}
            {ORDINE_MOMENTI.map((m) => (
              <SezioneMomento key={m} momento={m} dati={dati} anzianoId={anziano.id} serveConsenso={!dati.consenso} consenso={consenso} onCambiato={ricarica} />
            ))}
            <p className="nota">
              <BellRing size={16} className="icona-inline" />
              I nomi delle medicine si vedono solo dentro Unicare. Nella notifica, che compare anche a telefono bloccato,
              c’è solo “Medicine del mattino”, “del pranzo” o “della sera”.
            </p>
          </section>
        </>
      )}
    </div>
  )
}
