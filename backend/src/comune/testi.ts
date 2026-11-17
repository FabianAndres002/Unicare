// Testi di notifiche ed email nella lingua di chi li riceve.
//
// Un messaggio non si scrive più come stringa pronta, ma come "Testo": una stringa fissa
// (nomi, cose scritte dagli utenti) oppure una frase italiana da tradurre con tr().
// La frase diventa testo vero solo alla fine, con rendi(), quando sappiamo la lingua
// di chi la riceve. I dizionari sono in src/lingue/<lingua>.json, con la frase italiana
// come chiave; se una frase manca resta in italiano.

import { readFileSync } from 'node:fs'
import { LINGUE, type Lingua } from '../traduzione/traduzione.service.ts'
import { config } from '../config.ts'

export type Testo = string | ((lingua: Lingua) => string)

const dizionari: Partial<Record<Lingua, Record<string, string>>> = {}
for (const l of LINGUE) {
  if (l === 'it') continue
  try {
    dizionari[l] = JSON.parse(readFileSync(new URL(`../lingue/${l}.json`, import.meta.url), 'utf8')) as Record<string, string>
  } catch {
    dizionari[l] = {}
  }
}

/** Una frase da tradurre: tr('{0} ha chiesto aiuto', nome). I valori possono essere altri testi. */
export function tr(frase: string, ...valori: Testo[]): (lingua: Lingua) => string {
  return (lingua) => {
    const tradotta = lingua === 'it' ? frase : (dizionari[lingua]?.[frase] ?? frase)
    return tradotta.replace(/\{(\d+)\}/g, (_, i: string) => rendi(valori[Number(i)] ?? '', lingua))
  }
}

export const rendi = (testo: Testo, lingua: Lingua): string => (typeof testo === 'string' ? testo : testo(lingua))

export const comeLingua = (valore: string | null | undefined): Lingua =>
  (LINGUE as readonly string[]).includes(valore ?? '') ? (valore as Lingua) : 'it'

const LOCALE: Record<Lingua, string> = {
  it: 'it-IT', ro: 'ro-RO', uk: 'uk-UA', ru: 'ru-RU', es: 'es-ES', en: 'en-GB', pl: 'pl-PL', pt: 'pt-PT', bg: 'bg-BG', fr: 'fr-FR',
}

/** "martedì 18 novembre alle 10:30", nella lingua giusta. */
export const quando = (iso: string | Date) => (lingua: Lingua): string => {
  const d = new Date(iso)
  const giorno = d.toLocaleDateString(LOCALE[lingua], { timeZone: config.fusoOrario, weekday: 'long', day: 'numeric', month: 'long' })
  return tr('{0} alle {1}', giorno, ora(d))(lingua)
}

/** "10:30" (uguale in tutte le lingue). */
export const ora = (iso: string | Date): string =>
  new Date(iso).toLocaleTimeString('it-IT', { timeZone: config.fusoOrario, hour: '2-digit', minute: '2-digit', hour12: false })
