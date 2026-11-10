import type { ReactNode } from 'react'
import { CalendarDays, HeartHandshake, Pill } from 'lucide-react'

// Pagine senza login: su computer un pannello colorato a sinistra e il modulo a destra,
// su telefono il logo in alto e il modulo sotto.
export default function LayoutAccesso({ titolo, sottotitolo, children }: { titolo: string; sottotitolo: string; children: ReactNode }) {
  return (
    <div className="accesso">
      <aside className="accesso-pannello">
        <div className="marchio">
          <img src="/icone/icona-192.png" alt="" width={44} height={44} />
          <span>Unicare</span>
        </div>
        <div className="accesso-slogan">
          <h2>Prendersi cura, insieme.</h2>
          <p>Famiglia, badante e nonni nello stesso posto, senza fogli sparsi e messaggi persi.</p>
          <ul>
            <li><Pill size={20} /> Promemoria delle medicine</li>
            <li><CalendarDays size={20} /> Visite e appuntamenti condivisi</li>
            <li><HeartHandshake size={20} /> Richieste di aiuto con un tocco</li>
          </ul>
        </div>
      </aside>
      <main className="accesso-contenuto">
        <div className="accesso-box entra">
          <img className="accesso-logo-mobile" src="/icone/icona-192.png" alt="" width={56} height={56} />
          <h1>{titolo}</h1>
          <p className="sottotitolo">{sottotitolo}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
