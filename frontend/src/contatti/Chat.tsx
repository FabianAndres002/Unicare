// Una conversazione tra famiglia e badante. La famiglia può invitare la badante nel cerchio;
// la badante può chiudere la conversazione.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Ban, Send, UserPlus } from 'lucide-react'
import { api, messaggioErrore, type MessaggioChat, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { tempoFa } from '../comune/utili'

/** Un link d'invito nel messaggio diventa un pulsante "Entra nel cerchio". */
function Testo({ m }: { m: MessaggioChat }) {
  const invito = m.testo.match(/https?:\/\/\S+(\/invito\/[A-Za-z0-9_-]+)/)
  if (!invito) return <p>{m.testo}</p>
  return (
    <>
      <p>{m.testo.replace(invito[0], '').replace(/[:\s]+$/, '.')}</p>
      {m.mio ? <span className="nota">Invito mandato</span> : <Collegamento a={invito[1]!} className="pulsante piccolo">Entra nel cerchio</Collegamento>}
    </>
  )
}

export default function Chat({ id, profilo }: { id: number; profilo: Profilo }) {
  const { dati, errore, ricarica } = useCarica(() => api.conversazione(id), id, 10)
  const [testo, setTesto] = useState('')
  const [invio, setInvio] = useState(false)
  const [erroreInvio, setErroreInvio] = useState<string | null>(null)
  const [cerchio, setCerchio] = useState('')
  const fondo = useRef<HTMLDivElement>(null)
  const badante = profilo.tipo === 'BADANTE'
  const quanti = dati?.messaggi.length ?? 0

  useEffect(() => { fondo.current?.scrollIntoView({ block: 'end' }) }, [quanti])

  async function esegui(lavoro: () => Promise<void>) {
    setInvio(true)
    setErroreInvio(null)
    try {
      await lavoro()
      await ricarica()
    } catch (e) {
      setErroreInvio(messaggioErrore(e))
    }
    setInvio(false)
  }

  function manda(e: FormEvent) {
    e.preventDefault()
    esegui(async () => { await api.rispondi(id, testo); setTesto('') })
  }

  const altro = dati?.conversazione.altro
  return (
    <div className="pagina-app chat entra">
      <Collegamento a="/contatti" className="indietro"><ArrowLeft size={18} /> Messaggi</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && altro && (
        <>
          <header className="intestazione-pagina">
            <h1>{altro.nome} {altro.cognome}</h1>
            <p className="sottotitolo">
              {altro.tipo === 'BADANTE'
                ? <Collegamento a={`/badanti/${altro.id}`} className="link">Vedi il profilo</Collegamento>
                : 'Una famiglia che cerca assistenza'}
            </p>
          </header>

          {dati.puoInvitare.length > 0 && !dati.conversazione.bloccato && (
            <div className="scheda invita-chat">
              <UserPlus size={20} />
              <span>Vi siete accordati? Invita {altro.nome} nel cerchio:</span>
              {dati.puoInvitare.length > 1 && (
                <select className="campo" value={cerchio} onChange={(e) => setCerchio(e.target.value)} aria-label="Cerchio">
                  <option value="">Scegli il cerchio</option>
                  {dati.puoInvitare.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
              <button className="pulsante piccolo" disabled={invio || (dati.puoInvitare.length > 1 && !cerchio)}
                onClick={() => esegui(() => api.invitaDaConversazione(id, Number(cerchio || dati.puoInvitare[0]!.id)))}>
                Invita nel cerchio
              </button>
            </div>
          )}

          <ul className="chat-messaggi">
            {dati.messaggi.map((m) => (
              <li key={m.id} className={m.mio ? 'mio' : ''}>
                <Testo m={m} />
                <small>{tempoFa(m.creatoIl)}{m.mio && m.lettoIl ? ' · letto' : ''}</small>
              </li>
            ))}
          </ul>
          {dati.conversazione.bloccato ? (
            <p className="nota centrato">{badante ? 'Hai chiuso questa conversazione.' : `${altro.nome} ha chiuso questa conversazione.`}</p>
          ) : (
            <form className="chat-scrivi" onSubmit={manda}>
              <textarea rows={1} maxLength={2000} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Scrivi un messaggio" aria-label="Messaggio" />
              <button className="pulsante-icona" disabled={invio || !testo.trim()} aria-label="Manda"><Send size={20} /></button>
            </form>
          )}
          {erroreInvio && <p className="errore" role="alert">{erroreInvio}</p>}
          <div ref={fondo} />

          {badante && (
            <button className="link tenue con-icona-piccola centrato" onClick={() => esegui(() => api.chiudiConversazione(id, !dati.conversazione.bloccato))}>
              <Ban size={15} /> {dati.conversazione.bloccato ? 'Riapri la conversazione' : 'Chiudi la conversazione: questa famiglia non potrà più scriverti'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
