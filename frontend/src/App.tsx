import { useEffect, useState } from 'react'
import { api, type Profilo } from './comune/api'
import Accedi from './accesso/Accedi'
import Registrati from './accesso/Registrati'
import Benvenuto from './accesso/Benvenuto'

// Quale schermata mostrare. Più avanti useremo un router vero (React Router).
type Schermata =
  | { tipo: 'caricamento' }
  | { tipo: 'accedi' }
  | { tipo: 'registrati' }
  | { tipo: 'dentro'; profilo: Profilo }

export default function App() {
  const [schermata, setSchermata] = useState<Schermata>({ tipo: 'caricamento' })

  // All'avvio chiediamo al backend se c'è già una sessione aperta.
  // Prima controlliamo che il backend risponda, poi chi è collegato (cookie di accesso).
  useEffect(() => {
    api
      .stato()
      .then(() => api.io())
      .then((profilo) => setSchermata({ tipo: 'dentro', profilo }))
      .catch(() => setSchermata({ tipo: 'accedi' }))
  }, [])

  const entrato = (profilo: Profilo) => setSchermata({ tipo: 'dentro', profilo })

  switch (schermata.tipo) {
    case 'caricamento':
      return <main className="pagina"><p>Caricamento…</p></main>
    case 'accedi':
      return <Accedi onEntrato={entrato} onVaiARegistrati={() => setSchermata({ tipo: 'registrati' })} />
    case 'registrati':
      return <Registrati onEntrato={entrato} onVaiAdAccedi={() => setSchermata({ tipo: 'accedi' })} />
    case 'dentro':
      return <Benvenuto profilo={schermata.profilo} onUscito={() => setSchermata({ tipo: 'accedi' })} />
  }
}
