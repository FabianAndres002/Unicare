import type { ReactNode } from 'react'
import { CalendarDays, HeartHandshake, Pill } from 'lucide-react'
import { t } from '../comune/lingua'
import ScegliLingua from '../comune/ScegliLingua'

// Pagine senza login: su computer un pannello colorato a sinistra e il modulo a destra,
// su telefono il logo in alto e il modulo sotto.
export default function LayoutAccesso({ titolo, sottotitolo, children }: { titolo: string; sottotitolo: string; children: ReactNode }) {
  return (
    <div className="accesso">
      <aside className="accesso-pannello">
        <div className="marchio">
          <img src="/logo/infinito.svg" alt="" className="marchio-segno" height={44} />
          <span className="marchio-nome"><b>uni</b><i>Care</i></span>
        </div>
        <div className="accesso-slogan">
          <h2>{t('Prendersi cura, insieme.')}</h2>
          <p>{t('Famiglia, badante e nonni nello stesso posto, senza fogli sparsi e messaggi persi.')}</p>
          <ul>
            <li><Pill size={20} />{' '}{t('Promemoria delle medicine')}</li>
            <li><CalendarDays size={20} />{' '}{t('Visite e appuntamenti condivisi')}</li>
            <li><HeartHandshake size={20} />{' '}{t('Richieste di aiuto con un tocco')}</li>
          </ul>
        </div>
      </aside>
      <main className="accesso-contenuto">
        <ScegliLingua className="accesso-lingua" />
        <div className="accesso-box entra">
          <img className="accesso-logo-mobile" src="/logo/infinito.svg" alt="" height={56} />
          <h1>{titolo}</h1>
          <p className="sottotitolo">{sottotitolo}</p>
          {children}
        </div>
      </main>
    </div>
  )
}
