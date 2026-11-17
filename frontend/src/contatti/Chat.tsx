// Una conversazione tra famiglia e badante. La famiglia può invitare la badante nel cerchio;
// la badante può chiudere la conversazione.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Ban, Languages, Send, UserPlus } from 'lucide-react'
import { api, messaggioErrore, type MessaggioChat, type Profilo } from '../comune/api'
import { LINGUE } from '../interprete/lingue'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { tempoFa } from '../comune/utili'
import { t } from '../comune/lingua'

const CHIAVE_TRADUCI = 'unicare-chat-traduci'
const leggiTraduci = () => { try { return localStorage.getItem(CHIAVE_TRADUCI) !== 'no' } catch { return true } }

/** Un messaggio tradotto: la traduzione, e sotto "Tradotto dal rumeno · Originale". */
function Tradotto({ m, traduzione }: { m: MessaggioChat; traduzione: string }) {
  const [originale, setOriginale] = useState(false)
  return (
    <>
      <p>{originale ? m.testo : traduzione}</p>
      <button type="button" className="chat-originale" onClick={() => setOriginale(!originale)}>
        <Languages size={13} /> {originale ? t('Mostra la traduzione') : t('Tradotto dal {0} · originale', LINGUE[m.lingua].italiano.toLowerCase())}
      </button>
    </>
  )
}

/** Un link d'invito nel messaggio diventa un pulsante "Entra nel cerchio". */
function Testo({ m, traduzione }: { m: MessaggioChat; traduzione?: string | null }) {
  const invito = m.testo.match(/https?:\/\/\S+(\/invito\/[A-Za-z0-9_-]+)/)
  if (!invito && traduzione) return <Tradotto m={m} traduzione={traduzione} />
  if (!invito) return <p>{m.testo}</p>
  return (
    <>
      <p>{m.testo.replace(invito[0], '').replace(/[:\s]+$/, '.')}</p>
      {m.mio ? <span className="nota">{t('Invito mandato')}</span> : <Collegamento a={invito[1]!} className="pulsante piccolo">{t('Entra nel cerchio')}</Collegamento>}
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
  const [traduci, setTraduci] = useState(leggiTraduci)
  const [tradotti, setTradotti] = useState<Record<number, string | null>>({})

  // I messaggi dell'altra persona scritti in un'altra lingua si traducono nella mia, uno alla volta.
  const daTradurre = traduci && dati
    ? dati.messaggi.filter((m) => !m.mio && m.lingua !== profilo.lingua && !m.traduzione && !(m.id in tradotti))
    : []
  const prossimo = daTradurre[0]?.id
  useEffect(() => {
    if (prossimo === undefined) return
    let annullato = false
    api.traduciMessaggio(id, prossimo)
      .then((r) => r.traduzione, () => null)
      .then((t) => { if (!annullato) setTradotti((x) => ({ ...x, [prossimo]: t })) })
    return () => { annullato = true }
  }, [id, prossimo])

  function cambiaTraduci(si: boolean) {
    setTraduci(si)
    try { localStorage.setItem(CHIAVE_TRADUCI, si ? 'si' : 'no') } catch { /* niente */ }
  }
  const lingueDiverse = dati?.messaggi.some((m) => !m.mio && m.lingua !== profilo.lingua) ?? false

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
      <Collegamento a="/contatti" className="indietro"><ArrowLeft size={18} />{' '}{t('Messaggi')}</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label={t('Caricamento')} />}
      {dati && altro && (
        <>
          <header className="intestazione-pagina">
            <h1>{altro.nome} {altro.cognome}</h1>
            <p className="sottotitolo">
              {altro.tipo === 'BADANTE'
                ? <Collegamento a={`/badanti/${altro.id}`} className="link">{t('Vedi il profilo')}</Collegamento>
                : t('Una famiglia che cerca assistenza')}
            </p>
          </header>

          {dati.puoInvitare.length > 0 && !dati.conversazione.bloccato && (
            <div className="scheda invita-chat">
              <UserPlus size={20} />
              <span>{t('Vi siete accordati? Invita {0} nel cerchio:', altro.nome)}</span>
              {dati.puoInvitare.length > 1 && (
                <select className="campo" value={cerchio} onChange={(e) => setCerchio(e.target.value)} aria-label={t('Cerchio')}>
                  <option value="">{t('Scegli il cerchio')}</option>
                  {dati.puoInvitare.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
              <button className="pulsante piccolo" disabled={invio || (dati.puoInvitare.length > 1 && !cerchio)}
                onClick={() => esegui(() => api.invitaDaConversazione(id, Number(cerchio || dati.puoInvitare[0]!.id)))}>
                {t('Invita nel cerchio')}
              </button>
            </div>
          )}

          {lingueDiverse && (
            <label className="scheda interruttore-riga chat-traduci">
              <span className="funzione-icona blu"><Languages size={20} /></span>
              <span className="riga-testo">
                <strong>{t('Traduci nella mia lingua')}</strong>
                <span>{t('{0} scrive in {1}. I messaggi passano da un servizio di traduzione.', altro.nome, LINGUE[dati.messaggi.find((m) => !m.mio)!.lingua].italiano.toLowerCase())}</span>
              </span>
              <input type="checkbox" role="switch" className="interruttore" checked={traduci} onChange={(e) => cambiaTraduci(e.target.checked)} />
            </label>
          )}

          <ul className="chat-messaggi">
            {dati.messaggi.map((m) => (
              <li key={m.id} className={m.mio ? 'mio' : ''}>
                <Testo m={m} traduzione={traduci && !m.mio ? (m.traduzione ?? tradotti[m.id]) : null} />
                <small>{tempoFa(m.creatoIl)}{m.mio && m.lettoIl ? t(' · letto') : ''}</small>
              </li>
            ))}
          </ul>
          {dati.conversazione.bloccato ? (
            <p className="nota centrato">{badante ? t('Hai chiuso questa conversazione.') : t('{0} ha chiuso questa conversazione.', altro.nome)}</p>
          ) : (
            <form className="chat-scrivi" onSubmit={manda}>
              <textarea rows={1} maxLength={2000} value={testo} onChange={(e) => setTesto(e.target.value)} placeholder={t('Scrivi un messaggio')} aria-label={t('Messaggio')} />
              <button className="pulsante-icona" disabled={invio || !testo.trim()} aria-label={t('Manda')}><Send size={20} /></button>
            </form>
          )}
          {erroreInvio && <p className="errore" role="alert">{erroreInvio}</p>}
          <div ref={fondo} />

          {badante && (
            <button className="link tenue con-icona-piccola centrato" onClick={() => esegui(() => api.chiudiConversazione(id, !dati.conversazione.bloccato))}>
              <Ban size={15} /> {dati.conversazione.bloccato ? t('Riapri la conversazione') : t('Chiudi la conversazione: questa famiglia non potrà più scriverti')}
            </button>
          )}
        </>
      )}
    </div>
  )
}
