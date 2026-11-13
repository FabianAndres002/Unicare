// S6: i prossimi appuntamenti nella Senior App: quando, dove e chi ti accompagna.

import { Car, MapPin } from 'lucide-react'
import type { Appuntamento } from '../comune/api'
import { foglietto, giornoInParole, oraAppuntamento } from '../appuntamenti/aspetto'

export default function AppuntamentiSenior({ appuntamenti }: { appuntamenti: Appuntamento[] }) {
  if (!appuntamenti.length) return null
  return (
    <section>
      <h2>I tuoi appuntamenti</h2>
      <ul className="senior-appuntamenti">
        {appuntamenti.map((a) => {
          const giorno = giornoInParole(a.quando)
          const f = foglietto(a.quando)
          return (
            <li key={a.id} className={giorno === 'Oggi' ? 'oggi' : ''}>
              <span className="foglietto grande" aria-hidden="true"><small>{f.settimana}</small><strong>{f.giorno}</strong><small>{f.mese}</small></span>
              <div>
                <p className="senior-quando">{giorno} alle {oraAppuntamento(a.quando)}</p>
                <strong>{a.titolo}</strong>
                {a.luogo && <p><MapPin size={18} /> {a.luogo}</p>}
                {a.accompagna && <p className="senior-accompagna"><Car size={18} /> Ti accompagna {a.accompagna}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
