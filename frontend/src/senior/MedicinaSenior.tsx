// S5: "È ora delle medicine del mattino" con i pulsanti "Fatto" e "Ricordamelo tra 15 minuti",
// più l'elenco delle medicine di oggi.

import { useEffect, useState } from 'react'
import { Check, Clock, Pill, Volume2 } from 'lucide-react'
import { parla, sintesiDisponibile, zitto } from '../interprete/voce'
import { api, messaggioErrore, type Occorrenza } from '../comune/api'
import { MOMENTI, oraBreve } from '../medicine/aspetto'
import { lingua, t } from '../comune/lingua'
import { LINGUE } from '../interprete/lingue'

type Props = { nome: string; medicine: Occorrenza[]; adesso: number; onCambiata: () => void }

/** Le medicine da prendere adesso: orario arrivato, non ancora confermate, non rimandate. */
function medicineDaPrendere(medicine: Occorrenza[], adesso: number): Occorrenza[] {
  return medicine.filter(
    (o) => o.stato !== 'FATTO' && new Date(o.previstoIl).getTime() <= adesso && (!o.avvisareIl || new Date(o.avvisareIl).getTime() <= adesso),
  )
}

/** La frase che il telefono legge ad alta voce. */
function fraseMedicina(nome: string, o: Occorrenza): string {
  const quali = o.medicine.length ? t(' Sono: {0}.', o.medicine.join(', ')) : ''
  return t('{0}, è ora delle {1}.{2} Quando le hai prese, tocca il pulsante verde: Fatto.', nome, MOMENTI[o.momento].titolo.toLowerCase(), quali)
}

function SchedaMedicina({ nome, o, onCambiata }: { nome: string; o: Occorrenza; onCambiata: () => void }) {
  const [invio, setInvio] = useState(false)
  const [esito, setEsito] = useState<'fatto' | 'rimandato' | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const { titolo, Icona, colore } = MOMENTI[o.momento]
  const frase = fraseMedicina(nome, o)

  // Appena compare, il telefono legge il promemoria ad alta voce (dopo il campanello).
  // Se il telefono non lo permette senza un tocco, resta il pulsante "Ascolta".
  useEffect(() => {
    const timer = setTimeout(() => parla(frase, LINGUE[lingua()].voce), 2500)
    return () => { clearTimeout(timer); zitto() }
  }, [frase])

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
        {esito === 'fatto' ? t('Benissimo! Ho avvisato la famiglia.') : t('Va bene, te lo ricordo tra 15 minuti.')}
      </div>
    )
  }

  return (
    <div className="senior-medicina entra" role="alert">
      <div className="senior-medicina-alto">
        <span className={`funzione-icona ${colore}`}><Icona size={40} /></span>
        <div>
          <h2>{titolo}</h2>
          <p>{t('Erano previste alle {0}', oraBreve(o.previstoIl))}</p>
        </div>
      </div>
      {sintesiDisponibile() && (
        <button type="button" className="senior-ascolta" onClick={() => parla(frase, LINGUE[lingua()].voce)}>
          <Volume2 size={26} />{' '}{t('Ascolta di nuovo')}
        </button>
      )}
      {o.medicine.length > 0 && (
        <ul className="senior-nomi-medicine">{o.medicine.map((m) => <li key={m}><Pill size={22} /> {m}</li>)}</ul>
      )}
      {errore && <p className="senior-errore">{errore}</p>}
      <button className="senior-pulsante fatto" disabled={invio} onClick={() => rispondi(true)}>
        <Check size={34} strokeWidth={3} />{' '}{t('Fatto, le ho prese')}
      </button>
      {o.stato === 'IN_ATTESA' && (
        <button className="senior-pulsante chiaro" disabled={invio} onClick={() => rispondi(false)}>
          {t('Ricordamelo tra 15 minuti')}
        </button>
      )}
    </div>
  )
}

export function MedicineAdesso({ nome, medicine, adesso, onCambiata }: Props) {
  return (
    <>
      {medicineDaPrendere(medicine, adesso).map((o) => <SchedaMedicina key={o.id} nome={nome} o={o} onCambiata={onCambiata} />)}
    </>
  )
}

export function MedicineDiOggi({ medicine }: { medicine: Occorrenza[] }) {
  if (!medicine.length) return null
  return (
    <section>
      <h2>{t('Le medicine di oggi')}</h2>
      <ul className="senior-oggi">
        {medicine.map((o) => {
          const { titolo, Icona, colore } = MOMENTI[o.momento]
          return (
            <li key={o.id}>
              <span className={`funzione-icona ${colore}`}><Icona size={26} /></span>
              <span className="senior-oggi-testo">
                <strong>{titolo}</strong>
                {o.medicine.length > 0 && <small>{o.medicine.join(', ')}</small>}
              </span>
              {o.stato === 'FATTO'
                ? <span className="ok"><Check size={20} />{' '}{t('Fatto')}</span>
                : <span><Clock size={18} className="senior-icona-stato" /> {oraBreve(o.previstoIl)}</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
