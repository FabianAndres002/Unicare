// Il calendario del mese su sfondo viola: i giorni con un appuntamento hanno un pallino corallo,
// oggi è cerchiato, toccando un giorno si vedono solo i suoi appuntamenti.
// Sopra, il conto alla rovescia per il prossimo appuntamento.

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import type { Appuntamento } from '../comune/api'
import { giorniDaOggi, giornoIso, giornoInParole, oraAppuntamento } from './aspetto'

const GIORNI = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const NOMI_MESI = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre']

function ContoAllaRovescia({ a }: { a: Appuntamento }) {
  const giorni = giorniDaOggi(a.quando)
  const grande = giorni === 0 ? 'Oggi' : giorni === 1 ? 'Domani' : String(giorni)
  return (
    <div className="calendario-prossimo">
      <div className={`calendario-conto ${giorni <= 1 ? 'parola' : ''}`} aria-hidden="true">
        <strong>{grande}</strong>
        {giorni > 1 && <small>giorni</small>}
      </div>
      <div className="calendario-prossimo-testo">
        <span className="calendario-etichetta">Prossimo appuntamento</span>
        <strong>{a.titolo}</strong>
        <span><Clock size={14} /> {giornoInParole(a.quando)} alle {oraAppuntamento(a.quando)}</span>
        {a.luogo && <span><MapPin size={14} /> {a.luogo}</span>}
      </div>
    </div>
  )
}

type Props = {
  appuntamenti: Appuntamento[]
  prossimo: Appuntamento | undefined
  scelto: string | null
  onScegli: (giorno: string | null) => void
}

export default function CalendarioMese({ appuntamenti, prossimo, scelto, onScegli }: Props) {
  const [oggi] = useState(() => giornoIso(new Date()))
  const [mese, setMese] = useState(() => ({ anno: Number(oggi.slice(0, 4)), mese: Number(oggi.slice(5, 7)) - 1 }))
  const [verso, setVerso] = useState<'avanti' | 'indietro'>('avanti')

  // Quanti appuntamenti per giorno ("2026-11-19" → 2).
  const perGiorno = new Map<string, number>()
  for (const a of appuntamenti) {
    const g = giornoIso(a.quando)
    perGiorno.set(g, (perGiorno.get(g) ?? 0) + 1)
  }

  const primo = new Date(Date.UTC(mese.anno, mese.mese, 1))
  const vuoti = (primo.getUTCDay() + 6) % 7 // lunedì = 0
  const giorniNelMese = new Date(Date.UTC(mese.anno, mese.mese + 1, 0)).getUTCDate()
  const iso = (g: number) => `${mese.anno}-${String(mese.mese + 1).padStart(2, '0')}-${String(g).padStart(2, '0')}`
  const nelMese = [...perGiorno.entries()].filter(([g]) => g.startsWith(iso(1).slice(0, 7))).reduce((n, [, c]) => n + c, 0)

  function cambia(passo: number) {
    setVerso(passo > 0 ? 'avanti' : 'indietro')
    setMese(({ anno, mese: m }) => {
      const t = m + passo
      return { anno: anno + Math.floor(t / 12), mese: ((t % 12) + 12) % 12 }
    })
  }

  return (
    <div className="calendario-palco">
      <span className="rete-stella s1" aria-hidden="true" />
      <span className="rete-stella s2" aria-hidden="true" />
      {prossimo && <ContoAllaRovescia a={prossimo} />}

      <div className="calendario-testa">
        <button type="button" className="calendario-freccia" onClick={() => cambia(-1)} aria-label="Mese prima"><ChevronLeft size={22} /></button>
        <div className="calendario-mese" aria-live="polite">
          <strong>{NOMI_MESI[mese.mese]} {mese.anno}</strong>
          <small>{nelMese === 0 ? 'nessun appuntamento' : nelMese === 1 ? '1 appuntamento' : `${nelMese} appuntamenti`}</small>
        </div>
        <button type="button" className="calendario-freccia" onClick={() => cambia(1)} aria-label="Mese dopo"><ChevronRight size={22} /></button>
      </div>

      <div className="calendario-griglia intestazione" aria-hidden="true">
        {GIORNI.map((g, i) => <span key={i}>{g}</span>)}
      </div>
      <div key={`${mese.anno}-${mese.mese}`} className={`calendario-griglia giorni ${verso}`} role="group" aria-label={`${NOMI_MESI[mese.mese]} ${mese.anno}`}>
        {Array.from({ length: vuoti }, (_, i) => <span key={`v${i}`} />)}
        {Array.from({ length: giorniNelMese }, (_, i) => {
          const g = iso(i + 1)
          const quanti = perGiorno.get(g) ?? 0
          const classi = ['calendario-giorno', g === oggi && 'oggi', quanti > 0 && 'con-appuntamenti', g < oggi && 'passato', scelto === g && 'scelto']
          return (
            <button key={g} type="button" className={classi.filter(Boolean).join(' ')} aria-pressed={scelto === g}
              aria-label={`${i + 1} ${NOMI_MESI[mese.mese]}${quanti ? `, ${quanti} ${quanti === 1 ? 'appuntamento' : 'appuntamenti'}` : ''}`}
              onClick={() => onScegli(scelto === g ? null : g)}>
              {i + 1}
              {quanti > 0 && <span className="calendario-pallini" aria-hidden="true">{Array.from({ length: Math.min(quanti, 3) }, (_, k) => <i key={k} />)}</span>}
            </button>
          )
        })}
      </div>
      {mese.anno !== Number(oggi.slice(0, 4)) || mese.mese !== Number(oggi.slice(5, 7)) - 1 ? (
        <button type="button" className="calendario-torna" onClick={() => { const d = Number(oggi.slice(5, 7)) - 1 + Number(oggi.slice(0, 4)) * 12 - (mese.mese + mese.anno * 12); cambia(d) }}>Torna a oggi</button>
      ) : null}
    </div>
  )
}
