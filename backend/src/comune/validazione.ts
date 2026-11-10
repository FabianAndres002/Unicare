// Pezzi di validazione riusati da più moduli.

import { z } from 'zod'

/** Un id nell'indirizzo, per esempio /api/cerchi/12 → 12. */
export const schemaId = z.coerce.number().int().positive()

/** Testo facoltativo: una stringa vuota diventa null. */
export const testoFacoltativo = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null))
