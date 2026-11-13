// Il riquadro "prossima visita" sulla scheda dell'anziano in Home.

import { api } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { foglietto, giornoInParole } from './aspetto'

export default function ProssimaVisita({ anzianoId }: { anzianoId: number }) {
  const { dati } = useCarica(() => api.appuntamenti(anzianoId), anzianoId, 120)
  const prossimo = dati?.prossimi[0]
  const vicino = prossimo && ['Oggi', 'Domani'].includes(giornoInParole(prossimo.quando))
  let numero = '—'
  if (dati && !prossimo) numero = '+'
  else if (prossimo) numero = vicino ? giornoInParole(prossimo.quando) : `${foglietto(prossimo.quando).giorno} ${foglietto(prossimo.quando).mese}`
  return (
    <div>
      <Collegamento a={`/anziano/${anzianoId}/appuntamenti`} className="riquadro-link">
        <span className={`numero ${numero.length > 3 ? 'numero-parola' : ''}`}>{numero}</span>
        <span>{prossimo ? prossimo.titolo : dati ? 'aggiungi una visita' : 'prossima visita'}</span>
      </Collegamento>
    </div>
  )
}
