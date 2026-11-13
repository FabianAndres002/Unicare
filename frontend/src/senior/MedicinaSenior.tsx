// S5: "È ora delle medicine del mattino" con i pulsanti "Fatto" e "Ricordamelo tra 15 minuti",
// più l'elenco delle medicine di oggi.

import { useState } from 'react'
import { Check, Clock } from 'lucide-react'
import { api, messaggioErrore, type Occorrenza } from '../comune/api'
import { MOMENTI, oraBreve } from '../medicine/aspetto'

type Props = { medicine: Occorrenza[]; adesso: number; onCambiata: () => void }

/** Le medicine da prendere adesso: orario arrivato, non ancora confermate, non rimandate. */
function medicineDaPrendere(medicine: Occorrenza[], adesso: number): Occorrenza[] {
  return medicine.filter(
    (o) => o.stato !== 'FATTO' && new Date(o.previstoIl).getTime() <= adesso && (!o.avvisareIl || new Date(o.avvisareIl).getTime() <= adesso),
  )
}

function SchedaMedicina({ o, onCambiata }: { o: Occorrenza; onCambiata: () => void }) {
  const [invio, setInvio] = useState(false)
  const [esito, setEsito] = useState<'fatto' | 'rimandato' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const { titolo, Icona, colore } = MOMENTI[o.momento]

  async function rispondi(fatto: boolean) {
    setInvio(true)
    setErrore(null)
    try {
      await (fatto ? api.senior.fatto(o.id) : api.senior.rimanda(o.id))
      setEsito(fatto ? 'fatto' : 'rimandato')
      setTimeout(onCambiata, 2500)
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setInvio(false)
  }

  if (esito) {
    return (
      <div className="senior-avviso entra">
        <Check size={28} />
        {esito === 'fatto' ? 'Bravissima! Ho avvisato la famiglia.' : 'Va bene, te lo ricordo tra 15 minuti.'}
      </div>
    )
  }

  return (
    <div className="senior-medicina entra" role="alert">
      <div className="senior-medicina-alto">
        <span className={`funzione-icona ${colore}`}><Icona size={40} /></span>
        <div>
          <h2>{titolo}</h2>
          <p>Erano previste alle {oraBreve(o.previstoIl)}</p>
        </div>
      </div>
      {errore && <p className="senior-errore">{errore}</p>}
      <button className="senior-pulsante fatto" disabled={invio} onClick={() => rispondi(true)}>
        <Check size={34} strokeWidth={3} /> Fatto, le ho prese
      </button>
      {o.stato === 'IN_ATTESA' && (
        <button className="senior-pulsante chiaro" disabled={invio} onClick={() => rispondi(false)}>
          Ricordamelo tra 15 minuti
        </button>
      )}
    </div>
  )
}

export function MedicineAdesso({ medicine, adesso, onCambiata }: Props) {
  return (
    <>
      {medicineDaPrendere(medicine, adesso).map((o) => <SchedaMedicina key={o.id} o={o} onCambiata={onCambiata} />)}
    </>
  )
}

export function MedicineDiOggi({ medicine }: { medicine: Occorrenza[] }) {
  if (!medicine.length) return null
  return (
    <section>
      <h2>Le medicine di oggi</h2>
      <ul className="senior-oggi">
        {medicine.map((o) => {
          const { titolo, Icona, colore } = MOMENTI[o.momento]
          return (
            <li key={o.id}>
              <span className={`funzione-icona ${colore}`}><Icona size={26} /></span>
              <strong>{titolo}</strong>
              {o.stato === 'FATTO'
                ? <span className="ok"><Check size={20} /> Fatto</span>
                : <span><Clock size={18} className="senior-icona-stato" /> {oraBreve(o.previstoIl)}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
