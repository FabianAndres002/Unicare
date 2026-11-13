// Senior App: la versione semplicissima per l'anziano (schermate S1-S4).
// Testo grande, pochi pulsanti enormi, niente menu. Il 112 è sempre in fondo allo schermo.
//
//   /senior          la home: "Chiedi aiuto" e le richieste in corso
//   /senior/chiedi   "Di cosa hai bisogno?" e conferma
//
// Se il telefono non è ancora collegato mostra la schermata del codice a 6 cifre.

import { useState } from 'react'
import { Phone } from 'lucide-react'
import { api, ErroreApi, type SeniorIo } from '../comune/api'
import { usePercorso } from '../comune/router'
import { useCarica } from '../comune/useCarica'
import CodiceSenior from './CodiceSenior'
import HomeSenior from './HomeSenior'
import ChiediAiuto from './ChiediAiuto'

export default function SeniorApp() {
  const percorso = usePercorso()
  // Ogni 20 secondi: così l'anziano vede presto "Maria se ne occupa".
  const { dati, errore, ricarica, setDati } = useCarica<SeniorIo | 'scollegato'>(
    () => api.senior.io().catch((e) => {
      if (e instanceof ErroreApi && e.stato === 401) return 'scollegato' as const
      throw e
    }),
    'senior',
    20,
  )
  const [appenaCollegato, setAppenaCollegato] = useState(false)

  let schermata
  if (dati === null) {
    schermata = errore
      ? <div className="senior-centro"><p className="senior-grande">Non riesco a collegarmi.</p><button className="senior-pulsante" onClick={ricarica}>Riprova</button></div>
      : <div className="senior-centro"><span className="rotella" aria-label="Caricamento" /></div>
  } else if (dati === 'scollegato') {
    schermata = <CodiceSenior onCollegato={async () => { setAppenaCollegato(true); setDati(await api.senior.io()) }} />
  } else if (percorso === '/senior/chiedi') {
    schermata = <ChiediAiuto io={dati} onInviata={ricarica} />
  } else {
    schermata = <HomeSenior io={dati} benvenuto={appenaCollegato} onCambiata={ricarica} />
  }

  return (
    <div className="senior">
      <main className="senior-contenuto">{schermata}</main>
      <a className="senior-112" href="tel:112">
        <Phone size={26} /> Emergenza? Chiama il 112
      </a>
    </div>
  )
}
