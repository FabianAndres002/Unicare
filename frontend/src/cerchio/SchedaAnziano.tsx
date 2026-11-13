// Aggiunge o modifica la scheda della persona assistita.

import { ArrowLeft } from 'lucide-react'
import { api, type Cerchio } from '../comune/api'
import { Collegamento, naviga } from '../comune/router'
import ModuloAnziano from './ModuloAnziano'
import TelefonoAnziano from './TelefonoAnziano'
import EliminaScheda from './EliminaScheda'

type Props = { cerchio: Cerchio; anzianoId: number | 'nuovo'; onCambiato: () => void }

export default function SchedaAnziano({ cerchio, anzianoId, onCambiato }: Props) {
  const anziano = anzianoId === 'nuovo' ? undefined : cerchio.anziani.find((a) => a.id === anzianoId)
  if (cerchio.mioRuolo === 'BADANTE' || (anzianoId !== 'nuovo' && !anziano)) {
    return <div className="pagina-app"><p className="nota">Scheda non disponibile.</p></div>
  }
  return (
    <div className="pagina-app entra">
      <Collegamento a="/" className="indietro"><ArrowLeft size={18} /> Home</Collegamento>
      <header className="intestazione-pagina">
        <h1>{anziano ? `${anziano.nome} ${anziano.cognome}` : 'Nuova scheda'}</h1>
        <p className="sottotitolo">Solo dati utili all'organizzazione. I documenti sanitari stanno nella sezione Documenti.</p>
      </header>
      {anziano && <TelefonoAnziano anziano={anziano} />}
      {anziano && <div className="titolo-sezione"><h2>I dati di {anziano.nome}</h2></div>}
      <div className="scheda">
        <ModuloAnziano
          key={anzianoId}
          nuovo={!anziano}
          iniziale={anziano}
          testoPulsante={anziano ? 'Salva le modifiche' : 'Crea la scheda'}
          onSalva={async (dati) => {
            if (anziano) await api.modificaAnziano(anziano.id, dati)
            else await api.aggiungiAnziano(cerchio.id, dati)
            onCambiato()
            naviga('/')
          }}
        />
      </div>
      {anziano && cerchio.mioRuolo === 'ADMIN' && (
        <EliminaScheda anziano={anziano} onEliminata={() => { onCambiato(); naviga('/') }} />
      )}
    </div>
  )
}
