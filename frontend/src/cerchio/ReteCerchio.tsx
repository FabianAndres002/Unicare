// Il cerchio disegnato come una rete: al centro la persona assistita, intorno chi se ne prende cura,
// collegati da linee. Ogni pallino è un pulsante: toccandolo si vedono i dettagli sotto.

import type { CSSProperties } from 'react'
import { Clock, Plus } from 'lucide-react'
import type { Anziano, InvitoInAttesa, Membro } from '../comune/api'
import Avatar from '../comune/Avatar'
import { naviga } from '../comune/router'

export type Scelta = { tipo: 'anziano' | 'membro' | 'invito'; id: number }

type Nodo = {
  chiave: string
  x: number
  y: number
  tipo: 'membro' | 'invito' | 'aggiungi'
  membro?: Membro
  invito?: InvitoInAttesa
}

type Props = {
  anziani: Anziano[]
  membri: Membro[]
  inviti: InvitoInAttesa[]
  mioId: number
  puoInvitare: boolean
  scelta: Scelta | null
  onScegli: (s: Scelta) => void
}

const RAGGIO = 37 // in percentuale del riquadro

export default function ReteCerchio({ anziani, membri, inviti, mioId, puoInvitare, scelta, onScegli }: Props) {
  // Intorno: prima i membri, poi gli inviti in attesa, infine il "+" per invitare.
  const giro: Omit<Nodo, 'x' | 'y'>[] = [
    ...membri.map((m) => ({ chiave: `m${m.id}`, tipo: 'membro' as const, membro: m })),
    ...(puoInvitare ? inviti.map((i) => ({ chiave: `i${i.id}`, tipo: 'invito' as const, invito: i })) : []),
    ...(puoInvitare ? [{ chiave: 'aggiungi', tipo: 'aggiungi' as const }] : []),
  ]
  const nodi: Nodo[] = giro.map((n, i) => {
    const angolo = (-90 + (i * 360) / giro.length) * (Math.PI / 180)
    return { ...n, x: 50 + RAGGIO * Math.cos(angolo), y: 50 + RAGGIO * Math.sin(angolo) }
  })
  // Con più persone assistite, stanno affiancate al centro.
  const centri = anziani.map((a, i) => ({ anziano: a, x: 50 + (i - (anziani.length - 1) / 2) * 22, y: 50 }))
  const ritardo = (i: number) => ({ '--ritardo': `${0.08 * i}s` }) as CSSProperties

  return (
    <div className="rete" role="group" aria-label="Le persone del cerchio">
      <svg className="rete-linee" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={RAGGIO} className="rete-anello" />
        {nodi.filter((n) => n.tipo !== 'aggiungi').map((n, i) => (
          <line key={n.chiave} x1="50" y1="50" x2={n.x} y2={n.y} style={ritardo(i)}
            className={`rete-linea ${n.tipo === 'invito' ? 'attesa' : n.membro?.ruolo === 'BADANTE' ? 'badante' : 'familiare'}`} />
        ))}
      </svg>

      {centri.map(({ anziano: a, x, y }) => (
        <button key={`a${a.id}`} type="button" className={`rete-nodo centro ${scelta?.tipo === 'anziano' && scelta.id === a.id ? 'scelto' : ''}`}
          style={{ left: `${x}%`, top: `${y}%` }} aria-pressed={scelta?.tipo === 'anziano' && scelta.id === a.id}
          onClick={() => onScegli({ tipo: 'anziano', id: a.id })}>
          <span className="rete-alone" aria-hidden="true" />
          <Avatar nome={a.nome} cognome={a.cognome} className="rete-avatar" />
          <span className="rete-nome">{a.nome}</span>
        </button>
      ))}

      {nodi.map((n, i) => {
        if (n.tipo === 'aggiungi') {
          return (
            <button key={n.chiave} type="button" className="rete-nodo aggiungi" style={{ left: `${n.x}%`, top: `${n.y}%`, ...ritardo(i) }}
              onClick={() => naviga('/invita')}>
              <span className="rete-avatar avatar"><Plus size={24} /></span>
              <span className="rete-nome">Invita</span>
            </button>
          )
        }
        const scelto = scelta?.tipo === n.tipo && scelta.id === (n.membro?.id ?? n.invito?.id)
        return (
          <button key={n.chiave} type="button" className={`rete-nodo ${n.tipo} ${scelto ? 'scelto' : ''}`}
            style={{ left: `${n.x}%`, top: `${n.y}%`, ...ritardo(i) }} aria-pressed={scelto}
            onClick={() => onScegli(n.membro ? { tipo: 'membro', id: n.membro.id } : { tipo: 'invito', id: n.invito!.id })}>
            {n.membro
              ? <Avatar nome={n.membro.nome} cognome={n.membro.cognome} className="rete-avatar" />
              : <span className="rete-avatar avatar avatar-attesa"><Clock size={20} /></span>}
            <span className="rete-nome">
              {n.membro ? (n.membro.id === mioId ? 'Tu' : n.membro.nome) : 'Invitato'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
