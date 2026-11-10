// Creazione guidata in due passi: nome del cerchio, poi la persona da assistere.

import { useState, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { api, messaggioErrore } from '../comune/api'
import ModuloAnziano from './ModuloAnziano'

type Props = { nomeUtente: string; onFatto: (cerchioId: number) => void; onAnnulla?: () => void }

export default function NuovoCerchio({ nomeUtente, onFatto, onAnnulla }: Props) {
  const [cerchioId, setCerchioId] = useState<number | null>(null)
  const [nome, setNome] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [invio, setInvio] = useState(false)

  async function creaCerchio(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInvio(true)
    try {
      setCerchioId((await api.creaCerchio(nome)).id)
    } catch (err) {
      setErrore(messaggioErrore(err))
    } finally {
      setInvio(false)
    }
  }

  return (
    <div className="procedura entra">
      <div className="passi" aria-label={`Passo ${cerchioId ? 2 : 1} di 2`}>
        <span className="passo fatto" />
        <span className={`passo ${cerchioId ? 'fatto' : ''}`} />
      </div>

      {!cerchioId ? (
        <>
          <span className="etichetta-sopra"><Sparkles size={16} /> Benvenuto, {nomeUtente}</span>
          <h1>Creiamo il vostro cerchio</h1>
          <p className="sottotitolo">
            Il cerchio è il gruppo di persone che si prende cura del vostro caro: tu, gli altri familiari e la badante.
          </p>
          <form className="modulo scheda" onSubmit={creaCerchio}>
            <label>
              Come lo chiamiamo?
              <input required maxLength={100} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Famiglia Rossi" autoFocus />
            </label>
            {errore && <p className="errore" role="alert">{errore}</p>}
            <button className="pulsante" type="submit" disabled={invio}>{invio ? 'Creazione…' : 'Continua'}</button>
            {onAnnulla && <button type="button" className="pulsante fantasma" onClick={onAnnulla}>Annulla</button>}
          </form>
        </>
      ) : (
        <>
          <span className="etichetta-sopra">Passo 2 di 2</span>
          <h1>Chi assistete?</h1>
          <p className="sottotitolo">Bastano nome e cognome; il resto puoi aggiungerlo dopo.</p>
          <div className="scheda">
            <ModuloAnziano nuovo testoPulsante="Crea la scheda"
              onSalva={async (dati) => {
                await api.aggiungiAnziano(cerchioId, dati)
                onFatto(cerchioId)
              }} />
          </div>
          <button className="pulsante fantasma" onClick={() => onFatto(cerchioId)}>Lo farò più tardi</button>
        </>
      )}
    </div>
  )
}
