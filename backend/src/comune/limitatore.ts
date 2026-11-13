// Limite ai tentativi sbagliati (per esempio password errate), per chiave: dopo "massimo"
// errori in fila bisogna aspettare "minuti". Tiene i conti in memoria: si azzera al riavvio.

import { ErroreApplicativo } from './errori.ts'

export function creaLimitatore(massimo: number, minuti: number) {
  const errori = new Map<string, { quanti: number; finoAl: number }>()
  return {
    /** Prima di provare: 429 se la chiave è bloccata. */
    controlla(chi: string) {
      const e = errori.get(chi)
      if (e && e.quanti >= massimo && e.finoAl > Date.now()) {
        const mancano = Math.ceil((e.finoAl - Date.now()) / 60000)
        throw new ErroreApplicativo(429, 'TROPPI_TENTATIVI', `Troppi tentativi. Riprova tra ${mancano} ${mancano === 1 ? 'minuto' : 'minuti'}.`)
      }
    },
    sbagliato(chi: string) {
      const e = errori.get(chi)
      const valido = e && e.finoAl > Date.now()
      errori.set(chi, { quanti: (valido ? e.quanti : 0) + 1, finoAl: Date.now() + minuti * 60000 })
      // Pulizia: le chiavi scadute non servono più.
      if (errori.size > 10_000) for (const [k, v] of errori) if (v.finoAl <= Date.now()) errori.delete(k)
    },
    riuscito(chi: string) {
      errori.delete(chi)
    },
  }
}
