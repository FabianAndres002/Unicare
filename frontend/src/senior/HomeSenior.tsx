// S2: la home dell'anziano. Un saluto, un pulsante enorme "Chiedi aiuto", i messaggi vocali,
// lo stato delle sue richieste ("Se ne occupa Maria"), gli appuntamenti e le medicine.

import { useEffect, useState } from 'react'
import { Check, CircleHelp, Clock, HandHeart, Languages, Phone, UserRound, X } from 'lucide-react'
import { apriGuida } from '../comune/guidaEventi'
import { api, messaggioErrore, type Richiesta, type SeniorIo } from '../comune/api'
import { Collegamento } from '../comune/router'
import Avatar from '../comune/Avatar'
import { dataEstesa, saluto } from '../comune/utili'
import { CATEGORIE } from '../richieste/aspetto'
import { statoPerAnziano, titoloRichiesta } from './parole'
import { MedicineAdesso, MedicineDiOggi } from './MedicinaSenior'
import ScegliLingua from '../comune/ScegliLingua'
import NotificheSenior from './NotificheSenior'
import AppuntamentiSenior from './AppuntamentiSenior'
import MessaggiSenior from './MessaggiSenior'
import { t } from '../comune/lingua'

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
          <span>{t('Non serve più?')}</span>
          <button className="senior-pulsante piccolo" onClick={annulla}>{t('Sì, annulla')}</button>
          <button className="senior-pulsante piccolo chiaro" onClick={() => setConferma(false)}>{t('No')}</button>
        </div>
      ) : (
        <button className="senior-link" onClick={() => setConferma(true)}>{t('Non serve più')}</button>
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
  // Prima i familiari, poi la badante (l'ordine arriva già così dal server).
  const chiamabili = io.famiglia.filter((f) => f.telefono)
  return (
    <div className="senior-pagina entra">
      <header>
        <p className="senior-data">{dataEstesa(oggi)}</p>
        <h1>{saluto()}, {io.anziano.nome}</h1>
      </header>

      {benvenuto && (
        <p className="senior-avviso"><Check size={24} />{' '}{t('Il telefono è collegato. Quando ti serve qualcosa, tocca il pulsante qui sotto.')}</p>
      )}

      <MedicineAdesso nome={io.anziano.nome} medicine={io.medicine} adesso={adesso} onCambiata={onCambiata} />

      <Collegamento a="/senior/chiedi" className="senior-chiedi">
        <HandHeart size={56} strokeWidth={1.8} />
        <span>{t('Chiedi aiuto')}</span>
      </Collegamento>

      {chiamabili.length > 0 && (
        <section className="senior-chiamate" aria-label={t('Chiama')}>
          {chiamabili.map((f, i) => (
            <a key={i} href={`tel:${f.telefono}`} className="senior-chiama">
              <Avatar nome={f.nome} foto={f.foto} />
              <span>{t('Chiama')}{' '}{f.nome}{f.ruolo === 'BADANTE' && <small>{t('la badante')}</small>}</span>
              <span className="senior-chiama-icona"><Phone size={30} /></span>
            </a>
          ))}
        </section>
      )}

      <MessaggiSenior vocali={io.vocali} onCambiata={onCambiata} />

      <Collegamento a="/senior/interprete" className="senior-interprete">
        <Languages size={34} />
        <span>{t('Parla con la badante')}<small>{t('nella sua lingua')}</small></span>
      </Collegamento>

      {io.richieste.length > 0 && (
        <section>
          <h2>{t('Le tue richieste')}</h2>
          <ul className="senior-elenco">
            {io.richieste.map((r) => <RichiestaSenior key={r.id} r={r} onCambiata={onCambiata} />)}
          </ul>
        </section>
      )}

      <AppuntamentiSenior appuntamenti={io.appuntamenti} />

      <MedicineDiOggi medicine={io.medicine} />

      <NotificheSenior />

      <section className="senior-lingua">
        <h2>{t('Lingua')}</h2>
        <ScegliLingua grande className="sinistra" salva={(l) => api.senior.lingua(l)} />
      </section>

      <button type="button" className="senior-ascolta" onClick={apriGuida}><CircleHelp size={26} />{' '}{t('Come funziona? Rivedi la guida')}</button>

      <section>
        <h2>{t('La tua famiglia')}</h2>
        <ul className="senior-famiglia">
          {io.famiglia.map((f, i) => (
            <li key={i}><Avatar nome={f.nome} foto={f.foto} /> <span>{f.nome}{f.ruolo === 'BADANTE' && <small>{' '}{t('· badante')}</small>}</span></li>
          ))}
        </ul>
      </section>
    </div>
  )
}
