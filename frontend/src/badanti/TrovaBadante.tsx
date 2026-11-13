// Famiglia: cerca una badante per provincia, servizio e disponibilità.

import { useState } from 'react'
import { ArrowLeft, ChevronRight, MessagesSquare, SearchX } from 'lucide-react'
import { api, type Disponibilita, type Servizio } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import CartaBadante from './CartaBadante'
import { DISPONIBILITA, PROVINCE, SERVIZI } from './aspetto'

const FILTRI = 'unicare-filtri-badanti'

function filtriSalvati(): { provincia: string; servizio: string; disponibilita: string } {
  try {
    return { provincia: '', servizio: '', disponibilita: '', ...JSON.parse(localStorage.getItem(FILTRI) ?? '{}') }
  } catch {
    return { provincia: '', servizio: '', disponibilita: '' }
  }
}

export default function TrovaBadante() {
  const [filtri, setFiltri] = useState(filtriSalvati)
  const chiave = JSON.stringify(filtri)
  const { dati, errore } = useCarica(() => api.cercaBadanti(filtri), chiave, 120)
  const { dati: conversazioni } = useCarica(() => api.conversazioni(), 'conversazioni', 60)
  const nonLetti = conversazioni?.reduce((n, c) => n + c.nonLetti, 0) ?? 0

  function cambia(k: keyof typeof filtri, v: string) {
    const nuovi = { ...filtri, [k]: v }
    setFiltri(nuovi)
    try { localStorage.setItem(FILTRI, JSON.stringify(nuovi)) } catch { /* niente */ }
  }

  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="intestazione-pagina">
        <h1>Trova una badante</h1>
        <p className="sottotitolo">Badanti che si propongono nella tua zona. Scrivi a chi ti sembra adatta: risponde qui in Unicare.</p>
      </header>

      {conversazioni && conversazioni.length > 0 && (
        <Collegamento a="/contatti" className="scheda riga-cerchio">
          <span className="funzione-icona blu"><MessagesSquare size={22} /></span>
          <span className="riga-testo"><strong>Le tue conversazioni</strong><span>{conversazioni.length} {conversazioni.length === 1 ? 'badante' : 'badanti'}</span></span>
          {nonLetti > 0 && <span className="distintivo urgente">{nonLetti} {nonLetti === 1 ? 'nuovo' : 'nuovi'}</span>}
          <ChevronRight size={20} />
        </Collegamento>
      )}

      <div className="filtri-badanti">
        <select className="campo" value={filtri.provincia} onChange={(e) => cambia('provincia', e.target.value)} aria-label="Provincia">
          <option value="">Tutte le province</option>
          {PROVINCE.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
        </select>
        <div className="due-colonne">
          <select className="campo" value={filtri.disponibilita} onChange={(e) => cambia('disponibilita', e.target.value)} aria-label="Disponibilità">
            <option value="">Qualsiasi orario</option>
            {(Object.keys(DISPONIBILITA) as Disponibilita[]).map((k) => <option key={k} value={k}>{DISPONIBILITA[k]}</option>)}
          </select>
          <select className="campo" value={filtri.servizio} onChange={(e) => cambia('servizio', e.target.value)} aria-label="Servizio">
            <option value="">Qualsiasi servizio</option>
            {(Object.keys(SERVIZI) as Servizio[]).map((k) => <option key={k} value={k}>{SERVIZI[k]}</option>)}
          </select>
        </div>
      </div>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && (
        <>
          <p className="nota senza-margine">{dati.length === 1 ? '1 badante' : `${dati.length} badanti`}</p>
          {dati.length === 0 && (
            <div className="scheda vuoto"><SearchX size={28} /><p>Nessuna badante con questi filtri. Prova a toglierne qualcuno o a cambiare provincia.</p></div>
          )}
          <div className="pila-appuntamenti">
            {dati.map((b) => (
              <Collegamento key={b.id} a={`/badanti/${b.id}`} className="scheda carta-link">
                <CartaBadante nome={b.nome} cognome={b.cognome} p={b} breve />
                {b.contattoId && <span className="stato stato-corso">Le hai già scritto</span>}
              </Collegamento>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
