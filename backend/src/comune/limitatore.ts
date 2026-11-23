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

/**
 * Quante volte al massimo in una finestra di tempo (per esempio 10 registrazioni all'ora
 * dallo stesso indirizzo). Conta tutto, non solo gli errori. In memoria: si azzera al riavvio.
 */
export function creaFrequenza(massimo: number, finestraMs: number,
  errore = () => new ErroreApplicativo(429, 'TROPPE_RICHIESTE', 'Troppe richieste in poco tempo. Aspetta un momento e riprova.')) {
  const conti = new Map<string, { quanti: number; dal: number }>()
  return {
    /** Conta un tentativo; 429 se si è oltre il limite. */
    conta(chi: string) {
      const ora = Date.now()
      let c = conti.get(chi)
      if (!c || ora - c.dal >= finestraMs) {
        c = { quanti: 0, dal: ora }
        conti.set(chi, c)
        if (conti.size > 20_000) for (const [k, v] of conti) if (ora - v.dal >= finestraMs) conti.delete(k)
      }
      c.quanti++
      if (c.quanti > massimo) throw errore()
    },
  }
}
