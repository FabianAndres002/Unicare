// Le persone del cerchio come una rete (al centro chi è assistito) e i dettagli di chi tocchi.

import { useState } from 'react'
import { Clock, IdCard, Pill, Trash2, UserPlus, X } from 'lucide-react'
import ReteCerchio, { type Scelta } from './ReteCerchio'
import { api, messaggioErrore, type Cerchio, type Profilo } from '../comune/api'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import { dataBreve, eta, nomeRuolo } from '../comune/utili'

type Props = { profilo: Profilo; cerchio: Cerchio; onCambiato: () => void }

export default function Membri({ profilo, cerchio, onCambiato }: Props) {
  const [errore, setErrore] = useState<string | null>(null)
  const admin = cerchio.mioRuolo === 'ADMIN'
  // All'inizio è scelta la persona assistita, al centro della rete.
  const [scelta, setScelta] = useState<Scelta | null>(cerchio.anziani[0] ? { tipo: 'anziano', id: cerchio.anziani[0].id } : null)
  const anzianoScelto = scelta?.tipo === 'anziano' ? cerchio.anziani.find((a) => a.id === scelta.id) : undefined
  const membroScelto = scelta?.tipo === 'membro' ? cerchio.membri.find((m) => m.id === scelta.id) : undefined
  const invitoScelto = scelta?.tipo === 'invito' ? cerchio.invitiInAttesa.find((i) => i.id === scelta.id) : undefined
  const anni = anzianoScelto ? eta(anzianoScelto.dataNascita) : null

  async function esegui(azione: () => Promise<void>, deseleziona = false) {
    setErrore(null)
    try {
      await azione()
      if (deseleziona) setScelta(null)
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

      <ReteCerchio anziani={cerchio.anziani} membri={cerchio.membri} inviti={cerchio.invitiInAttesa} mioId={profilo.id}
        puoInvitare={admin} scelta={scelta} onScegli={setScelta} />

      <ul className="rete-legenda" aria-label="Legenda">
        <li><span className="segno familiare" /> Familiari</li>
        <li><span className="segno badante" /> Badante</li>
        {admin && cerchio.invitiInAttesa.length > 0 && <li><span className="segno attesa" /> Invito in attesa</li>}
      </ul>

      {anzianoScelto && (
        <section className="scheda rete-dettaglio entra" aria-live="polite">
          <div className="rete-dettaglio-alto">
            <Avatar nome={anzianoScelto.nome} cognome={anzianoScelto.cognome} grande />
            <div>
              <h2>{anzianoScelto.nome} {anzianoScelto.cognome}</h2>
              <p className="sottotitolo">
                La persona assistita{anni !== null && ` · ${anni} anni`}{anzianoScelto.comune && ` · ${anzianoScelto.comune}`}
              </p>
            </div>
          </div>
          <div className="rete-azioni">
            <Collegamento a={`/anziano/${anzianoScelto.id}`} className="pulsante con-icona secondario"><IdCard size={18} /> La scheda</Collegamento>
            <Collegamento a={`/anziano/${anzianoScelto.id}/medicine`} className="pulsante con-icona secondario"><Pill size={18} /> Le medicine</Collegamento>
          </div>
        </section>
      )}

      {membroScelto && (
        <section className="scheda rete-dettaglio entra" aria-live="polite">
          <div className="rete-dettaglio-alto">
            <Avatar nome={membroScelto.nome} cognome={membroScelto.cognome} grande />
            <div>
              <h2>{membroScelto.nome} {membroScelto.cognome}{membroScelto.id === profilo.id && <span className="tu"> (tu)</span>}</h2>
              <p className="sottotitolo">{membroScelto.email}</p>
              <span className={`ruolo ruolo-${membroScelto.ruolo.toLowerCase()}`}>{nomeRuolo[membroScelto.ruolo]}</span>
            </div>
          </div>
          {admin && membroScelto.id !== profilo.id && (
            <button className="pulsante-testo pericolo con-icona"
              onClick={() => confirm(`Togliere ${membroScelto.nome} dal cerchio?`) && esegui(() => api.rimuoviMembro(cerchio.id, membroScelto.id), true)}>
              <Trash2 size={18} /> Togli {membroScelto.nome} dal cerchio
            </button>
          )}
        </section>
      )}

      {invitoScelto && (
        <section className="scheda rete-dettaglio entra" aria-live="polite">
          <div className="rete-dettaglio-alto">
            <span className="avatar avatar-grande avatar-attesa"><Clock size={26} /></span>
            <div>
              <h2>{invitoScelto.email}</h2>
              <p className="sottotitolo">{nomeRuolo[invitoScelto.ruolo]} · invito in attesa, scade il {dataBreve(invitoScelto.scadeIl)}</p>
            </div>
          </div>
          <button className="pulsante-testo pericolo con-icona" onClick={() => esegui(() => api.annullaInvito(invitoScelto.id), true)}>
            <X size={18} /> Annulla l&apos;invito
          </button>
        </section>
      )}

      {admin && (
        <Collegamento a="/invita" className="pulsante con-icona"><UserPlus size={20} /> Invita qualcuno</Collegamento>
      )}
      {!admin && <p className="nota centrato">Solo l'amministratore del cerchio può invitare o togliere persone.</p>}
    </div>
  )
}
