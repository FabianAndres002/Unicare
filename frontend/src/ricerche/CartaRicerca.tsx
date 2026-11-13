// Una ricerca "cerco una badante" in breve: dove, quando, cosa serve.

import { Clock, MapPin } from 'lucide-react'
import type { RicercaPubblica } from '../comune/api'
import { tempoFa } from '../comune/utili'
import { DISPONIBILITA, SERVIZI, nomeProvincia } from '../badanti/aspetto'

type Props = { r: Omit<RicercaPubblica, 'miaProposta' | 'id' | 'creataIl' | 'chiusa'> & { creataIl?: string }; breve?: boolean }

export default function CartaRicerca({ r, breve }: Props) {
  return (
    <div className="carta-ricerca">
      <div className="carta-ricerca-alto">
        <strong className="con-icona-piccola"><MapPin size={16} /> {r.comune} ({nomeProvincia(r.provincia)})</strong>
        {r.creataIl && <small>{tempoFa(r.creataIl)}</small>}
      </div>
      {r.orario && <span className="con-icona-piccola"><Clock size={14} /> {r.orario}</span>}
      <p className={`carta-badante-testo ${breve ? 'breve' : ''}`}>{r.descrizione}</p>
      {(r.disponibilita.length > 0 || r.servizi.length > 0) && (
        <div className="chip-elenco">
          {r.disponibilita.map((d) => <span key={d} className="chip forte">{DISPONIBILITA[d]}</span>)}
          {r.servizi.map((s) => <span key={s} className="chip">{SERVIZI[s]}</span>)}
        </div>
      )}
    </div>
  )
}
