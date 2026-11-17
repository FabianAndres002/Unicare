// La casella "Messaggi vocali" in Home, con quanti messaggi dell'anziano nessuno ha ancora ascoltato.

import { Mic } from 'lucide-react'
import { api, type Anziano } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { t } from '../comune/lingua'

export default function MessaggiFunzione({ anziano }: { anziano: Anziano }) {
  const { dati } = useCarica(() => api.vocali(anziano.id), anziano.id, 30)
  const nuovi = dati?.filter((v) => v.dallAnziano && !v.ascoltatoDa).length ?? 0
  return (
    <Collegamento a={`/anziano/${anziano.id}/messaggi`} className={`funzione cat-farmacia ${nuovi ? 'con-novita' : ''}`}>
      <span className="funzione-icona arancio"><Mic size={22} /></span>
      {nuovi > 0 && <span className="distintivo urgente funzione-distintivo">{nuovi} {nuovi === 1 ? t('nuovo') : t('nuovi')}</span>}
      <strong>{t('Messaggi vocali')}</strong>
      <span>{nuovi ? t('{0} ti ha scritto con la voce', anziano.nome) : t('Da e per {0}', anziano.nome)}</span>
    </Collegamento>
  )
}
