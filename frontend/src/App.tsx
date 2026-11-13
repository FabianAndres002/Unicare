import { useEffect, useState } from 'react'
import { api, type Profilo } from './comune/api'
import { naviga, usePercorso } from './comune/router'
import Accedi from './accesso/Accedi'
import Registrati from './accesso/Registrati'
import AreaRiservata from './cerchio/AreaRiservata'
import InvitoRicevuto from './cerchio/InvitoRicevuto'
import SeniorApp from './senior/SeniorApp'
import Privacy from './comune/Privacy'

export default function App() {
  // undefined = stiamo ancora chiedendo al backend; null = nessuno collegato.
  const [profilo, setProfilo] = useState<Profilo | null | undefined>(undefined)
  const percorso = usePercorso()

  // La Senior App (telefono dell'anziano) vive a parte: niente login di familiari e badanti.
  const senior = percorso === '/senior' || percorso.startsWith('/senior/')

  // All'avvio chiediamo al backend chi è collegato (grazie al cookie di accesso).
  useEffect(() => {
    if (senior) return
    api.io().then(setProfilo, async () => {
      // Nessun familiare collegato: se questo è il telefono dell'anziano, apriamo la Senior App.
      const telefonoAnziano = await api.senior.io().then(() => true, () => false)
      if (telefonoAnziano) naviga('/senior', true)
      setProfilo(null)
    })
  }, [senior])

  async function esci() {
    await api.logout().catch(() => {})
    setProfilo(null)
    naviga('/', true)
  }

  function entrato(p: Profilo) {
    setProfilo(p)
    if (percorso === '/registrati') naviga('/', true)
  }

  if (senior) return <SeniorApp />

  if (profilo === undefined) return <div className="centro-pagina"><span className="rotella" aria-label="Caricamento" /></div>

  // L'informativa si legge anche senza login.
  if (percorso === '/privacy' && !profilo) return <div className="contenuto-pubblico"><Privacy indietro="/" /></div>

  // Il link d'invito funziona sia con sia senza login.
  const invito = percorso.match(/^\/invito\/([A-Za-z0-9_-]+)$/)
  if (invito) return <InvitoRicevuto token={invito[1]!} profilo={profilo} onEntrato={setProfilo} onEsci={esci} />

  if (!profilo) return percorso === '/registrati' ? <Registrati onEntrato={entrato} /> : <Accedi onEntrato={entrato} />

  return <AreaRiservata profilo={profilo} percorso={percorso} onEsci={esci} onProfilo={setProfilo} />
}
