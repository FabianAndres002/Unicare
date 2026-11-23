// La "cornice" dell'area riservata: barra di navigazione in basso su telefono, a sinistra su computer.

import type { ReactNode } from 'react'
import { BriefcaseBusiness, CircleUser, HandHelping, House, MessagesSquare, UserPlus, Users } from 'lucide-react'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import GuidaIniziale from '../comune/Guida'
import type { Profilo } from '../comune/api'
import { t } from '../comune/lingua'

type Props = { percorso: string; profilo: Profilo; nomeCerchio?: string; puoInvitare: boolean; haCerchio: boolean; children: ReactNode }

export default function Guscio({ percorso, profilo, nomeCerchio, puoInvitare, haCerchio, children }: Props) {
  // La badante ha anche il suo lavoro (profilo e messaggi delle famiglie).
  const voci = profilo.tipo === 'BADANTE' ? [
    { a: '/', etichetta: t('Home'), Icona: House },
    ...(haCerchio ? [{ a: '/richieste', etichetta: t('Richieste'), Icona: HandHelping }] : []),
    { a: '/contatti', etichetta: t('Messaggi'), Icona: MessagesSquare },
    { a: '/lavoro', etichetta: t('Lavoro'), Icona: BriefcaseBusiness },
    { a: '/profilo', etichetta: t('Profilo'), Icona: CircleUser },
  ] : [
    { a: '/', etichetta: t('Home'), Icona: House },
    { a: '/richieste', etichetta: t('Richieste'), Icona: HandHelping },
    { a: '/cerchio', etichetta: t('Cerchio'), Icona: Users },
    ...(puoInvitare ? [{ a: '/invita', etichetta: t('Invita'), Icona: UserPlus }] : []),
    { a: '/profilo', etichetta: t('Profilo'), Icona: CircleUser },
  ]
  return (
    <div className="guscio">
      <header className="barra-alta">
        <Collegamento a="/" className="marchio">
          <img src="/logo/infinito.svg" alt="" className="marchio-segno" height={34} />
          <span className="marchio-nome"><b>uni</b><i>Care</i></span>
        </Collegamento>
        {nomeCerchio && <span className="pillola-cerchio">{nomeCerchio}</span>}
        <Collegamento a="/profilo" className="barra-avatar"><Avatar nome={profilo.nome} foto={profilo.foto} /></Collegamento>
      </header>

      <nav className="navigazione" aria-label={t('Menu principale')}>
        {voci.map(({ a, etichetta, Icona }) => {
          const attiva = a === '/' ? percorso === '/' : percorso.startsWith(a)
          return (
            <Collegamento key={a} a={a} className={`voce ${attiva ? 'attiva' : ''}`} aria-current={attiva ? 'page' : undefined}>
              <Icona size={22} strokeWidth={attiva ? 2.4 : 1.9} />
              <span>{etichetta}</span>
            </Collegamento>
          )
        })}
      </nav>

      <main className="contenuto">{children}</main>
      {/* La visita guidata parte qui: solo dentro l'app vera (non sulla pagina "crea il cerchio"). */}
      <GuidaIniziale tipo={profilo.tipo} vistaAccount={profilo.guidaVista ?? false} />
    </div>
  )
}
