// La casella "Messaggi vocali" in Home, con quanti messaggi dell'anziano nessuno ha ancora ascoltato.

import { Mic } from 'lucide-react'
import { api, type Anziano } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'

export default function MessaggiFunzione({ anziano }: { anziano: Anziano }) {
  const { dati } = useCarica(() => api.vocali(anziano.id), anziano.id, 30)
  const nuovi = dati?.filter((v) => v.dallAnziano && !v.ascoltatoDa).length ?? 0
  return (
    <Collegamento a={`/anziano/${anziano.id}/messaggi`} className={`funzione ${nuovi ? 'con-novita' : ''}`}>
      <span className="funzione-icona arancio"><Mic size={22} /></span>
      {nuovi > 0 && <span className="distintivo urgente funzione-distintivo">{nuovi} {nuovi === 1 ? 'nuovo' : 'nuovi'}</span>}
      <strong>Messaggi vocali</strong>
      <span>{nuovi ? `${anziano.nome} ti ha scritto con la voce` : `Da e per ${anziano.nome}`}</span>
    </Collegamento>
  )
}
