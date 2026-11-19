// Senior App: la versione semplicissima per l'anziano (schermate S1-S4).
// Testo grande, pochi pulsanti enormi, niente menu. Il 118 è sempre in fondo allo schermo.
//
//   /senior          la home: "Chiedi aiuto" e le richieste in corso
//   /senior/chiedi   "Di cosa hai bisogno?" e conferma
//   /senior/interprete   parlare con la badante nella sua lingua
//   /senior/aggiungi     un'altra persona su questo telefono (due nonni, un telefono)
//
// Se il telefono non è ancora collegato mostra la schermata del codice a 6 cifre.

import { useEffect, useState } from 'react'
import { Phone } from 'lucide-react'
import { api, ErroreApi, type SeniorIo } from '../comune/api'
import { usePercorso } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import { useDiretta } from '../comune/diretta'
import CodiceSenior from './CodiceSenior'
import { conPersona, personaScelta, scegliPersona } from './persona'
import { naviga } from '../comune/router'
import HomeSenior from './HomeSenior'
import GuidaIniziale from '../comune/Guida'
import ChiediAiuto from './ChiediAiuto'
import InterpreteSenior from '../interprete/InterpreteSenior'
import { lingua, t } from '../comune/lingua'

export default function SeniorApp() {
  const percorso = usePercorso()
  // Quale dei nonni collegati a questo telefono sta usando l'app.
  const [persona, setPersona] = useState(personaScelta)
  // Ogni 20 secondi: così l'anziano vede presto "Maria se ne occupa".
  const { dati, errore, ricarica, setDati } = useCarica<SeniorIo | 'scollegato'>(
    () => api.senior.io().catch((e) => {
      if (e instanceof ErroreApi && e.stato === 401) return 'scollegato' as const
      throw e
    }),
    `senior-${persona}`,
    20,
  )
  function cambiaPersona(id: number) {
    scegliPersona(id)
    setPersona(id)
  }
  // Se la persona ricordata non è più su questo telefono, il server risponde con la prima.
  const personaServer = dati && dati !== 'scollegato' ? dati.anziano.id : null
  useEffect(() => {
    if (personaServer && personaServer !== personaScelta()) scegliPersona(personaServer)
  }, [personaServer])
  // Appena qualcuno risponde a una richiesta, la Home lo mostra (solo se il telefono è collegato).
  useDiretta(dati && dati !== 'scollegato' ? conPersona('/api/senior/diretta') : null, 'richiesta', ricarica)
  const [appenaCollegato, setAppenaCollegato] = useState(false)
  // Le notifiche di questo telefono arrivano nella lingua scelta qui.
  const linguaServer = dati && dati !== 'scollegato' ? dati.lingua : null
  useEffect(() => {
    if (linguaServer && linguaServer !== lingua()) api.senior.lingua(lingua()).catch(() => {})
  }, [linguaServer])

  let schermata
  if (dati === null) {
    schermata = errore
      ? <div className="senior-centro"><p className="senior-grande">{t('Non riesco a collegarmi.')}</p><button className="senior-pulsante" onClick={ricarica}>{t('Riprova')}</button></div>
      : <div className="senior-centro"><span className="rotella" aria-label={t('Caricamento')} /></div>
  } else if (dati === 'scollegato') {
    schermata = <CodiceSenior onCollegato={async (id) => { cambiaPersona(id); setAppenaCollegato(true); setDati(await api.senior.io()) }} />
  } else if (percorso === '/senior/aggiungi') {
    schermata = <CodiceSenior aggiungi onCollegato={(id) => { cambiaPersona(id); setAppenaCollegato(true); naviga('/senior') }} />
  } else if (percorso === '/senior/interprete') {
    schermata = <InterpreteSenior />
  } else if (percorso === '/senior/chiedi') {
    schermata = <ChiediAiuto io={dati} onInviata={ricarica} />
  } else {
    schermata = <HomeSenior io={dati} benvenuto={appenaCollegato} onCambiata={ricarica} onPersona={cambiaPersona} />
  }

  return (
    <div className="senior">
      <main className="senior-contenuto">{schermata}</main>
      {typeof dati === 'object' && dati !== null && <GuidaIniziale tipo="SENIOR" />}
      <a className="senior-112" href="tel:118">
        <Phone size={26} />{' '}{t('Emergenza? Chiama il 118')}
      </a>
    </div>
  )
}
