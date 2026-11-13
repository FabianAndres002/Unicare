// Il riquadro "medicine oggi" sulla scheda dell'anziano in Home: 2/3 prese, oppure un avviso.

import { api } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'

export default function MedicineOggi({ anzianoId }: { anzianoId: number }) {
  const { dati } = useCarica(() => api.medicine(anzianoId), anzianoId)
  const oggi = dati?.oggi ?? []
  const prese = oggi.filter((o) => o.stato === 'FATTO').length
  const mancate = oggi.some((o) => o.stato === 'NON_CONFERMATO')
  let numero = '—'
  if (dati && dati.promemoria.length === 0) numero = '+'
  else if (oggi.length) numero = `${prese}/${oggi.length}`
  return (
    <div className={mancate ? 'riquadro-allarme' : ''}>
      <Collegamento a={`/anziano/${anzianoId}/medicine`} className="riquadro-link">
        <span className="numero">{numero}</span>
        <span>{mancate ? 'medicina non confermata' : dati?.promemoria.length === 0 ? 'imposta le medicine' : 'medicine oggi'}</span>
      </Collegamento>
    </div>
  )
}
