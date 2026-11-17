import { t } from '../comune/lingua'
// La voce la gestisce il telefono, non il server:
// - "ascolta": dal microfono al testo (riconoscimento vocale del browser);
// - "parla": legge ad alta voce un testo nella lingua giusta.
// Su iPhone funziona in Safari; su Android in Chrome. Se il riconoscimento non c'è,
// l'interprete mostra un campo per scrivere.

type Risultato = { isFinal: boolean; 0: { transcript: string } }
type EventoRisultato = { results: ArrayLike<Risultato> }
type Riconoscitore = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: EventoRisultato) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

function classeRiconoscitore(): (new () => Riconoscitore) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => Riconoscitore; webkitSpeechRecognition?: new () => Riconoscitore }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const riconoscimentoDisponibile = () => typeof window !== 'undefined' && Boolean(classeRiconoscitore())
export const sintesiDisponibile = () => typeof window !== 'undefined' && 'speechSynthesis' in window

export class ErroreVoce extends Error {}

/** Ascolta una frase. "ferma" chiude prima; la promessa dà il testo sentito ('' se niente). */
export function ascolta(voce: string, onParziale: (testo: string) => void): { fine: Promise<string>; ferma: () => void } {
  const Classe = classeRiconoscitore()
  if (!Classe) return { fine: Promise.reject(new ErroreVoce(t('Questo telefono non riconosce la voce: scrivi la frase.'))), ferma: () => {} }
  const r = new Classe()
  r.lang = voce
  r.interimResults = true
  r.continuous = false
  r.maxAlternatives = 1
  let testo = ''
  const fine = new Promise<string>((risolvi, rifiuta) => {
    r.onresult = (e) => {
      let t = ''
      for (let i = 0; i < e.results.length; i++) t += e.results[i]![0].transcript
      testo = t.trim()
      onParziale(testo)
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') rifiuta(new ErroreVoce(t('Permetti l’uso del microfono a Unicare (nelle impostazioni del browser) e riprova.')))
      else if (e.error === 'network') rifiuta(new ErroreVoce(t('Per riconoscere la voce serve internet. Controlla la connessione.')))
      else if (e.error === 'language-not-supported') rifiuta(new ErroreVoce(t('Questo telefono non riconosce ancora questa lingua: scrivi la frase.')))
      else rifiuta(new ErroreVoce(t('Non sono riuscito ad ascoltare. Riprova.')))
    }
    r.onend = () => risolvi(testo)
  })
  r.start()
  return { fine, ferma: () => r.stop() }
}

/** Su iPhone la voce parte solo dopo un tocco: lo "sblocchiamo" al primo tocco sul microfono. */
export function sbloccaVoce() {
  if (!sintesiDisponibile()) return
  const u = new SpeechSynthesisUtterance('')
  u.volume = 0
  window.speechSynthesis.speak(u)
}

/** Le voci arrivano in ritardo su Chrome ed Edge (getVoices() all'inizio è vuoto): aspettiamo un attimo. */
function vociPronte(): Promise<SpeechSynthesisVoice[]> {
  const s = window.speechSynthesis
  const subito = s.getVoices()
  if (subito.length) return Promise.resolve(subito)
  return new Promise((risolvi) => {
    const fine = () => { s.removeEventListener('voiceschanged', fine); risolvi(s.getVoices()) }
    s.addEventListener('voiceschanged', fine)
    setTimeout(fine, 1500)
  })
}

const norma = (lang: string) => lang.replace('_', '-').toLowerCase()

/**
 * Le voci della lingua, dalla più affidabile: prima quelle del paese giusto (it-IT), e tra queste
 * prima quelle online (Google su Chrome, "Online (Natural)" su Edge), che partono sempre;
 * alcune voci installate in Windows (es. "Microsoft Cosimo") in Chrome invece restano mute.
 */
