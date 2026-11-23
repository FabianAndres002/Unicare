// La visita guidata: alla prima apertura illumina, uno alla volta, i pulsanti veri dell'app
// e spiega a cosa servono, passando da una pagina all'altra (Home, Richieste, Cerchio…).
// Una versione per la famiglia, una per la badante e una (più grande, con la voce) per la
// Senior App. I passi sono in passiTour.ts. Si rivede dal Profilo e dalla Senior App.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical, Share, Smartphone, Volume2, X } from 'lucide-react'
import { lingua, t } from './lingua'
import { installaOra, installata, puoInstallareSubito, suIphone } from './installa'
import { EVENTO_GUIDA } from './guidaEventi'
import { naviga, usePercorso } from './router'
import { passiTour, type Passo, type TipoGuida } from './passiTour'
import { LINGUE } from '../interprete/lingue'
import { parla, zitto } from '../interprete/voce'

// Chiave nuova (giro guidato): anche chi aveva visto le vecchie schede lo vede una volta.
const CHIAVE = (tipo: TipoGuida) => `unicare-giro-${tipo.toLowerCase()}`

function vista(tipo: TipoGuida): boolean {
  try { return localStorage.getItem(CHIAVE(tipo)) === '1' } catch { return true }
}
function segnaVista(tipo: TipoGuida) {
  try { localStorage.setItem(CHIAVE(tipo), '1') } catch { /* niente */ }
}

function IstruzioniInstalla() {
  const [fatto, setFatto] = useState(false)
  if (puoInstallareSubito() && !fatto) {
    return (
      <>
        <p className="giro-testo">{t('Così Unicare si apre come un’app, con la sua icona, e le notifiche arrivano.')}</p>
        <button type="button" className="pulsante con-icona" onClick={async () => setFatto(await installaOra())}><Smartphone size={20} />{' '}{t('Installa ora')}</button>
      </>
    )
  }
  if (fatto) return <p className="giro-testo">{t('Fatto! Ora trovi Unicare tra le tue app.')}</p>
  return suIphone() ? (
    <ol className="guida-passi">
      <li>{t('Apri questa pagina con Safari.')}</li>
      <li><span className="guida-simbolo"><Share size={18} /></span>{t('Tocca Condividi, in basso.')}</li>
      <li>{t('Scegli “Aggiungi alla schermata Home”.')}</li>
      <li>{t('Da adesso apri Unicare sempre dall’icona: solo così arrivano le notifiche.')}</li>
    </ol>
  ) : (
    <ol className="guida-passi">
      <li><span className="guida-simbolo"><MoreVertical size={18} /></span>{t('Tocca il menu in alto a destra.')}</li>
      <li>{t('Scegli “Installa app” oppure “Aggiungi a schermata Home”.')}</li>
      <li>{t('Da adesso apri Unicare dall’icona, come le altre app.')}</li>
    </ol>
  )
}

type Riquadro = { x: number; y: number; l: number; a: number }
const MARGINE = 8

/** Il primo elemento visibile che corrisponde al selettore. */
function trova(selettore: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selettore)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

