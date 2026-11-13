// Tutto quello che si vede dopo il login. Carica i cerchi dell'utente
// e il dettaglio di quello attivo, poi sceglie la pagina in base all'indirizzo.

import { useCallback, useEffect, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { api, messaggioErrore, type Cerchio, type Profilo, type RiassuntoCerchio } from '../comune/api'
import { naviga } from '../comune/router'
import Guscio from './Guscio'
import Home from './Home'
import Membri from './Membri'
import Invita from './Invita'
import SchedaAnziano from './SchedaAnziano'
import ProfiloPagina from './ProfiloPagina'
import NuovoCerchio from './NuovoCerchio'
import { cerchioScelto, scegliCerchio } from './cerchioAttivo'
import Richieste from '../richieste/Richieste'
import NuovaRichiesta from '../richieste/NuovaRichiesta'
import DettaglioRichiesta from '../richieste/DettaglioRichiesta'
import MedicinePagina from '../medicine/MedicinePagina'
import AppuntamentiPagina from '../appuntamenti/AppuntamentiPagina'
import MessaggiPagina from '../vocali/MessaggiPagina'

type Props = { profilo: Profilo; percorso: string; onEsci: () => void; onProfilo: (p: Profilo) => void }

export default function AreaRiservata({ profilo, percorso, onEsci, onProfilo }: Props) {
  const [cerchi, setCerchi] = useState<RiassuntoCerchio[] | null>(null)
  const [cerchio, setCerchio] = useState<Cerchio | null>(null)
  const [errore, setErrore] = useState<string | null>(null)

  const carica = useCallback(async () => {
    try {
      const elenco = await api.cerchi()
      setCerchi(elenco)
      const scelto = elenco.find((c) => c.id === cerchioScelto()) ?? elenco[0]
      setCerchio(scelto ? await api.cerchio(scelto.id) : null)
      setErrore(null)
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
  }, [])

  useEffect(() => {
    carica()
  }, [carica])

  function vaiAlCerchio(id: number) {
    scegliCerchio(id)
    naviga('/')
    carica()
  }

  if (errore) {
    return (
      <div className="centro-pagina">
        <p className="errore">{errore}</p>
        <button className="pulsante" onClick={carica}>Riprova</button>
      </div>
    )
  }
  if (!cerchi) return <div className="centro-pagina"><span className="rotella" aria-label="Caricamento" /></div>

  // Primo accesso: nessun cerchio.
  if (!cerchio || percorso === '/cerchio/nuovo') {
    if (profilo.tipo === 'BADANTE') {
      return (
        <div className="centro-pagina entra">
          <span className="successo-icona"><HeartHandshake size={34} /></span>
          <h1>Ciao {profilo.nome}!</h1>
          <p className="sottotitolo stretto">
            Per entrare nel cerchio di una famiglia ti serve il loro <strong>link d'invito</strong>.
            Chiedi alla famiglia di invitarti con l'email <strong>{profilo.email}</strong>, poi apri il link che ti mandano.
          </p>
          <button className="pulsante secondario" onClick={onEsci}>Esci</button>
        </div>
      )
    }
    return (
      <div className="centro-pagina">
        <NuovoCerchio nomeUtente={profilo.nome} onFatto={vaiAlCerchio}
          onAnnulla={cerchio ? () => naviga('/') : undefined} />
      </div>
    )
  }

  const anziano = percorso.match(/^\/anziano\/(\d+|nuovo)$/)
  const richiesta = percorso.match(/^\/richieste\/(\d+)$/)
  // /anziano/12/medicine, /anziano/12/appuntamenti, /anziano/12/messaggi
  const sottopagina = percorso.match(/^\/anziano\/(\d+)\/(medicine|appuntamenti|messaggi)$/)
  const anzianoSotto = sottopagina && cerchio.anziani.find((a) => a.id === Number(sottopagina[1]))
  let pagina
  if (anzianoSotto && sottopagina[2] === 'medicine') pagina = <MedicinePagina key={anzianoSotto.id} anziano={anzianoSotto} />
  else if (anzianoSotto && sottopagina[2] === 'appuntamenti') pagina = <AppuntamentiPagina key={anzianoSotto.id} anziano={anzianoSotto} />
  else if (anzianoSotto && sottopagina[2] === 'messaggi') pagina = <MessaggiPagina key={anzianoSotto.id} anziano={anzianoSotto} />
  else if (percorso === '/richieste') pagina = <Richieste profilo={profilo} cerchio={cerchio} />
  else if (percorso === '/richieste/nuova') pagina = <NuovaRichiesta cerchio={cerchio} />
  else if (richiesta) pagina = <DettaglioRichiesta key={richiesta[1]} id={Number(richiesta[1])} profilo={profilo} />
  else if (percorso === '/cerchio') pagina = <Membri profilo={profilo} cerchio={cerchio} onCambiato={carica} />
  else if (percorso === '/invita') pagina = <Invita cerchio={cerchio} onCambiato={carica} />
  else if (percorso === '/profilo')
    pagina = <ProfiloPagina profilo={profilo} cerchi={cerchi} attivo={cerchio.id} onScegli={vaiAlCerchio} onEsci={onEsci} onProfilo={onProfilo} />
  else if (anziano)
    pagina = <SchedaAnziano cerchio={cerchio} anzianoId={anziano[1] === 'nuovo' ? 'nuovo' : Number(anziano[1])} onCambiato={carica} />
  else pagina = <Home profilo={profilo} cerchio={cerchio} />

  return (
    <Guscio percorso={percorso} profilo={profilo} nomeCerchio={cerchio.nome} puoInvitare={cerchio.mioRuolo === 'ADMIN'}>
      {pagina}
    </Guscio>
  )
}
