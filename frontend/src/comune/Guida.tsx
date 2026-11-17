// La guida che compare alla prima apertura: poche schede, una per funzione, da scorrere
// col dito o con "Avanti". Una versione per la famiglia, una per la badante e una
// (più grande, con la voce) per la Senior App. Si rivede dal Profilo.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Bell, Briefcase, CalendarHeart, HandHeart, Heart, Languages, MessageCircle, Mic, MoreVertical, Phone, Pill, Share, Smartphone, Users, Volume2, X,
  type LucideIcon,
} from 'lucide-react'
import { lingua, t } from './lingua'
import { EVENTO_GUIDA } from './guidaEventi'
import { installaOra, installata, puoInstallareSubito, suIphone } from './installa'
import { LINGUE } from '../interprete/lingue'
import { parla, zitto } from '../interprete/voce'

export type TipoGuida = 'FAMILIARE' | 'BADANTE' | 'SENIOR'
type Scheda = { Icona: LucideIcon; tinta: string; titolo: string; testo: string; installa?: boolean }

const CHIAVE = (tipo: TipoGuida) => `unicare-guida-${tipo.toLowerCase()}`

function vista(tipo: TipoGuida): boolean {
  try { return localStorage.getItem(CHIAVE(tipo)) === '1' } catch { return true }
}
function segnaVista(tipo: TipoGuida) {
  try { localStorage.setItem(CHIAVE(tipo), '1') } catch { /* niente */ }
}


function schede(tipo: TipoGuida): Scheda[] {
  const installa: Scheda[] = installata() ? [] : [{ Icona: Smartphone, tinta: 'blu', titolo: t('Mettila sulla schermata Home'), testo: '', installa: true }]
  if (tipo === 'SENIOR') {
    return [
      { Icona: HandHeart, tinta: 'arancio', titolo: t('Chiedi aiuto'), testo: t('Tocca il pulsante arancione e scegli di cosa hai bisogno. La tua famiglia riceve subito l’avviso.') },
      { Icona: Pill, tinta: 'verde', titolo: t('Le medicine'), testo: t('Quando è l’ora, il telefono suona. Prendi le medicine e tocca il pulsante verde “Fatto”.') },
      { Icona: Mic, tinta: 'viola', titolo: t('Messaggi a voce'), testo: t('Tocca “Manda un messaggio vocale” e parla: non serve scrivere.') },
      { Icona: Phone, tinta: 'rosso', titolo: t('Chiama'), testo: t('I pulsanti verdi chiamano la tua famiglia. Quello rosso in basso chiama il 118.') },
      ...installa,
    ]
  }
  const notifiche: Scheda = { Icona: Bell, tinta: 'arancio', titolo: t('Accendi le notifiche'), testo: t('Dal Profilo, alla voce “Notifiche su questo telefono”: così sai subito quando c’è bisogno di te.') }
  if (tipo === 'BADANTE') {
    return [
      { Icona: Heart, tinta: 'viola', titolo: t('Benvenuto in Unicare'), testo: t('Qui lavori insieme alle famiglie: richieste di aiuto, visite e promemoria in un posto solo.') },
      { Icona: Briefcase, tinta: 'arancio', titolo: t('Trova lavoro'), testo: t('Compila il tuo profilo e accendi “Mi propongo”: le famiglie della tua zona ti trovano. In Lavoro vedi chi sta cercando.') },
      { Icona: MessageCircle, tinta: 'blu', titolo: t('Messaggi tradotti'), testo: t('Scrivi alle famiglie nella tua lingua: i messaggi arrivano tradotti, e le loro risposte anche.') },
      { Icona: HandHeart, tinta: 'verde', titolo: t('Nel cerchio della famiglia'), testo: t('Quando una famiglia ti invita, vedi richieste, visite e promemoria e puoi dire “Me ne occupo io”.') },
      { Icona: Languages, tinta: 'viola', titolo: t('Interprete'), testo: t('Parla con la famiglia a voce: il telefono traduce e legge ad alta voce.') },
      notifiche,
      ...installa,
    ]
  }
  return [
    { Icona: Heart, tinta: 'viola', titolo: t('Benvenuto in Unicare'), testo: t('Famiglia, badante e il vostro caro si organizzano insieme, in un posto solo.') },
    { Icona: Users, tinta: 'arancio', titolo: t('Il cerchio'), testo: t('Crea il cerchio, aggiungi la persona che assistete e invita gli altri familiari e la badante con un link.') },
    { Icona: HandHeart, tinta: 'verde', titolo: t('Richieste di aiuto'), testo: t('Spesa, farmacia, un passaggio: chi può tocca “Me ne occupo io” e tutti lo sanno.') },
    { Icona: CalendarHeart, tinta: 'blu', titolo: t('Medicine e visite'), testo: t('All’ora delle medicine il suo telefono suona. Se dopo un’ora non c’è “Fatto”, vi avvisiamo. Le visite hanno un promemoria la sera prima.') },
    { Icona: Smartphone, tinta: 'viola', titolo: t('Il telefono del vostro caro'), testo: t('Nella sua scheda, “Collega il telefono” dà un codice di 6 numeri: lo scrivete sul suo telefono e basta, niente password.') },
    notifiche,
    ...installa,
  ]
}

