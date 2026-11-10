import type { Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import LayoutAccesso from './LayoutAccesso'
import ModuloAccedi from './ModuloAccedi'

export default function Accedi({ onEntrato }: { onEntrato: (profilo: Profilo) => void }) {
  return (
    <LayoutAccesso titolo="Bentornato" sottotitolo="Accedi per vedere il tuo cerchio.">
      <ModuloAccedi onEntrato={onEntrato} />
      <p className="cambio">Non hai un account? <Collegamento a="/registrati" className="link">Registrati</Collegamento></p>
    </LayoutAccesso>
  )
}
