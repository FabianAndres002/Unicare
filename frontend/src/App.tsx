import { useEffect, useState } from 'react'
import { api, type Profilo } from './comune/api'
import { naviga, usePercorso } from './comune/router'
import Accedi from './accesso/Accedi'
import Registrati from './accesso/Registrati'
import ConfermaEmail from './accesso/ConfermaEmail'
import PasswordDimenticata from './accesso/PasswordDimenticata'
import AreaRiservata from './cerchio/AreaRiservata'
import InvitoRicevuto from './cerchio/InvitoRicevuto'
import SeniorApp from './senior/SeniorApp'
import Privacy from './comune/Privacy'
import { linguaScelta, lingua, scegliLingua, t } from './comune/lingua'

export default function App() {
  // undefined = stiamo ancora chiedendo al backend; null = nessuno collegato.
  const [profilo, setProfilo] = useState<Profilo | null | undefined>(undefined)
  const percorso = usePercorso()

  // La Senior App (telefono dell'anziano) vive a parte: niente login di familiari e badanti.
  const senior = percorso === '/senior' || percorso.startsWith('/senior/')

  // All'avvio chiediamo al backend chi è collegato (grazie al cookie di accesso).
  useEffect(() => {
    if (senior) return
    api.io().then((p) => {
      // La lingua scelta su questo telefono vale anche per l'account; se non è mai stata
      // scelta qui, si usa quella dell'account (che magari è stata scelta su un altro telefono).
      if (p.lingua !== lingua()) {
        if (linguaScelta()) void api.preferenze({ lingua: lingua() }).then(setProfilo, () => setProfilo(p))
        else return scegliLingua(p.lingua)
      }
      setProfilo(p)
    }, async () => {
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
    if (p.lingua !== lingua()) {
      if (linguaScelta()) void api.preferenze({ lingua: lingua() }).catch(() => {})
      else return scegliLingua(p.lingua)
    }
    setProfilo(p)
    if (percorso === '/registrati' || percorso === '/password-dimenticata') naviga('/', true)
  }

  if (senior) return <SeniorApp />

  if (profilo === undefined) return <div className="centro-pagina"><span className="rotella" aria-label={t('Caricamento')} /></div>

  // L'informativa si legge anche senza login.
  if (percorso === '/privacy' && !profilo) return <div className="contenuto-pubblico"><Privacy indietro="/" /></div>

  // Registrato ma senza aver scritto il codice arrivato per email (anche se arriva da un invito:
  // dopo la conferma resta sulla stessa pagina e l'invito si accetta).
  if (profilo?.daConfermare) return <ConfermaEmail profilo={profilo} onConfermato={setProfilo} onEsci={esci} />

  // Il link d'invito funziona sia con sia senza login.
  const invito = percorso.match(/^\/invito\/([A-Za-z0-9_-]+)$/)
  if (invito) return <InvitoRicevuto token={invito[1]!} profilo={profilo} onEntrato={setProfilo} onEsci={esci} />

  if (!profilo) {
    if (percorso === '/registrati') return <Registrati onEntrato={entrato} />
    if (percorso === '/password-dimenticata') return <PasswordDimenticata onEntrato={entrato} />
    return <Accedi onEntrato={entrato} />
  }

  return <AreaRiservata profilo={profilo} percorso={percorso} onEsci={esci} onProfilo={setProfilo} />
}
