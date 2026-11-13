// La "cornice" dell'area riservata: barra di navigazione in basso su telefono, a sinistra su computer.

import type { ReactNode } from 'react'
import { CircleUser, HandHelping, House, UserPlus, Users } from 'lucide-react'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import type { Profilo } from '../comune/api'

type Props = { percorso: string; profilo: Profilo; nomeCerchio?: string; puoInvitare: boolean; children: ReactNode }

export default function Guscio({ percorso, profilo, nomeCerchio, puoInvitare, children }: Props) {
  const voci = [
    { a: '/', etichetta: 'Home', Icona: House },
    { a: '/richieste', etichetta: 'Richieste', Icona: HandHelping },
    { a: '/cerchio', etichetta: 'Cerchio', Icona: Users },
    ...(puoInvitare ? [{ a: '/invita', etichetta: 'Invita', Icona: UserPlus }] : []),
    { a: '/profilo', etichetta: 'Profilo', Icona: CircleUser },
  ]
  return (
    <div className="guscio">
      <header className="barra-alta">
        <Collegamento a="/" className="marchio">
          <img src="/icone/icona-192.png" alt="" width={34} height={34} />
          <span>Unicare</span>
        </Collegamento>
        {nomeCerchio && <span className="pillola-cerchio">{nomeCerchio}</span>}
        <Collegamento a="/profilo" className="barra-avatar"><Avatar nome={profilo.nome} /></Collegamento>
      </header>

      <nav className="navigazione" aria-label="Menu principale">
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
    </div>
  )
}
