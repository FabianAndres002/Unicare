// Pagina aperta dal link d'invito: /invito/<token>.
// Chi non ha un account lo crea qui (email e tipo già compilati); chi ce l'ha accede. Poi entra nel cerchio.

import { useEffect, useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import { api, messaggioErrore, type AnteprimaInvito, type Profilo } from '../comune/api'
import { naviga } from '../comune/router'
import LayoutAccesso from '../accesso/LayoutAccesso'
import ModuloAccedi from '../accesso/ModuloAccedi'
import ModuloRegistrati from '../accesso/ModuloRegistrati'
import { scegliCerchio } from './cerchioAttivo'

type Props = { token: string; profilo: Profilo | null; onEntrato: (p: Profilo) => void; onEsci: () => void }

export default function InvitoRicevuto({ token, profilo, onEntrato, onEsci }: Props) {
  const [invito, setInvito] = useState<AnteprimaInvito | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [modo, setModo] = useState<'registrati' | 'accedi'>('registrati')
  const [invio, setInvio] = useState(false)

  useEffect(() => {
    api.anteprimaInvito(token).then(setInvito, (e) => setErrore(messaggioErrore(e)))
  }, [token])

  async function accetta() {
    setInvio(true)
    setErrore(null)
    try {
      const { cerchioId } = await api.accettaInvito(token)
      scegliCerchio(cerchioId)
      naviga('/', true)
    } catch (e) {
      setErrore(messaggioErrore(e))
      setInvio(false)
    }
  }

  // Appena fatto l'accesso dal link, entriamo direttamente nel cerchio.
  async function entratoDaQui(p: Profilo) {
    onEntrato(p)
    await accetta()
  }

  if (!invito) {
    return (
      <LayoutAccesso titolo="Invito" sottotitolo={errore ? '' : 'Un momento…'}>
        {errore && (
          <div className="avviso errore-box">
            <p>{errore}</p>
            <button className="pulsante secondario" onClick={() => naviga('/', true)}>Vai alla pagina iniziale</button>
          </div>
        )}
      </LayoutAccesso>
    )
  }

  const comeBadante = invito.ruolo === 'BADANTE'
  return (
    <LayoutAccesso titolo="Hai un invito" sottotitolo="">
      <div className="invito-card">
        <span className="invito-icona"><HeartHandshake size={28} /></span>
        <p>
          <strong>{invito.invitatoDa}</strong> ti invita nel cerchio <strong>{invito.cerchio}</strong>
          {comeBadante ? ' come badante' : ' come familiare'}.
        </p>
      </div>

      {errore && <p className="errore" role="alert">{errore}</p>}

      {profilo ? (
        <div className="pila">
          <button className="pulsante" onClick={accetta} disabled={invio}>{invio ? 'Un momento…' : 'Entra nel cerchio'}</button>
          {errore && <button className="pulsante secondario" onClick={onEsci}>Esci e usa un altro account</button>}
        </div>
      ) : modo === 'registrati' ? (
        <>
          <ModuloRegistrati onEntrato={entratoDaQui} emailIniziale={invito.email} tipoFisso={comeBadante ? 'BADANTE' : 'FAMILIARE'} />
          <p className="cambio">Hai già un account? <button className="link" onClick={() => setModo('accedi')}>Accedi</button></p>
        </>
      ) : (
        <>
          <ModuloAccedi onEntrato={entratoDaQui} emailIniziale={invito.email} />
          <p className="cambio">Non hai un account? <button className="link" onClick={() => setModo('registrati')}>Registrati</button></p>
        </>
      )}
    </LayoutAccesso>
  )
}
