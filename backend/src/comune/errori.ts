// Un unico formato per tutti gli errori: { "codice": "...", "messaggio": "..." }.
// Così il frontend li mostra sempre allo stesso modo.

import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'

/** Errore previsto dall'applicazione (email già usata, credenziali errate...). */
export class ErroreApplicativo extends Error {
  readonly stato: number
  readonly codice: string

  constructor(stato: number, codice: string, messaggio: string) {
    super(messaggio)
    this.stato = stato
    this.codice = codice
  }
}

/** Ultimo "middleware" di Express: trasforma qualsiasi errore in una risposta JSON. */
export const gestoreErrori: ErrorRequestHandler = (errore, _req, res, _next) => {
  if (errore instanceof ErroreApplicativo) {
    res.status(errore.stato).json({ codice: errore.codice, messaggio: errore.message })
    return
  }
  // Dati non validi secondo gli schemi zod: elenca i campi sbagliati.
  if (errore instanceof ZodError) {
    const dettagli = errore.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .sort()
      .join('; ')
    res.status(400).json({ codice: 'DATI_NON_VALIDI', messaggio: dettagli })
    return
  }
  // JSON malformato inviato dal client.
  if (errore?.type === 'entity.parse.failed') {
    res.status(400).json({ codice: 'RICHIESTA_ILLEGGIBILE', messaggio: 'Il formato della richiesta non è valido.' })
    return
  }
  // File o corpo troppo grande (oltre il limite della rotta).
  if (errore?.type === 'entity.too.large') {
    res.status(413).json({ codice: 'TROPPO_GRANDE', messaggio: 'Il file è troppo grande.' })
    return
  }
  console.error(errore)
  res.status(500).json({ codice: 'ERRORE_INTERNO', messaggio: 'Si è verificato un errore. Riprova.' })
}
