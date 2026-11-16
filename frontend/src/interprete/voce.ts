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
  if (!Classe) return { fine: Promise.reject(new ErroreVoce('Questo telefono non riconosce la voce: scrivi la frase.')), ferma: () => {} }
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
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') rifiuta(new ErroreVoce('Permetti l’uso del microfono a Unicare (nelle impostazioni del browser) e riprova.'))
      else if (e.error === 'network') rifiuta(new ErroreVoce('Per riconoscere la voce serve internet. Controlla la connessione.'))
      else if (e.error === 'language-not-supported') rifiuta(new ErroreVoce('Questo telefono non riconosce ancora questa lingua: scrivi la frase.'))
      else rifiuta(new ErroreVoce('Non sono riuscito ad ascoltare. Riprova.'))
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

/** Legge ad alta voce, con una voce della lingua giusta se il telefono ce l'ha. */
export function parla(testo: string, voce: string, onFine?: () => void) {
  if (!sintesiDisponibile()) return onFine?.()
  const s = window.speechSynthesis
  s.cancel()
  const u = new SpeechSynthesisUtterance(testo)
  u.lang = voce
  u.rate = 0.95
  const prefisso = voce.slice(0, 2).toLowerCase()
  const voci = s.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(prefisso))
  u.voice = voci.find((v) => v.lang.replace('_', '-') === voce) ?? voci[0] ?? null
  u.onend = () => onFine?.()
  u.onerror = () => onFine?.()
  s.speak(u)
}

export function zitto() {
  if (sintesiDisponibile()) window.speechSynthesis.cancel()
}
