// Calendario degli appuntamenti dell'anziano (lato famiglia).
// Familiari e amministratore aggiungono e cambiano; tutti possono dire "Ci vado io".

import { useState, type CSSProperties, type FormEvent } from 'react'
import { ArrowLeft, BellRing, CalendarDays, CalendarPlus, Car, MapPin, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { api, messaggioErrore, type Anziano, type AppuntamentoFamiglia, type CalendarioAnziano, type DatiAppuntamento } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { foglietto, giorniDaOggi, giornoInParole, giornoIso, oraAppuntamento } from './aspetto'
import CalendarioMese from './CalendarioMese'
import { t } from '../comune/lingua'

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
      <label>{t('Che appuntamento è?')}
        <input {...campo('titolo')} placeholder={t('Es. Visita dal cardiologo')} required minLength={2} maxLength={120} autoFocus={!i} />
      </label>
      <div className="due-colonne">
        <label>{t('Giorno')}<input type="date" {...campo('data')} min={i ? undefined : oggi} required /></label>
        <label>{t('Ora')}<input type="time" {...campo('ora')} required /></label>
      </div>
      <label><span>{t('Dove')}{' '}<span className="nota">{t('facoltativo')}</span></span>
        <input {...campo('luogo')} placeholder={t('Es. Ospedale San Paolo, 2° piano')} maxLength={200} />
      </label>
      <label><span>{t('Note')}{' '}<span className="nota">{t('facoltative')}</span></span>
        <textarea {...campo('note')} rows={2} placeholder={t('Es. Portare le analisi, a digiuno')} maxLength={500} />
      </label>
      {errore && <p className="errore" role="alert">{errore}</p>}
      <div className="riga-pulsanti">
        <button type="button" className="pulsante fantasma" onClick={props.onAnnulla}>{t('Annulla')}</button>
        <button className="pulsante" disabled={invio}>{invio ? t('Salvo…') : i ? t('Salva') : t('Aggiungi')}</button>
      </div>
    </form>
  )
}

/** Il colore della striscia a sinistra: corallo se nessuno ci va, viola se qualcuno ci va, oggi in evidenza. */
function coloreAppuntamento(a: AppuntamentoFamiglia, passato?: boolean) {
  if (passato) return ''
  const urgente = giorniDaOggi(a.quando) <= 1 ? 'vicino' : ''
  return `${a.accompagna ? 'coperto' : 'scoperto'} ${urgente}`
}

/** Appuntamenti raggruppati per giorno, nell'ordine in cui arrivano. */
function perGiorno(elenco: AppuntamentoFamiglia[]) {
  const gruppi: { giorno: string; elenco: AppuntamentoFamiglia[] }[] = []
  for (const a of elenco) {
    const g = giornoIso(a.quando)
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo?.giorno === g) ultimo.elenco.push(a)
    else gruppi.push({ giorno: g, elenco: [a] })
  }
  return gruppi
}

function SchedaAppuntamento(props: { a: AppuntamentoFamiglia; puoModificare: boolean; passato?: boolean; onCambiato: () => void; indice?: number }) {
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
    <article className={`scheda appuntamento ${props.passato ? 'passato' : ''} ${coloreAppuntamento(a, props.passato)}`}
      style={{ '--ritardo': `${0.06 * (props.indice ?? 0)}s` } as CSSProperties}>
      <div className="appuntamento-alto">
        <span className="foglietto" aria-hidden="true"><small>{f.settimana}</small><strong>{f.giorno}</strong><small>{f.mese}</small></span>
        <div className="riga-testo">
          <strong className="appuntamento-titolo">{a.titolo}</strong>
          <span>{giornoInParole(a.quando)}{' '}{t('alle {0}', oraAppuntamento(a.quando))}</span>
          {a.luogo && <span className="con-icona-piccola"><MapPin size={14} /> {a.luogo}</span>}
        </div>
        {props.puoModificare && !props.passato && (
          <button className="pulsante-icona tenue" aria-label={t('Modifica')} onClick={() => setModifica(true)}><Pencil size={18} /></button>
        )}
      </div>
      {a.note && <p className="appuntamento-note"><StickyNote size={15} /> {a.note}</p>}

      {!props.passato && (
        <div className="appuntamento-chi">
          {a.accompagnoIo ? (
            <>
              <span className="stato stato-fatta"><Car size={13} />{' '}{t('Ci vai tu')}</span>
              <button className="link" disabled={invio} onClick={() => esegui(() => api.nonCiVado(a.id))}>{t('Non riesco più')}</button>
            </>
          ) : a.accompagna ? (
            <span className="stato stato-corso"><Car size={13} />{' '}{t('Ci va {0}', a.accompagna)}</span>
          ) : (
            <>
              <span className="stato stato-aperta">{t('Nessuno ci va ancora')}</span>
              <button className="pulsante piccolo" disabled={invio} onClick={() => esegui(() => api.ciVadoIo(a.id))}>{t('Ci vado io')}</button>
            </>
          )}
        </div>
      )}

      {props.puoModificare && !props.passato && (conferma ? (
        <div className="appuntamento-chi">
          <span>{t('Togliere l’appuntamento?')}</span>
          <button className="pulsante piccolo pericolo" disabled={invio} onClick={() => esegui(() => api.eliminaAppuntamento(a.id))}>{t('Sì, togli')}</button>
          <button className="link" onClick={() => setConferma(false)}>{t('No')}</button>
        </div>
      ) : (
        <button className="link tenue con-icona-piccola" onClick={() => setConferma(true)}><Trash2 size={14} />{' '}{t('Togli')}</button>
      ))}
      {errore && <p className="errore piccolo">{errore}</p>}
    </article>
  )
}

