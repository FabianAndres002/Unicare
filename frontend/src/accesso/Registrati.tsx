import type { Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import LayoutAccesso from './LayoutAccesso'
import ModuloRegistrati from './ModuloRegistrati'

export default function Registrati({ onEntrato }: { onEntrato: (profilo: Profilo) => void }) {
  return (
    <LayoutAccesso titolo="Crea il tuo account" sottotitolo="Ci vuole un minuto.">
      <ModuloRegistrati onEntrato={onEntrato} />
      <p className="cambio">Hai già un account? <Collegamento a="/" className="link">Accedi</Collegamento></p>
      <p className="cambio">Registrandoti accetti <Collegamento a="/privacy" className="link">come trattiamo i dati</Collegamento>.</p>
    </LayoutAccesso>
  )
}
