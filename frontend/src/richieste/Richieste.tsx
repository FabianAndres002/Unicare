// Elenco delle richieste di aiuto del cerchio: "Attive" e "Concluse".

import { useState } from 'react'
import { CheckCircle2, Clock, HandHeart, Inbox, Plus } from 'lucide-react'
import { api, type Cerchio, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { useDiretta } from '../comune/diretta'
import SchedaRichiesta from './SchedaRichiesta'

export default function Richieste({ profilo, cerchio }: { profilo: Profilo; cerchio: Cerchio }) {
  const [vista, setVista] = useState<'attive' | 'concluse'>('attive')
  const { dati, errore, ricarica } = useCarica(() => api.richieste(cerchio.id, vista), `${cerchio.id}-${vista}`)
  // Quando qualcuno crea, prende o chiude una richiesta, l'elenco si aggiorna da solo.
  const { dati: attive, ricarica: ricaricaAttive } = useCarica(() => api.richieste(cerchio.id, 'attive'), `${cerchio.id}-conto`)
  useDiretta('/api/diretta', 'richiesta', ricarica)
  const { dati: concluse, ricarica: ricaricaConcluse } = useCarica(() => api.richieste(cerchio.id, 'concluse'), `${cerchio.id}-fatte`)
  useDiretta('/api/diretta', 'richiesta', ricaricaAttive)
  useDiretta('/api/diretta', 'richiesta', ricaricaConcluse)
  const fatte = concluse?.filter((x) => x.stato === 'COMPLETATA').length
  const daFare = attive?.filter((x) => x.stato === 'APERTA').length ?? 0
  const inCorso = attive?.filter((x) => x.stato === 'PRESA_IN_CARICO').length ?? 0

  return (
    <div className="pagina-app entra">
      <header className="richieste-palco">
        <span className="rete-stella s1" aria-hidden="true" />
        <span className="rete-stella s2" aria-hidden="true" />
        <div className="richieste-palco-titolo">
          <span className="richieste-palco-icona"><HandHeart size={26} /></span>
          <div>
            <h1>Richieste di aiuto</h1>
            <p>Chi ha bisogno di cosa, e chi se ne occupa.</p>
          </div>
        </div>
        <div className="richieste-conti">
          <div className={`richieste-conto da-fare ${daFare ? 'acceso' : ''}`}><Inbox size={18} /><strong>{attive ? daFare : '–'}</strong><span>da fare</span></div>
          <div className="richieste-conto in-corso"><Clock size={18} /><strong>{attive ? inCorso : '–'}</strong><span>in corso</span></div>
          <div className="richieste-conto tutto-ok"><CheckCircle2 size={18} /><strong>{fatte ?? '–'}</strong><span>{fatte === 1 ? 'fatta' : 'fatte'}</span></div>
        </div>
        {cerchio.anziani.length > 0 && (
          <Collegamento a="/richieste/nuova" className="richieste-nuova"><Plus size={20} /> Nuova richiesta</Collegamento>
        )}
      </header>

      <div className={`schede-vista scorrevole ${vista}`} role="tablist">
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
          {dati.map((r, i) => <SchedaRichiesta key={r.id} richiesta={r} indice={i} mioId={profilo.id} onCambiata={ricarica} />)}
        </div>
      )}
    </div>
  )
}
