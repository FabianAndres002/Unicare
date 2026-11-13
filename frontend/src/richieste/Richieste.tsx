// Elenco delle richieste di aiuto del cerchio: "Attive" e "Concluse".

import { useState } from 'react'
import { Inbox, Plus } from 'lucide-react'
import { api, type Cerchio, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import SchedaRichiesta from './SchedaRichiesta'

export default function Richieste({ profilo, cerchio }: { profilo: Profilo; cerchio: Cerchio }) {
  const [vista, setVista] = useState<'attive' | 'concluse'>('attive')
  const { dati, errore, ricarica } = useCarica(() => api.richieste(cerchio.id, vista), `${cerchio.id}-${vista}`)

  return (
    <div className="pagina-app entra">
      <header className="intestazione-pagina con-azione">
        <div>
          <h1>Richieste di aiuto</h1>
          <p className="sottotitolo">Chi ha bisogno di cosa, e chi se ne occupa.</p>
        </div>
      </header>

      {cerchio.anziani.length > 0 && (
        <Collegamento a="/richieste/nuova" className="pulsante con-icona"><Plus size={20} /> Nuova richiesta</Collegamento>
      )}

      <div className="schede-vista" role="tablist">
        {(['attive', 'concluse'] as const).map((v) => (
          <button key={v} role="tab" aria-selected={vista === v} className={vista === v ? 'attiva' : ''} onClick={() => setVista(v)}>
            {v === 'attive' ? 'Attive' : 'Concluse'}
          </button>
        ))}
      </div>

      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <div className="centrato"><span className="rotella" aria-label="Caricamento" /></div>}
      {dati && dati.length === 0 && (
        <div className="vuoto">
          <Inbox size={36} />
          <p>{vista === 'attive' ? 'Nessuna richiesta in sospeso. Tutto tranquillo!' : 'Qui compariranno le richieste completate o annullate.'}</p>
        </div>
      )}
      {dati && dati.length > 0 && (
        <div className="elenco-richieste">
          {dati.map((r) => <SchedaRichiesta key={r.id} richiesta={r} mioId={profilo.id} onCambiata={ricarica} />)}
        </div>
      )}
    </div>
  )
}
