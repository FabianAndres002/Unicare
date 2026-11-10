// Chi può fare cosa in un cerchio. I permessi si controllano SEMPRE qui nel backend,
// mai solo nascondendo pulsanti nel frontend.
//
// ADMIN      chi ha creato il cerchio: tutto, compresi inviti e rimozione dei membri
// FAMILIARE  vede tutto, modifica la scheda dell'anziano
// BADANTE    vede il cerchio e la scheda dell'anziano, non la modifica

import type { Esecutore } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'

export type Ruolo = 'ADMIN' | 'FAMILIARE' | 'BADANTE'

export const PUO_MODIFICARE_ANZIANO: Ruolo[] = ['ADMIN', 'FAMILIARE']
export const PUO_GESTIRE_MEMBRI: Ruolo[] = ['ADMIN']

/**
 * Restituisce il ruolo dell'utente nel cerchio.
 * Se non ne fa parte risponde 404: chi non è membro non deve nemmeno sapere che il cerchio esiste.
 */
export async function ruoloNelCerchio(db: Esecutore, cerchioId: number, utenteId: number): Promise<Ruolo> {
  const [riga] = await db.query<{ ruolo: Ruolo }>(
    'SELECT ruolo FROM membro_cerchio WHERE cerchio_id = $1 AND utente_id = $2',
    [cerchioId, utenteId],
  )
  if (!riga) throw new ErroreApplicativo(404, 'CERCHIO_NON_TROVATO', 'Cerchio non trovato.')
  return riga.ruolo
}

/** Come ruoloNelCerchio, ma in più il ruolo deve essere tra quelli ammessi (altrimenti 403). */
export async function richiediRuolo(db: Esecutore, cerchioId: number, utenteId: number, ammessi: Ruolo[]): Promise<Ruolo> {
  const ruolo = await ruoloNelCerchio(db, cerchioId, utenteId)
  if (!ammessi.includes(ruolo)) {
    throw new ErroreApplicativo(403, 'PERMESSO_NEGATO', 'Non hai il permesso per questa operazione.')
  }
  return ruolo
}
