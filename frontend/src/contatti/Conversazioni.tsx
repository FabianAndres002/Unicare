// Le conversazioni tra famiglie e badanti.

import { ChevronRight, MessagesSquare } from 'lucide-react'
import { api, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import Avatar from '../comune/Avatar'
import { tempoFa } from '../comune/utili'

export default function Conversazioni({ profilo }: { profilo: Profilo }) {
  const { dati, errore } = useCarica(() => api.conversazioni(), 'conversazioni', 20)
  const badante = profilo.tipo === 'BADANTE'
  return (
    <div className="pagina-app entra">
      <header className="intestazione-pagina">
        <h1>Messaggi</h1>
        <p className="sottotitolo">{badante ? 'Le famiglie che ti hanno scritto.' : 'Le badanti a cui hai scritto.'}</p>
      </header>
      {errore && <p className="errore">{errore}</p>}
      {!dati && !errore && <span className="rotella" aria-label="Caricamento" />}
      {dati && dati.length === 0 && (
        <div className="scheda vuoto">
          <MessagesSquare size={28} />
          <p>{badante ? 'Ancora nessun messaggio. Accendi “Mi propongo” nel tuo profilo per farti trovare.' : 'Ancora nessuna conversazione.'}</p>
          {!badante && <Collegamento a="/badanti" className="pulsante piccolo">Trova una badante</Collegamento>}
        </div>
      )}
      {dati && dati.length > 0 && (
        <ul className="elenco scheda">
          {dati.map((c) => (
            <li key={c.id}>
              <Collegamento a={`/contatti/${c.id}`} className="riga-scelta">
                <Avatar nome={c.altro.nome} cognome={c.altro.cognome} />
                <span className="riga-testo">
                  <strong>{c.altro.nome} {c.altro.cognome}{c.bloccato && <span className="nota"> · chiusa</span>}</strong>
                  <span>{c.ultimoTesto}</span>
                </span>
                <span className="conversazione-destra">
                  <small>{tempoFa(c.ultimoIl)}</small>
                  {c.nonLetti > 0 ? <span className="distintivo urgente">{c.nonLetti}</span> : <ChevronRight size={18} />}
                </span>
              </Collegamento>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
