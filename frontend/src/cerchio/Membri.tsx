// Le persone del cerchio e gli inviti in attesa.

import { useState } from 'react'
import { Clock, Trash2, UserPlus, X } from 'lucide-react'
import { api, messaggioErrore, type Cerchio, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import { dataBreve, nomeRuolo } from '../comune/utili'

type Props = { profilo: Profilo; cerchio: Cerchio; onCambiato: () => void }

export default function Membri({ profilo, cerchio, onCambiato }: Props) {
  const [errore, setErrore] = useState<string | null>(null)
  const admin = cerchio.mioRuolo === 'ADMIN'

  async function esegui(azione: () => Promise<void>) {
    setErrore(null)
    try {
      await azione()
      onCambiato()
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
  }

  return (
    <div className="pagina-app entra">
      <header className="intestazione-pagina">
        <h1>{cerchio.nome}</h1>
        <p className="sottotitolo">Le persone che si prendono cura insieme.</p>
      </header>

      {errore && <p className="errore" role="alert">{errore}</p>}

      <ul className="elenco scheda">
        {cerchio.membri.map((m) => (
          <li key={m.id}>
            <Avatar nome={m.nome} cognome={m.cognome} />
            <span className="riga-testo">
              <strong>{m.nome} {m.cognome}{m.id === profilo.id && <span className="tu"> (tu)</span>}</strong>
              <span>{m.email}</span>
            </span>
            <span className={`ruolo ruolo-${m.ruolo.toLowerCase()}`}>{nomeRuolo[m.ruolo]}</span>
            {admin && m.id !== profilo.id && (
              <button className="pulsante-icona tenue" title={`Togli ${m.nome} dal cerchio`}
                onClick={() => confirm(`Togliere ${m.nome} dal cerchio?`) && esegui(() => api.rimuoviMembro(cerchio.id, m.id))}>
                <Trash2 size={18} /><span className="sr-only">Togli {m.nome}</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      {admin && cerchio.invitiInAttesa.length > 0 && (
        <section>
          <div className="titolo-sezione"><h2>Inviti in attesa</h2></div>
          <ul className="elenco scheda">
            {cerchio.invitiInAttesa.map((i) => (
              <li key={i.id}>
                <span className="avatar avatar-attesa"><Clock size={18} /></span>
                <span className="riga-testo">
                  <strong>{i.email}</strong>
                  <span>{nomeRuolo[i.ruolo]} · scade il {dataBreve(i.scadeIl)}</span>
                </span>
                <button className="pulsante-icona tenue" title="Annulla l'invito"
                  onClick={() => esegui(() => api.annullaInvito(i.id))}>
                  <X size={18} /><span className="sr-only">Annulla l'invito a {i.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {admin && (
        <Collegamento a="/invita" className="pulsante con-icona"><UserPlus size={20} /> Invita qualcuno</Collegamento>
      )}
      {!admin && <p className="nota centrato">Solo l'amministratore del cerchio può invitare o togliere persone.</p>}
    </div>
  )
}
