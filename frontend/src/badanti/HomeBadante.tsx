// La Home di una badante che non fa ancora parte di un cerchio:
// il suo profilo ("Mi propongo"), i messaggi delle famiglie e come entrare in un cerchio.

import { useState } from 'react'
import { ChevronRight, Eye, EyeOff, HeartHandshake, Megaphone, MessagesSquare } from 'lucide-react'
import { api, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import Avatar from '../comune/Avatar'
import { dataEstesa, saluto, tempoFa } from '../comune/utili'

export default function HomeBadante({ profilo }: { profilo: Profilo }) {
  const { dati: mio } = useCarica(() => api.mioProfiloBadante(), 'mio-profilo', 300)
  const { dati: conversazioni } = useCarica(() => api.conversazioni(), 'conversazioni', 30)
  const nonLetti = conversazioni?.reduce((n, c) => n + c.nonLetti, 0) ?? 0
  const p = mio?.profilo
  const [oggi] = useState(() => new Date())

  return (
    <div className="pagina-app entra">
      <header className="saluto">
        <p className="data-oggi">{dataEstesa(oggi)}</p>
        <h1>{saluto()}, {profilo.nome}</h1>
      </header>

      {mio && !p && (
        <Collegamento a="/lavoro" className="scheda-proponiti">
          <Megaphone size={30} />
          <span><strong>Proponiti alle famiglie</strong><br />Compila il tuo profilo in 3 minuti: le famiglie della tua zona ti trovano e ti scrivono.</span>
          <ChevronRight size={22} />
        </Collegamento>
      )}
      {p && (
        <Collegamento a="/lavoro" className="scheda riga-cerchio">
          <span className={`funzione-icona ${p.visibile ? 'verde' : 'grigio'}`}>{p.visibile ? <Eye size={22} /> : <EyeOff size={22} />}</span>
          <span className="riga-testo">
            <strong>{p.visibile ? 'Ti stai proponendo' : 'Profilo nascosto'}</strong>
            <span>{p.visibile ? `Le famiglie di ${p.comune} e dintorni ti vedono` : 'Accendi “Mi propongo” per farti trovare'}</span>
          </span>
          <ChevronRight size={20} />
        </Collegamento>
      )}

      <section>
        <div className="titolo-sezione">
          <h2>Messaggi delle famiglie</h2>
          {nonLetti > 0 && <span className="distintivo urgente">{nonLetti} {nonLetti === 1 ? 'nuovo' : 'nuovi'}</span>}
          <Collegamento a="/contatti" className="link-sezione">Vedi tutti</Collegamento>
        </div>
        {conversazioni && conversazioni.length === 0 && <p className="nota">Ancora nessun messaggio.</p>}
        {conversazioni && conversazioni.length > 0 && (
          <ul className="elenco scheda">
            {conversazioni.slice(0, 3).map((c) => (
              <li key={c.id}>
                <Collegamento a={`/contatti/${c.id}`} className="riga-scelta">
                  <Avatar nome={c.altro.nome} cognome={c.altro.cognome} />
                  <span className="riga-testo"><strong>{c.altro.nome} {c.altro.cognome}</strong><span>{c.ultimoTesto}</span></span>
                  <span className="conversazione-destra">
                    <small>{tempoFa(c.ultimoIl)}</small>
                    {c.nonLetti > 0 ? <span className="distintivo urgente">{c.nonLetti}</span> : <MessagesSquare size={16} />}
                  </span>
                </Collegamento>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="scheda riga-cerchio">
        <span className="funzione-icona arancio"><HeartHandshake size={22} /></span>
        <span className="riga-testo testo-a-capo">
          <strong>Lavori già con una famiglia?</strong>
          <span>Chiedi di invitarti con l’email {profilo.email}, oppure ti mandano l’invito qui nei messaggi. Così vedrai richieste, appuntamenti e promemoria.</span>
        </span>
      </div>
    </div>
  )
}