function Giro({ tipo, onFine }: { tipo: TipoGuida; onFine: () => void }) {
  const [passi] = useState(() => passiTour(tipo, installata()))
  const [qui, setQui] = useState(0)
  const [riquadro, setRiquadro] = useState<Riquadro | null>(null)
  const [pronto, setPronto] = useState(false)
  const [fumettoAlto, setFumettoAlto] = useState(0)
  const verso = useRef<1 | -1>(1)
  const elemento = useRef<HTMLElement | null>(null)
  const fumetto = useRef<HTMLDivElement>(null)
  const percorso = usePercorso()
  const grande = tipo === 'SENIOR'
  const passo: Passo = passi[qui]!

  const fine = useCallback(() => {
    zitto()
    segnaVista(tipo)
    onFine()
  }, [tipo, onFine])

  const vai = useCallback((i: number) => {
    if (i >= passi.length) return fine()
    verso.current = i < qui ? -1 : 1
    setPronto(false)
    setQui(Math.max(0, i))
  }, [passi.length, qui, fine])

  // Ad ogni passo: apri la pagina giusta, aspetta il pulsante, portalo al centro dello schermo.
  useEffect(() => {
    zitto()
    if (percorso !== passo.pagina) {
      naviga(passo.pagina)
      return
    }
    elemento.current = null
    let tentativi = 0
    let timer = 0
    if (!passo.dove) {
      timer = window.setTimeout(() => { setRiquadro(null); setPronto(true) }, 0)
      return () => clearTimeout(timer)
    }
    const cerca = () => {
      const el = trova(passo.dove!)
      if (el) {
        elemento.current = el
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
        timer = window.setTimeout(() => setPronto(true), 380)
        return
      }
      // Non c'è su questa pagina (per esempio manca la scheda del nonno): passo saltato.
      if (++tentativi > 15) {
        const dopo = qui + verso.current
        if (dopo < 0) setQui(0)
        else if (dopo >= passi.length) fine()
        else setQui(dopo)
        return
      }
      timer = window.setTimeout(cerca, 100)
    }
    cerca()
    return () => clearTimeout(timer)
  }, [qui, percorso, passo, passi.length, fine])

  // Il riquadro luminoso segue il pulsante (scorrimento, rotazione dello schermo…).
  useEffect(() => {
    if (!pronto) return
    let ciclo = 0
    const misura = () => {
      const el = elemento.current
      if (el) {
        const r = el.getBoundingClientRect()
        setRiquadro((p) => {
          const n = { x: r.left - MARGINE, y: r.top - MARGINE, l: r.width + 2 * MARGINE, a: r.height + 2 * MARGINE }
          return p && p.x === n.x && p.y === n.y && p.l === n.l && p.a === n.a ? p : n
        })
      }
      ciclo = requestAnimationFrame(misura)
    }
    misura()
    return () => cancelAnimationFrame(ciclo)
  }, [pronto])

  useLayoutEffect(() => {
    if (fumetto.current) setFumettoAlto(fumetto.current.offsetHeight)
  }, [qui, pronto, riquadro])

  useEffect(() => () => zitto(), [])

  // Il fumetto va sotto il pulsante se c'è posto, altrimenti sopra; se non c'è posto né
  // sopra né sotto (pulsante molto alto), in basso sullo schermo.
  const alto = window.innerHeight
  let stileFumetto: CSSProperties = {}
  if (passo.dove && riquadro) {
    const sotto = riquadro.y + riquadro.a + 12
    const sopra = riquadro.y - 12 - fumettoAlto
    if (sotto + fumettoAlto < alto - 8) stileFumetto = { top: sotto }
    else if (sopra > 8) stileFumetto = { top: sopra }
    else stileFumetto = { bottom: 12 }
  }

  const ultimo = qui === passi.length - 1
  const visibile = pronto && (!passo.dove || riquadro)
  return createPortal(
    <div className={`giro ${grande ? 'grande' : ''}`} role="dialog" aria-modal="true" aria-label={t('Come funziona Unicare')}>
      {passo.dove && riquadro && visibile
        ? <div className="giro-luce" style={{ left: riquadro.x, top: riquadro.y, width: riquadro.l, height: riquadro.a }} />
        : <div className="giro-velo" />}
      {visibile && (
        <div ref={fumetto} key={qui} className={`giro-fumetto ${passo.dove ? '' : 'centrato'}`} style={stileFumetto} aria-live="polite">
          <div className="giro-testa">
            <span className="giro-conta">{t('{0} di {1}', String(qui + 1), String(passi.length))}</span>
            <button type="button" className="giro-salta" onClick={fine}>{t('Salta')}<X size={16} /></button>
          </div>
          <h2>{passo.titolo}</h2>
          {passo.installa ? <IstruzioniInstalla /> : <p className="giro-testo">{passo.testo}</p>}
          <div className="giro-piede">
            {grande && !passo.installa && (
              <button type="button" className="giro-ascolta" onClick={() => parla(`${passo.titolo}. ${passo.testo}`, LINGUE[lingua()].voce)}>
                <Volume2 size={22} />{' '}{t('Ascolta')}
              </button>
            )}
            {qui > 0 && <button type="button" className="pulsante fantasma" onClick={() => vai(qui - 1)}>{t('Indietro')}</button>}
            <button type="button" className="pulsante" onClick={() => vai(qui + 1)}>{ultimo ? t('Inizia') : t('Avanti')}</button>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

/** Avvia la visita guidata la prima volta su questo telefono, e ogni volta che la si richiede. */
export default function GuidaIniziale({ tipo }: { tipo: TipoGuida }) {
  const [aperta, setAperta] = useState(() => !vista(tipo))
  useEffect(() => {
    const apri = () => setAperta(true)
    window.addEventListener(EVENTO_GUIDA, apri)
    return () => window.removeEventListener(EVENTO_GUIDA, apri)
  }, [])
  const chiudi = useCallback(() => setAperta(false), [])
  return aperta ? <Giro tipo={tipo} onFine={chiudi} /> : null
}
