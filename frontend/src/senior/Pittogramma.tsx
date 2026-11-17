// I disegni grandi della Senior App per "Di cosa hai bisogno?": simboli che si riconoscono
// al volo (la croce verde della farmacia, il carrello della spesa, l'auto…).

import { Car, Coffee, House, ShoppingCart, Wrench } from 'lucide-react'
import type { Categoria } from '../comune/api'

type Scelta = Exclude<Categoria, 'ALTRO'>

function CroceFarmacia({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 6h16a3 3 0 0 1 3 3v12h12a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H43v12a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3V43H9a3 3 0 0 1-3-3V24a3 3 0 0 1 3-3h12V9a3 3 0 0 1 3-3z" fill="#16a35a" />
      <path d="M27 12h10v15h15v10H37v15H27V37H12V27h15z" fill="#3fd17f" opacity=".55" />
    </svg>
  )
}

function CasaAttrezzi({ size }: { size: number }) {
  return (
    <span className="pittogramma-doppio" style={{ width: size, height: size }}>
      <House size={size} strokeWidth={2.2} />
      <span className="pittogramma-badge"><Wrench size={size * 0.38} strokeWidth={2.6} /></span>
    </span>
  )
}

export default function Pittogramma({ cosa, size = 60 }: { cosa: Scelta; size?: number }) {
  switch (cosa) {
    case 'FARMACIA': return <CroceFarmacia size={size} />
    case 'SPESA': return <ShoppingCart size={size} strokeWidth={2.2} />
    case 'ACCOMPAGNAMENTO': return <Car size={size} strokeWidth={2.2} />
    case 'COMPAGNIA': return <Coffee size={size} strokeWidth={2.2} />
    case 'CASA': return <CasaAttrezzi size={size} />
  }
}
