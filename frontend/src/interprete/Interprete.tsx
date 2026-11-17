// L'interprete: due persone, due lingue, un telefono in mezzo.
// Si tocca il pulsante della propria lingua, si parla; il telefono scrive la frase,
// la traduce e la legge ad alta voce nell'altra lingua.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeftRight, Keyboard, Mic, Square, Volume2 } from 'lucide-react'
import { messaggioErrore } from '../comune/api'
import { ELENCO_LINGUE, LINGUE, lingueSalvate, nomeLingua, salvaLingue, type Lingua } from './lingue'
import { ascolta, haVoce, parla, riconoscimentoDisponibile, sbloccaVoce, zitto } from './voce'
import { t } from '../comune/lingua'
import ProvaVoce from './ProvaVoce'

type Chi = 'mia' | 'altra'
type Riga = { id: number; chi: Chi; originale: string; traduzione: string | null; errore: string | null }

type Props = {
  traduci: (testo: string, da: Lingua, a: Lingua) => Promise<string>
  /** Versione per l'anziano: tutto più grande, si sceglie solo la lingua dell'altra persona. */
  grande?: boolean
  predefinite?: { mia: Lingua; altra: Lingua }
}

export default function Interprete({ traduci, grande, predefinite = { mia: 'it', altra: 'ro' } }: Props) {
  const [lingue, setLingue] = useState(() => lingueSalvate(predefinite))
  const [righe, setRighe] = useState<Riga[]>([])
  const [ascolto, setAscolto] = useState<{ chi: Chi; parziale: string; ferma: () => void } | null>(null)
  const [errore, setErrore] = useState<string | null>(null)
  const [scrivi, setScrivi] = useState(() => !riconoscimentoDisponibile())
  const [testo, setTesto] = useState('')
  const prossimoId = useRef(1)

  useEffect(() => () => zitto(), [])

  function cambiaLingue(nuove: { mia: Lingua; altra: Lingua }) {
    if (nuove.mia === nuove.altra) return
    setLingue(nuove)
    salvaLingue(nuove)
  }

  async function traduciFrase(chi: Chi, frase: string) {
    const da = lingue[chi]
    const a = lingue[chi === 'mia' ? 'altra' : 'mia']
    const id = prossimoId.current++
    setRighe((r) => [...r, { id, chi, originale: frase, traduzione: null, errore: null }].slice(-30))
    try {
      const traduzione = await traduci(frase, da, a)
      setRighe((r) => r.map((x) => (x.id === id ? { ...x, traduzione } : x)))
      parla(traduzione, LINGUE[a].voce)
      if (!(await haVoce(LINGUE[a].voce))) setErrore(t('Su questo dispositivo manca la voce in {0}: leggi la frase qui sotto. Si può aggiungere dalle impostazioni della lingua del telefono o del computer.', LINGUE[a].italiano.toLowerCase()))
    } catch (e) {
      setRighe((r) => r.map((x) => (x.id === id ? { ...x, errore: messaggioErrore(e) } : x)))
    }
  }

  async function microfono(chi: Chi) {
    setErrore(null)
    if (ascolto) {
      ascolto.ferma()
      return
    }
    zitto()
    sbloccaVoce()
    const { fine, ferma } = ascolta(LINGUE[lingue[chi]].voce, (parziale) => setAscolto((a) => (a ? { ...a, parziale } : a)))
    setAscolto({ chi, parziale: '', ferma })
    try {
      const frase = await fine
      setAscolto(null)
      if (!frase) setErrore(t('Non ho sentito niente. Tocca il pulsante e parla vicino al telefono.'))
      else await traduciFrase(chi, frase)
    } catch (e) {
      setAscolto(null)
      setErrore(messaggioErrore(e))
      if (!riconoscimentoDisponibile()) setScrivi(true)
    }
  }

  function inviaScritto(chi: Chi) {
    return (e: FormEvent) => {
      e.preventDefault()
      const frase = testo.trim()
      if (!frase) return
      sbloccaVoce()
      setTesto('')
      traduciFrase(chi, frase)
    }
  }

  const selettore = (chi: Chi, etichetta: string) => (
    <label key={chi} className="interprete-lingua">
      <span>{etichetta}</span>
      <select className="campo" value={lingue[chi]} onChange={(e) => {
        const l = e.target.value as Lingua
        const altro: Chi = chi === 'mia' ? 'altra' : 'mia'
        // Se scelgo la lingua dell'altro, le scambio.
        cambiaLingue(l === lingue[altro] ? { mia: lingue.altra, altra: lingue.mia } : { ...lingue, [chi]: l })
      }}>
        {ELENCO_LINGUE.map((l) => <option key={l} value={l}>{nomeLingua(l)}</option>)}
      </select>
    </label>
  )

  const pulsante = (chi: Chi) => {
    const l = LINGUE[lingue[chi]]
    const attivo = ascolto?.chi === chi
    return (
      <button key={chi} type="button" className={`interprete-microfono ${chi} ${attivo ? 'attivo' : ''}`} lang={l.voce}
        disabled={Boolean(ascolto) && !attivo} onClick={() => microfono(chi)}
        aria-label={attivo ? t('Ferma') : `${l.parla} (${LINGUE[lingue[chi]].italiano})`}>
        {attivo ? <Square size={grande ? 34 : 26} /> : <Mic size={grande ? 40 : 30} />}
        <strong>{attivo ? l.ascolto : l.parla}</strong>
        <small>{nomeLingua(lingue[chi])}</small>
      </button>
    )
  }

  return (
    <div className={`interprete ${grande ? 'grande' : ''}`}>
      <div className="interprete-lingue">
        {!grande && selettore('mia', t('Io parlo'))}
        {!grande && (
          <button type="button" className="pulsante-icona" aria-label={t('Scambia le lingue')} onClick={() => cambiaLingue({ mia: lingue.altra, altra: lingue.mia })}>
            <ArrowLeftRight size={20} />
          </button>
        )}
        {selettore('altra', grande ? t('Lingua della badante') : t('L’altra persona parla'))}
      </div>

      {scrivi ? (
        <form className="interprete-scrivi" onSubmit={inviaScritto('mia')}>
          <textarea className="campo" rows={2} maxLength={500} value={testo} onChange={(e) => setTesto(e.target.value)}
            placeholder={t('Scrivi la frase…')} aria-label={t('Frase da tradurre')} />
          <div className="riga-pulsanti">
            <button className="pulsante" disabled={!testo.trim()}>{LINGUE[lingue.mia].italiano} → {LINGUE[lingue.altra].italiano}</button>
            <button type="button" className="pulsante secondario" disabled={!testo.trim()} onClick={inviaScritto('altra')}>{LINGUE[lingue.altra].italiano} → {LINGUE[lingue.mia].italiano}</button>
          </div>
          {riconoscimentoDisponibile() && <button type="button" className="pulsante fantasma con-icona" onClick={() => setScrivi(false)}><Mic size={18} />{' '}{t('Torna alla voce')}</button>}
        </form>
      ) : (
        <>
          <div className="interprete-pulsanti">
            {pulsante('mia')}
            {pulsante('altra')}
          </div>
          {!grande && <button type="button" className="pulsante fantasma con-icona" onClick={() => setScrivi(true)}><Keyboard size={18} />{' '}{t('Scrivi invece di parlare')}</button>}
        </>
      )}
      {errore && <p className="errore" role="alert">{errore}</p>}

      <div className="interprete-righe" aria-live="polite">
        {righe.length === 0 && !ascolto && (
          <p className="interprete-vuoto">{t('Tocca il pulsante della tua lingua e parla. Il telefono traduce e legge ad alta voce per l’altra persona. Qui sotto compare la conversazione.')}</p>
        )}
        {ascolto && (
          <div className={`interprete-riga ${ascolto.chi} in-ascolto`}>
            <p className="interprete-originale">{ascolto.parziale || LINGUE[lingue[ascolto.chi]].ascolto}</p>
          </div>
        )}
        {[...righe].reverse().map((r) => {
          const verso = LINGUE[lingue[r.chi === 'mia' ? 'altra' : 'mia']]
          return (
            <div key={r.id} className={`interprete-riga ${r.chi}`}>
              <p className="interprete-originale" lang={LINGUE[lingue[r.chi]].voce}>{r.originale}</p>
              {r.traduzione && (
                <p className="interprete-traduzione" lang={verso.voce}>
                  {r.traduzione}
                  <button type="button" className="pulsante-icona tenue" aria-label={t('Ascolta di nuovo')} onClick={() => { sbloccaVoce(); parla(r.traduzione!, verso.voce) }}>
                    <Volume2 size={20} />
                  </button>
                </p>
              )}
              {!r.traduzione && !r.errore && <span className="rotella piccola" aria-label={t('Traduco')} />}
              {r.errore && <p className="errore senza-margine">{r.errore}</p>}
            </div>
          )
        })}
      </div>

      <ProvaVoce lingue={[lingue.mia, lingue.altra]} />
    </div>
  )
}
