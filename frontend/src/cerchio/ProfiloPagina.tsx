// Il tuo account, i tuoi cerchi (per passare dall'uno all'altro) e il pulsante per uscire.

import { Check, LogOut, Plus } from 'lucide-react'
import type { Profilo, RiassuntoCerchio } from '../comune/api'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import { nomeRuolo } from '../comune/utili'

type Props = {
  profilo: Profilo
  cerchi: RiassuntoCerchio[]
  attivo: number
  onScegli: (id: number) => void
  onEsci: () => void
}

export default function ProfiloPagina({ profilo, cerchi, attivo, onScegli, onEsci }: Props) {
  return (
    <div className="pagina-app entra">
      <div className="profilo-testa">
        <Avatar nome={profilo.nome} grande />
        <h1>{profilo.nome}</h1>
        <p className="sottotitolo">{profilo.email} · {profilo.tipo === 'FAMILIARE' ? 'familiare' : 'badante'}</p>
      </div>

      <section>
        <div className="titolo-sezione"><h2>I tuoi cerchi</h2></div>
        <ul className="elenco scheda">
          {cerchi.map((c) => (
            <li key={c.id}>
              <button className="riga-scelta" onClick={() => onScegli(c.id)}>
                <span className="riga-testo">
                  <strong>{c.nome}</strong>
                  <span>{nomeRuolo[c.mioRuolo]} · {c.numeroMembri} {c.numeroMembri === 1 ? 'persona' : 'persone'}</span>
                </span>
                {c.id === attivo && <Check size={20} className="spunta" />}
              </button>
            </li>
          ))}
        </ul>
        {profilo.tipo === 'FAMILIARE' && (
          <Collegamento a="/cerchio/nuovo" className="pulsante fantasma con-icona"><Plus size={20} /> Crea un altro cerchio</Collegamento>
        )}
      </section>

      <button className="pulsante secondario con-icona" onClick={onEsci}><LogOut size={20} /> Esci</button>
    </div>
  )
}
