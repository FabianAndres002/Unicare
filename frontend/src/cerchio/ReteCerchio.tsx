// Il cerchio disegnato come una rete: al centro la persona assistita, intorno chi se ne prende cura,
// collegati da linee. Ogni pallino è un pulsante: toccandolo si vedono i dettagli sotto.

import type { CSSProperties } from 'react'
import { Clock, Plus } from 'lucide-react'
import type { Anziano, InvitoInAttesa, Membro } from '../comune/api'
import Avatar from '../comune/Avatar'
import { naviga } from '../comune/router'
import { t } from '../comune/lingua'

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
    <div className="rete-palco">
    <span className="rete-stella s1" aria-hidden="true" />
    <span className="rete-stella s2" aria-hidden="true" />
    <span className="rete-stella s3" aria-hidden="true" />
    <div className="rete" role="group" aria-label={t('Le persone del cerchio')}>
      <svg className="rete-linee" viewBox="0 0 100 100" aria-hidden="true">
        {/* Decorazioni: cerchi concentrici e l'anello che gira piano */}
        <circle cx="50" cy="50" r="18" className="rete-onda" />
        <circle cx="50" cy="50" r="27" className="rete-onda lontana" />
        <g className="rete-giro"><circle cx="50" cy="50" r={RAGGIO} className="rete-anello" /></g>
        <circle cx="50" cy="50" r={RAGGIO + 8} className="rete-anello esterno" />
        {nodi.filter((n) => n.tipo !== 'aggiungi').map((n, i) => {
          const attiva = scelta !== null && scelta.tipo === n.tipo && scelta.id === (n.membro?.id ?? n.invito?.id)
          const tipo = n.tipo === 'invito' ? 'attesa' : n.membro?.ruolo === 'BADANTE' ? 'badante' : 'familiare'
          return (
            <g key={n.chiave}>
              <line x1="50" y1="50" x2={n.x} y2={n.y} style={ritardo(i)} className={`rete-linea ${tipo} ${attiva ? 'attiva' : ''}`} />
              {/* Un impulso di luce che va da ogni persona verso il centro: la cura che arriva */}
              {n.tipo === 'membro' && (
                <circle r={attiva ? 1.5 : 1.1} className={`rete-impulso ${tipo}`}>
                  <animateMotion dur={`${2.6 + (i % 3) * 0.4}s`} begin={`${0.8 + i * 0.35}s`} repeatCount="indefinite" path={`M ${n.x} ${n.y} L 50 50`} />
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {centri.map(({ anziano: a, x, y }) => (
        <button key={`a${a.id}`} type="button" className={`rete-nodo centro ${scelta?.tipo === 'anziano' && scelta.id === a.id ? 'scelto' : ''}`}
          style={{ left: `${x}%`, top: `${y}%` }} aria-pressed={scelta?.tipo === 'anziano' && scelta.id === a.id}
          onClick={() => onScegli({ tipo: 'anziano', id: a.id })}>
          <span className="rete-alone" aria-hidden="true" />
          <Avatar nome={a.nome} cognome={a.cognome} foto={a.foto} className="rete-avatar" />
          <span className="rete-nome">{a.nome}</span>
        </button>
      ))}

      {nodi.map((n, i) => {
        if (n.tipo === 'aggiungi') {
          return (
            <button key={n.chiave} type="button" className="rete-nodo aggiungi" style={{ left: `${n.x}%`, top: `${n.y}%`, ...ritardo(i) }}
              onClick={() => naviga('/invita')}>
              <span className="rete-avatar avatar"><Plus size={24} /></span>
              <span className="rete-nome">{t('Invita')}</span>
            </button>
          )
        }
        const scelto = scelta?.tipo === n.tipo && scelta.id === (n.membro?.id ?? n.invito?.id)
        return (
          <button key={n.chiave} type="button" className={`rete-nodo ${n.tipo} ${scelto ? 'scelto' : ''}`}
            style={{ left: `${n.x}%`, top: `${n.y}%`, ...ritardo(i), '--fluttua': `${-(i * 0.7)}s` } as CSSProperties} aria-pressed={scelto}
            onClick={() => onScegli(n.membro ? { tipo: 'membro', id: n.membro.id } : { tipo: 'invito', id: n.invito!.id })}>
            {n.membro
              ? <Avatar nome={n.membro.nome} cognome={n.membro.cognome} foto={n.membro.foto} className="rete-avatar" />
              : <span className="rete-avatar avatar avatar-attesa"><Clock size={20} /></span>}
            <span className="rete-nome">
              {n.membro ? (n.membro.id === mioId ? t('Tu') : n.membro.nome) : t('Invitato')}
            </span>
          </button>
        )
      })}
    </div>
    </div>
  )
}