export function vociPerLingua(voci: SpeechSynthesisVoice[], voce: string): SpeechSynthesisVoice[] {
  const esatta = norma(voce)
  const prefisso = esatta.slice(0, 2)
  const punti = (v: SpeechSynthesisVoice) => (norma(v.lang) === esatta ? 2 : 0) + (v.localService ? 0 : 1)
  return voci.filter((v) => norma(v.lang).startsWith(prefisso)).sort((x, y) => punti(y) - punti(x))
}

export const scegliVoce = (voci: SpeechSynthesisVoice[], voce: string) => vociPerLingua(voci, voce)[0] ?? null

let turno = 0

/**
 * Prova le voci una dopo l'altra: se una dà errore o non parte entro un secondo e mezzo,
 * passa alla successiva e alla fine alla voce predefinita del dispositivo.
 */
function leggiConRiserva(testo: string, voce: string, onStato: (stato: string, nomeVoce?: string) => void) {
  const s = window.speechSynthesis
  const mio = ++turno
  s.cancel()
  void vociPronte().then((voci) => {
    const candidate: (SpeechSynthesisVoice | null)[] = [...vociPerLingua(voci, voce), null]
    const prova = (i: number) => {
      if (mio !== turno) return
      if (i >= candidate.length) return onStato('nessuna voce è partita')
      const v = candidate[i]!
      const u = new SpeechSynthesisUtterance(testo)
      u.lang = v?.lang ?? voce
      u.rate = 0.95
      if (v) u.voice = v
      let partita = false
      let finita = false
      const avanti = () => {
        if (finita || mio !== turno) return
        finita = true
        s.cancel()
        setTimeout(() => prova(i + 1), 80)
      }
      u.onstart = () => { partita = true; if (mio === turno) onStato('parla', v?.name) }
      u.onend = () => { if (!finita && mio === turno) { finita = true; onStato('fine', v?.name) } }
      u.onerror = (e) => {
        if (mio !== turno) return
        if (partita && (e.error === 'interrupted' || e.error === 'canceled')) return
        avanti()
      }
      s.speak(u)
      setTimeout(() => { if (!partita && !s.speaking) avanti() }, v && !v.localService ? 3000 : 1500)
    }
    // Chrome a volte ignora un speak() subito dopo cancel(): un attimo di pausa.
    setTimeout(() => prova(0), 80)
  })
}

/** Legge ad alta voce, con una voce della lingua giusta se il telefono ce l'ha. */
export function parla(testo: string, voce: string, onFine?: () => void) {
  if (!sintesiDisponibile()) return onFine?.()
  leggiConRiserva(testo, voce, (stato) => { if (stato !== 'parla') onFine?.() })
}

/** C'è una voce per questa lingua su questo telefono/computer? */
export async function haVoce(voce: string): Promise<boolean> {
  if (!sintesiDisponibile()) return false
  return scegliVoce(await vociPronte(), voce) !== null
}

export function zitto() {
  turno++
  if (sintesiDisponibile()) window.speechSynthesis.cancel()
}

/** Per la prova della voce: che voci ci sono per questa lingua e quale useremmo. */
export async function infoVoce(voce: string): Promise<{ totali: number; dellaLingua: string[]; scelta: string | null }> {
  if (!sintesiDisponibile()) return { totali: 0, dellaLingua: [], scelta: null }
  const voci = await vociPronte()
  const prefisso = norma(voce).slice(0, 2)
  return {
    totali: voci.length,
    dellaLingua: voci.filter((v) => norma(v.lang).startsWith(prefisso)).map((v) => `${v.name} (${v.lang})`),
    scelta: scegliVoce(voci, voce)?.name ?? null,
  }
}

/** Legge una frase di prova e racconta cosa succede (con quale voce parte, se finisce, se nessuna parte). */
export function provaVoce(testo: string, voce: string, onStato: (stato: string) => void) {
  if (!sintesiDisponibile()) return onStato('speechSynthesis assente')
  leggiConRiserva(testo, voce, (stato, nome) => onStato(nome ? `${stato}: ${nome}` : stato))
}