function IstruzioniInstalla() {
  const [fatto, setFatto] = useState(false)
  if (puoInstallareSubito() && !fatto) {
    return (
      <>
        <p className="guida-testo">{t('Così Unicare si apre come un’app, con la sua icona, e le notifiche arrivano.')}</p>
        <button type="button" className="pulsante con-icona" onClick={async () => setFatto(await installaOra())}><Smartphone size={20} />{' '}{t('Installa ora')}</button>
      </>
    )
  }
  if (fatto) return <p className="guida-testo">{t('Fatto! Ora trovi Unicare tra le tue app.')}</p>
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

function Guida({ tipo, onFine }: { tipo: TipoGuida; onFine: () => void }) {
  const [elenco] = useState(() => schede(tipo))
  const [qui, setQui] = useState(0)
  const binario = useRef<HTMLDivElement>(null)
  const grande = tipo === 'SENIOR'
  const ultima = qui === elenco.length - 1

  // La scheda visibile segue lo scorrimento col dito.
  function scorso() {
    const b = binario.current
    if (b) setQui(Math.round(b.scrollLeft / b.clientWidth))
  }
  function vai(i: number) {
    binario.current?.scrollTo({ left: i * binario.current.clientWidth, behavior: 'smooth' })
    setQui(i)
  }
  function fine() {
    zitto()
    segnaVista(tipo)
    onFine()
  }
  function leggi(s: Scheda) {
    parla(`${s.titolo}. ${s.testo}`, LINGUE[lingua()].voce)
  }

  useEffect(() => () => zitto(), [])

  return createPortal(
    <div className={`guida ${grande ? 'grande' : ''}`} role="dialog" aria-modal="true" aria-label={t('Come funziona Unicare')}>
      <button type="button" className="guida-salta" onClick={fine}>{t('Salta')}<X size={18} /></button>
      <div className="guida-binario" ref={binario} onScroll={scorso}>
        {elenco.map((s, i) => (
          <section key={i} className={`guida-scheda ${s.installa ? 'installa' : ''}`} aria-hidden={i !== qui}>
            <span className={`guida-disegno tinta-${s.tinta}`}><s.Icona size={grande ? 76 : 64} strokeWidth={2} /></span>
            <h2>{s.titolo}</h2>
            {s.installa ? <IstruzioniInstalla /> : <p className="guida-testo">{s.testo}</p>}
            {grande && !s.installa && (
              <button type="button" className="senior-ascolta" onClick={() => leggi(s)}><Volume2 size={24} />{' '}{t('Ascolta')}</button>
            )}
          </section>
        ))}
      </div>
      <div className="guida-piede">
        <div className="guida-puntini" role="tablist">
          {elenco.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === qui} aria-label={t('Scheda {0} di {1}', String(i + 1), String(elenco.length))} onClick={() => vai(i)} />
          ))}
        </div>
        <button type="button" className={grande ? 'senior-pulsante' : 'pulsante'} onClick={() => (ultima ? fine() : vai(qui + 1))}>
          {ultima ? t('Inizia') : t('Avanti')}
        </button>
      </div>
    </div>,
    document.body,
  )
}

/** Mostra la guida la prima volta su questo telefono, e ogni volta che la si richiede. */
export default function GuidaIniziale({ tipo }: { tipo: TipoGuida }) {
  const [aperta, setAperta] = useState(() => !vista(tipo))
  useEffect(() => {
    const apri = () => setAperta(true)
    window.addEventListener(EVENTO_GUIDA, apri)
    return () => window.removeEventListener(EVENTO_GUIDA, apri)
  }, [])
  return aperta ? <Guida tipo={tipo} onFine={() => setAperta(false)} /> : null
}
