// Famiglia: le badanti che si sono proposte. Per ognuna: profilo, messaggio, "Scrivi" o "No, grazie".

import { useState, type FormEvent } from 'react'
import { ArrowLeft, CircleCheck, MessageCircle, Inbox } from 'lucide-react'
import { api, messaggioErrore, type PropostaPerFamiglia } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { tempoFa } from '../comune/utili'
import CartaBadante from '../badanti/CartaBadante'
import CartaRicerca from './CartaRicerca'

function Proposta({ p, chiusa, onCambiato }: { p: PropostaPerFamiglia; chiusa: boolean; onCambiato: () => void }) {
  const [scrivi, setScrivi] = useState(false)
  const [testo, setTesto] = useState(`Buongiorno ${p.badante.nome}, grazie per la proposta. Possiamo sentirci per conoscerci?`)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const b = p.badante

  async function invia(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setErrore(null)
    try {
      const { contattoId } = await api.scegliProposta(p.id, testo)
      naviga(`/contatti/${contattoId}`)
    } catch (err) {
      setErrore(messaggioErrore(err))
      setInvio(false)
    }
  }

  async function noGrazie() {
    setInvio(true)
    setErrore(null)
    try {
      await api.rifiutaProposta(p.id)
      onCambiato()
    } catch (err) {
      setErrore(messaggioErrore(err))
    }
    setInvio(false)
  }

  return (
    <article className={`scheda proposta ${p.stato === 'NON_SCELTA' ? 'spenta' : ''}`}>
      <CartaBadante nome={b.nome} cognome={b.cognome} p={{ ...b, aggiornatoIl: '' }} breve={p.stato === 'NON_SCELTA'} />
      <div className="citazione">
        <small>Ha scritto {tempoFa(p.creataIl)}</small>
        {p.messaggio}
      </div>
      {p.stato === 'SCELTA' && p.contattoId && (
        <Collegamento a={`/contatti/${p.contattoId}`} className="pulsante con-icona"><MessageCircle size={20} /> Apri la conversazione</Collegamento>
      )}
      {p.stato === 'NON_SCELTA' && <span className="stato stato-annullata">Non scelta</span>}
      {p.stato === 'INVIATA' && !scrivi && (
        <div className="riga-pulsanti">
          <button className="pulsante con-icona" disabled={invio} onClick={() => setScrivi(true)}><MessageCircle size={18} /> Scrivi a {b.nome}</button>
          {!chiusa && <button className="pulsante secondario" disabled={invio} onClick={noGrazie}>No, grazie</button>}
        </div>
      )}
      {scrivi && (
        <form className="modulo" onSubmit={invia}>
          <label>Il tuo messaggio a {b.nome}
            <textarea rows={3} maxLength={2000} required value={testo} onChange={(e) => setTesto(e.target.value)} />
          </label>
          <div className="riga-pulsanti">
            <button type="button" className="pulsante fantasma" onClick={() => setScrivi(false)}>Annulla</button>
            <button className="pulsante con-icona" disabled={invio || !testo.trim()}><MessageCircle size={18} /> {invio ? 'Invio…' : 'Manda'}</button>
          </div>
        </form>
      )}
      {errore && <p className="errore" role="alert">{errore}</p>}
    </article>
  )
}

export default function ProposteRicerca({ id }: { id: number }) {
  const { dati, errore, ricarica } = useCarica(() => api.ricercaBadante(id), `ricerca-famiglia-${id}`, 60)
  const [conferma, setConferma] = useState(false)
  const [erroreChiudi, setErroreChiudi] = useState<string | null>(null)

  async function chiudi() {
    try {
      await api.chiudiRicerca(id)
      setConferma(false)
      await ricarica()
    } catch (err) {
      setErroreChiudi(messaggioErrore(err))
    }
  }

  const r = dati?.ricerca
  return (
    <div className="pagina-app entra">
      <Collegamento a="/cerco-badante" className="indietro"><ArrowLeft size={18} /> Cerco una badante</Collegamento>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && r && (
        <>
          <header className="intestazione-pagina">
            <h1>{dati.proposte.length === 0 ? 'Nessuna proposta, per ora' : dati.proposte.length === 1 ? '1 badante si propone' : `${dati.proposte.length} badanti si propongono`}</h1>
            <p className="sottotitolo">{r.chiusa ? 'Questa ricerca è chiusa.' : 'Leggi i profili e scrivi a chi vi convince. Ti avvisiamo noi quando arriva una nuova proposta.'}</p>
          </header>
          <details className="scheda dettagli-ricerca">
            <summary>Cosa avete scritto{r.creataDa ? ` (${r.creataDa})` : ''}</summary>
            <CartaRicerca r={r} />
          </details>

          {dati.proposte.length === 0 && (
            <div className="scheda vuoto"><Inbox size={28} /><p>Le badanti della provincia hanno ricevuto un avviso. Le proposte arrivano qui.</p></div>
          )}
          <div className="pila-appuntamenti">
            {dati.proposte.map((p) => <Proposta key={p.id} p={p} chiusa={r.chiusa} onCambiato={ricarica} />)}
          </div>

          {!r.chiusa && (conferma ? (
            <div className="scheda modulo">
              <p className="senza-margine">Chiudere la ricerca? Non arriveranno altre proposte, e a chi aspetta una risposta diciamo con gentilezza che avete scelto diversamente.</p>
              {erroreChiudi && <p className="errore" role="alert">{erroreChiudi}</p>}
              <div className="riga-pulsanti">
                <button className="pulsante fantasma" onClick={() => setConferma(false)}>No</button>
                <button className="pulsante con-icona" onClick={chiudi}><CircleCheck size={18} /> Sì, chiudi</button>
              </div>
            </div>
          ) : (
            <button className="pulsante fantasma con-icona" onClick={() => setConferma(true)}><CircleCheck size={18} /> Abbiamo trovato: chiudi la ricerca</button>
          ))}
        </>
      )}
    </div>
  )
}
