// Calendario degli appuntamenti dell'anziano (lato famiglia).
// Familiari e amministratore aggiungono e cambiano; tutti possono dire "Ci vado io".

import { useState, type FormEvent } from 'react'
import { ArrowLeft, BellRing, CalendarDays, CalendarPlus, Car, MapPin, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { api, messaggioErrore, type Anziano, type AppuntamentoFamiglia, type CalendarioAnziano, type DatiAppuntamento } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { foglietto, giornoInParole, giornoIso, oraAppuntamento } from './aspetto'

function Modulo(props: { iniziale?: AppuntamentoFamiglia; onSalva: (d: DatiAppuntamento) => Promise<void>; onAnnulla: () => void }) {
  const i = props.iniziale
  const [oggi] = useState(() => giornoIso(new Date()))
  const [dati, setDati] = useState<DatiAppuntamento>(() => ({
    titolo: i?.titolo ?? '',
    data: i ? giornoIso(i.quando) : giornoIso(new Date(Date.now() + 86_400_000)),
    ora: i ? oraAppuntamento(i.quando) : '10:00',
    luogo: i?.luogo ?? '',
    note: i?.note ?? '',
  }))
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const campo = (k: keyof DatiAppuntamento) => ({ value: dati[k], onChange: (e: { target: { value: string } }) => setDati({ ...dati, [k]: e.target.value }) })

  async function invia(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      await props.onSalva(dati)
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  return (
    <form className="modulo scheda entra" onSubmit={invia}>
      <label>Che appuntamento è?
        <input {...campo('titolo')} placeholder="Es. Visita dal cardiologo" required minLength={2} maxLength={120} autoFocus={!i} />
      </label>
      <div className="due-colonne">
        <label>Giorno<input type="date" {...campo('data')} min={i ? undefined : oggi} required /></label>
        <label>Ora<input type="time" {...campo('ora')} required /></label>
      </div>
      <label><span>Dove <span className="nota">facoltativo</span></span>
        <input {...campo('luogo')} placeholder="Es. Ospedale San Paolo, 2° piano" maxLength={200} />
      </label>
      <label><span>Note <span className="nota">facoltative</span></span>
        <textarea {...campo('note')} rows={2} placeholder="Es. Portare le analisi, a digiuno" maxLength={500} />
      </label>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <div className="riga-pulsanti">
        <button type="button" className="pulsante fantasma" onClick={props.onAnnulla}>Annulla</button>
        <button className="pulsante" disabled={invio}>{invio ? 'Salvo…' : i ? 'Salva' : 'Aggiungi'}</button>
      </div>
    </form>
  )
}

function SchedaAppuntamento(props: { a: AppuntamentoFamiglia; puoModificare: boolean; passato?: boolean; onCambiato: () => void }) {
  const { a } = props
  const [modifica, setModifica] = useState(false)
  const [conferma, setConferma] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)
  const f = foglietto(a.quando)

  async function esegui(lavoro: () => Promise<void>) {
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
      <Modulo iniziale={a} onAnnulla={() => setModifica(false)}
        onSalva={async (d) => { await api.modificaAppuntamento(a.id, d); setModifica(false); props.onCambiato() }} />
    )
  }

  return (
    <article className={`scheda appuntamento ${props.passato ? 'passato' : ''}`}>
      <div className="appuntamento-alto">
        <span className="foglietto" aria-hidden="true"><small>{f.settimana}</small><strong>{f.giorno}</strong><small>{f.mese}</small></span>
        <div className="riga-testo">
          <strong className="appuntamento-titolo">{a.titolo}</strong>
          <span>{giornoInParole(a.quando)} alle {oraAppuntamento(a.quando)}</span>
          {a.luogo && <span className="con-icona-piccola"><MapPin size={14} /> {a.luogo}</span>}
        </div>
        {props.puoModificare && !props.passato && (
          <button className="pulsante-icona tenue" aria-label="Modifica" onClick={() => setModifica(true)}><Pencil size={18} /></button>
        )}
      </div>
      {a.note && <p className="appuntamento-note"><StickyNote size={15} /> {a.note}</p>}

      {!props.passato && (
        <div className="appuntamento-chi">
          {a.accompagnoIo ? (
            <>
              <span className="stato stato-fatta"><Car size={13} /> Ci vai tu</span>
              <button className="link" disabled={invio} onClick={() => esegui(() => api.nonCiVado(a.id))}>Non riesco più</button>
            </>
          ) : a.accompagna ? (
            <span className="stato stato-corso"><Car size={13} /> Ci va {a.accompagna}</span>
          ) : (
            <>
              <span className="stato stato-aperta">Nessuno ci va ancora</span>
              <button className="pulsante piccolo" disabled={invio} onClick={() => esegui(() => api.ciVadoIo(a.id))}>Ci vado io</button>
            </>
          )}
        </div>
      )}

      {props.puoModificare && !props.passato && (conferma ? (
        <div className="appuntamento-chi">
          <span>Togliere l’appuntamento?</span>
          <button className="pulsante piccolo pericolo" disabled={invio} onClick={() => esegui(() => api.eliminaAppuntamento(a.id))}>Sì, togli</button>
          <button className="link" onClick={() => setConferma(false)}>No</button>
        </div>
      ) : (
        <button className="link tenue con-icona-piccola" onClick={() => setConferma(true)}><Trash2 size={14} /> Togli</button>
      ))}
      {errore && <p className="errore piccolo">{errore}</p>}
    </article>
  )
}

