// S2: la home dell'anziano. Un saluto, un pulsante enorme "Chiedi aiuto", i messaggi vocali,
// lo stato delle sue richieste ("Se ne occupa Maria"), gli appuntamenti e le medicine.

import { useEffect, useState } from 'react'
import { Check, Clock, HandHeart, UserRound, X } from 'lucide-react'
import { api, messaggioErrore, type Richiesta, type SeniorIo } from '../comune/api'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import { dataEstesa, saluto } from '../comune/utili'
import { CATEGORIE } from '../richieste/aspetto'
import { statoPerAnziano, titoloRichiesta } from './parole'
import { MedicineAdesso, MedicineDiOggi } from './MedicinaSenior'
import NotificheSenior from './NotificheSenior'
import AppuntamentiSenior from './AppuntamentiSenior'
import MessaggiSenior from './MessaggiSenior'

type Props = { io: SeniorIo; benvenuto: boolean; onCambiata: () => void }

const ICONA_STATO = { APERTA: Clock, PRESA_IN_CARICO: UserRound, COMPLETATA: Check, ANNULLATA: X }

function RichiestaSenior({ r, onCambiata }: { r: Richiesta; onCambiata: () => void }) {
  const [conferma, setConferma] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const { Icona, colore } = CATEGORIE[r.categoria]
  const IconaStato = ICONA_STATO[r.stato]

  async function annulla() {
    try {
      await api.senior.annulla(r.id)
      onCambiata()
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
  }

  return (
    <li className={`senior-richiesta stato-${r.stato.toLowerCase()}`}>
      <div className="senior-richiesta-alto">
        <span className={`funzione-icona ${colore}`}><Icona size={30} /></span>
        <div>
          <strong>{titoloRichiesta(r)}</strong>
          <p><IconaStato size={20} className="senior-icona-stato" /> {statoPerAnziano(r)}</p>
        </div>
      </div>
      {r.azioni.includes('ANNULLA') && (conferma ? (
        <div className="senior-conferma-piccola">
          <span>Non serve più?</span>
          <button className="senior-pulsante piccolo" onClick={annulla}>Sì, annulla</button>
          <button className="senior-pulsante piccolo chiaro" onClick={() => setConferma(false)}>No</button>
        </div>
      ) : (
        <button className="senior-link" onClick={() => setConferma(true)}>Non serve più</button>
      ))}
      {errore && <p className="senior-errore">{errore}</p>}
    </li>
  )
}

export default function HomeSenior({ io, benvenuto, onCambiata }: Props) {
  const [oggi] = useState(() => new Date())
  // "Adesso" avanza ogni 15 secondi, così la scheda delle medicine compare all'orario giusto.
  const [adesso, setAdesso] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setAdesso(Date.now()), 15_000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="senior-pagina entra">
      <header>
        <p className="senior-data">{dataEstesa(oggi)}</p>
        <h1>{saluto()}, {io.anziano.nome}</h1>
      </header>

      {benvenuto && (
        <p className="senior-avviso"><Check size={24} /> Il telefono è collegato. Quando ti serve qualcosa, tocca il pulsante qui sotto.</p>
      )}

      <MedicineAdesso medicine={io.medicine} adesso={adesso} onCambiata={onCambiata} />

      <Collegamento a="/senior/chiedi" className="senior-chiedi">
        <HandHeart size={56} strokeWidth={1.8} />
        <span>Chiedi aiuto</span>
      </Collegamento>

      <MessaggiSenior vocali={io.vocali} onCambiata={onCambiata} />

      {io.richieste.length > 0 && (
        <section>
          <h2>Le tue richieste</h2>
          <ul className="senior-elenco">
            {io.richieste.map((r) => <RichiestaSenior key={r.id} r={r} onCambiata={onCambiata} />)}
          </ul>
        </section>
      )}

      <AppuntamentiSenior appuntamenti={io.appuntamenti} />

      <MedicineDiOggi medicine={io.medicine} />

      <NotificheSenior />

      <section>
        <h2>La tua famiglia</h2>
        <ul className="senior-famiglia">
          {io.famiglia.map((f, i) => (
            <li key={i}><Avatar nome={f.nome} /> <span>{f.nome}{f.ruolo === 'BADANTE' && <small> · badante</small>}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
