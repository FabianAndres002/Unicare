// Le lingue dell'app. I testi sono scritti in italiano direttamente nel codice, dentro t('...'):
// per le altre lingue t() cerca la traduzione in src/lingue/<codice>.json (chiave = testo italiano).
// Se manca, resta l'italiano. I segnaposto {0}, {1}… si riempiono con i valori passati a t().
//
// La lingua si carica PRIMA del resto dell'app (vedi main.tsx): così anche i testi nelle
// costanti (categorie, momenti della giornata…) escono già tradotti. Cambiare lingua ricarica la pagina.

import type { Lingua } from '../interprete/lingue'

const CHIAVE = 'unicare-lingua'
export const CODICI: Lingua[] = ['it', 'ro', 'uk', 'ru', 'es', 'en', 'pl', 'pt', 'bg', 'fr']

let attuale: Lingua = 'it'
let dizionario: Record<string, string> = {}

const file = import.meta.glob<{ default: Record<string, string> }>('../lingue/*.json')

/** La lingua scelta su questo telefono, altrimenti quella del telefono, altrimenti l'italiano. */
export function linguaSalvata(): Lingua {
  try {
    const s = localStorage.getItem(CHIAVE) as Lingua | null
    if (s && CODICI.includes(s)) return s
  } catch { /* niente */ }
  const delTelefono = (navigator.language || 'it').slice(0, 2) as Lingua
  return CODICI.includes(delTelefono) ? delTelefono : 'it'
}

/** true se su questo telefono qualcuno ha scelto una lingua (e non è solo quella del telefono). */
export function linguaScelta(): boolean {
  try { return localStorage.getItem(CHIAVE) !== null } catch { return false }
}

export async function caricaLingua(l: Lingua = linguaSalvata()): Promise<void> {
  attuale = l
  document.documentElement.lang = l
  const carica = file[`../lingue/${l}.json`]
  dizionario = l === 'it' || !carica ? {} : (await carica()).default
}

/** Sceglie la lingua e ricarica l'app. */
export function scegliLingua(l: Lingua) {
  try { localStorage.setItem(CHIAVE, l) } catch { /* niente */ }
  if (l !== attuale) location.reload()
}

export const lingua = () => attuale

/** Il codice per date e numeri: 'it-IT', 'ro-RO'… */
export function locale(): string {
  return ({ it: 'it-IT', ro: 'ro-RO', uk: 'uk-UA', ru: 'ru-RU', es: 'es-ES', en: 'en-GB', pl: 'pl-PL', pt: 'pt-PT', bg: 'bg-BG', fr: 'fr-FR' } as const)[attuale]
}

/** Traduce un testo italiano nella lingua dell'app. */
export function t(testo: string, ...valori: (string | number | null | undefined)[]): string {
  const tradotto = dizionario[testo] ?? testo
  return valori.length ? tradotto.replace(/\{(\d+)\}/g, (_, i) => String(valori[Number(i)] ?? '')) : tradotto
}

/** Gli errori di validazione del server ("campo: messaggio; …"): traduce i messaggi uno per uno. */
export function traduciErrore(messaggio: string): string {
  if (dizionario[messaggio] || !messaggio.includes(': ')) return t(messaggio)
  return messaggio.split('; ').map((parte) => {
    const i = parte.indexOf(': ')
    return i < 0 ? t(parte) : `${parte.slice(0, i)}: ${t(parte.slice(i + 2))}`
  }).join('; ')
}