export default function AppuntamentiPagina({ anziano }: { anziano: Anziano }) {
  const { dati, errore, ricarica, setDati } = useCarica<CalendarioAnziano>(() => api.appuntamenti(anziano.id), anziano.id)
  const [nuovo, setNuovo] = useState(false)
  const [vediPassati, setVediPassati] = useState(false)

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="intestazione-pagina">
        <h1>Appuntamenti di {anziano.nome}</h1>
        <p className="sottotitolo">Visite, esami e tutto quello da non dimenticare. Chi ci va lo dice con un tocco.</p>
      </header>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}

      {dati && (
        <>
          {dati.puoModificare && (nuovo ? (
            <Modulo onAnnulla={() => setNuovo(false)}
              onSalva={async (d) => { setDati(await api.creaAppuntamento(anziano.id, d)); setNuovo(false) }} />
          ) : (
            <button className="pulsante con-icona" onClick={() => setNuovo(true)}><CalendarPlus size={20} /> Aggiungi un appuntamento</button>
          ))}

          <section>
            <div className="titolo-sezione"><h2>In programma</h2></div>
            {dati.prossimi.length === 0 ? (
              <div className="scheda vuoto"><CalendarDays size={28} /><p>Nessun appuntamento in programma.</p></div>
            ) : (
              <div className="pila-appuntamenti">
                {dati.prossimi.map((a) => <SchedaAppuntamento key={a.id} a={a} puoModificare={dati.puoModificare} onCambiato={ricarica} />)}
              </div>
            )}
            <p className="nota">
              <BellRing size={16} className="icona-inline" />
              Promemoria automatici: la sera prima alle 18 a {anziano.nome} e a tutto il cerchio, e due ore prima a {anziano.nome} e a chi ci va.
            </p>
          </section>

          {dati.passati.length > 0 && (
            <section>
              <button className="link" onClick={() => setVediPassati(!vediPassati)}>
                {vediPassati ? 'Nascondi i passati' : `Vedi i passati (${dati.passati.length})`}
              </button>
              {vediPassati && (
                <div className="pila-appuntamenti">
                  {dati.passati.map((a) => <SchedaAppuntamento key={a.id} a={a} puoModificare={false} passato onCambiato={ricarica} />)}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}
