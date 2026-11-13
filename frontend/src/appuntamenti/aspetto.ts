// Come si scrivono le date degli appuntamenti: "Oggi", "Domani", "giovedì 19 novembre".
// Sempre nel fuso italiano, come le ha inserite la famiglia.

const FUSO = 'Europe/Rome'

/** "2026-11-19" nel fuso italiano. */
export const giornoIso = (d: Date | string) => new Date(d).toLocaleDateString('sv-SE', { timeZone: FUSO })

export const oraAppuntamento = (d: string) =>
  new Date(d).toLocaleTimeString('it-IT', { timeZone: FUSO, hour: '2-digit', minute: '2-digit', hour12: false })

/** "Oggi", "Domani", "giovedì 19 novembre". */
export function giornoInParole(d: string, adesso = new Date()): string {
  const giorno = giornoIso(d)
  if (giorno === giornoIso(adesso)) return 'Oggi'
  if (giorno === giornoIso(new Date(adesso.getTime() + 86_400_000))) return 'Domani'
  const testo = new Date(d).toLocaleDateString('it-IT', { timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long' })
  return testo.charAt(0).toUpperCase() + testo.slice(1)
}

/** Il giorno e il mese per il "calendarietto": { giorno: '19', mese: 'nov' }. */
export function foglietto(d: string) {
  const data = new Date(d)
  return {
    giorno: data.toLocaleDateString('it-IT', { timeZone: FUSO, day: 'numeric' }),
    mese: data.toLocaleDateString('it-IT', { timeZone: FUSO, month: 'short' }).replace('.', ''),
    settimana: data.toLocaleDateString('it-IT', { timeZone: FUSO, weekday: 'short' }).replace('.', ''),
  }
}