export default function AppuntamentiPagina({ anziano }: { anziano: Anziano }) {
  const { dati, errore, ricarica, setDati } = useCarica<CalendarioAnziano>(() => api.appuntamenti(anziano.id), anziano.id)
  const [nuovo, setNuovo] = useState(false)
  const [vediPassati, setVediPassati] = useState(false)
  const [giorno, setGiorno] = useState<string | null>(null)

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} />{' '}{t('Home')}</Collegamento>
      <header className="intestazione-pagina">
        <h1>{t('Appuntamenti di {0}', anziano.nome)}</h1>
        <p className="sottotitolo">{t('Visite, esami e tutto quello da non dimenticare. Chi ci va lo dice con un tocco.')}</p>
      </header>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label={t('Caricamento')} />}

      {dati && (
        <>
          {dati.puoModificare && (nuovo ? (
            <Modulo onAnnulla={() => setNuovo(false)}
              onSalva={async (d) => { setDati(await api.creaAppuntamento(anziano.id, d)); setNuovo(false) }} />
          ) : (
            <button className="pulsante con-icona" onClick={() => setNuovo(true)}><CalendarPlus size={20} />{' '}{t('Aggiungi un appuntamento')}</button>
          ))}

          <CalendarioMese appuntamenti={[...dati.prossimi, ...dati.passati]} prossimo={dati.prossimi[0]} scelto={giorno} onScegli={setGiorno} />

          <section>
            {giorno ? (
              <div className="titolo-sezione">
                <h2>{giornoInParole(`${giorno}T12:00:00`)}</h2>
                <button className="link" onClick={() => setGiorno(null)}>{t('Mostra tutti')}</button>
              </div>
            ) : (
              <div className="titolo-sezione"><h2>{t('In programma')}</h2></div>
            )}
            {(() => {
              const elenco = giorno ? [...dati.prossimi, ...dati.passati].filter((a) => giornoIso(a.quando) === giorno) : dati.prossimi
              if (elenco.length === 0) {
                return <div className="scheda vuoto"><CalendarDays size={28} /><p>{giorno ? t('Niente in questo giorno.') : t('Nessun appuntamento in programma.')}</p></div>
              }
              let n = 0
              return (
                <ol className="linea-tempo">
                  {perGiorno(elenco).map((gr) => (
                    <li key={gr.giorno} className={`linea-tempo-giorno ${giorniDaOggi(`${gr.giorno}T12:00:00`) === 0 ? 'oggi' : ''}`}>
                      {!giorno && <span className="linea-tempo-data">{giornoInParole(`${gr.giorno}T12:00:00`)}</span>}
                      <div className="pila-appuntamenti">
                        {gr.elenco.map((a) => {
                          const passato = dati.passati.some((p) => p.id === a.id)
                          return <SchedaAppuntamento key={a.id} a={a} indice={n++} passato={passato} puoModificare={dati.puoModificare && !passato} onCambiato={ricarica} />
                        })}
                      </div>
                    </li>
                  ))}
                </ol>
              )
            })()}
            <p className="nota">
              <BellRing size={16} className="icona-inline" />
              {t('Promemoria automatici: la sera prima alle 18 a {0} e a tutto il cerchio, e due ore prima a {1} e a chi ci va.', anziano.nome, anziano.nome)}
            </p>
          </section>

          {dati.passati.length > 0 && !giorno && (
            <section>
              <button className="link" onClick={() => setVediPassati(!vediPassati)}>
                {vediPassati ? t('Nascondi i passati') : t('Vedi i passati ({0})', dati.passati.length)}
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
