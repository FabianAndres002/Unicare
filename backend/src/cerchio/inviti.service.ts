// Inviti nel cerchio: l'amministratore crea un link monouso e lo manda (WhatsApp, email...)
// a un familiare o a una badante. Chi lo apre e fa l'accesso con la stessa email entra nel cerchio.
//
// Sicurezza:
// - il token è casuale (32 byte) e nel database salviamo solo il suo hash SHA-256;
// - scade dopo 7 giorni e si usa una volta sola;
// - va accettato con un account che ha la stessa email e il tipo giusto (familiare o badante).

import { createHash, randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { PUO_GESTIRE_MEMBRI, richiediRuolo, type Ruolo } from './permessi.ts'

export const GIORNI_VALIDITA_INVITO = 7

export const schemaInvito = z.object({
  email: z.string().trim().email('email non valida').max(254),
  ruolo: z.enum(['FAMILIARE', 'BADANTE']),
})

export const schemaToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/)

const hashDi = (token: string) => createHash('sha256').update(token).digest('hex')

export type InvitoCreato = { id: number; email: string; ruolo: Ruolo; scadeIl: string; token: string }

export type AnteprimaInvito = { cerchio: string; invitatoDa: string; email: string; ruolo: Ruolo; scadeIl: string }

type RigaInvito = {
  id: number
  cerchioId: number
  cerchio: string
  invitatoDa: string
  email: string
  ruolo: Ruolo
  scadeIl: string
  scaduto: boolean
  accettatoIl: string | null
  revocatoIl: string | null
}

const NON_VALIDO = () => new ErroreApplicativo(404, 'INVITO_NON_VALIDO', 'Questo invito non esiste o è stato annullato.')

export function creaServizioInviti(db: Database) {
  async function trova(token: string): Promise<RigaInvito> {
    if (!schemaToken.safeParse(token).success) throw NON_VALIDO()
    const [invito] = await db.query<RigaInvito>(
      `SELECT i.id, i.cerchio_id AS "cerchioId", c.nome AS cerchio, u.nome AS "invitatoDa",
              i.email, i.ruolo, i.scade_il AS "scadeIl", i.scade_il <= now() AS scaduto,
              i.accettato_il AS "accettatoIl", i.revocato_il AS "revocatoIl"
       FROM invito i JOIN cerchio c ON c.id = i.cerchio_id JOIN utente u ON u.id = i.invitato_da
       WHERE i.token_hash = $1`,
      [hashDi(token)],
    )
    if (!invito || invito.revocatoIl) throw NON_VALIDO()
    if (invito.accettatoIl) throw new ErroreApplicativo(410, 'INVITO_GIA_USATO', 'Questo invito è già stato usato.')
    if (invito.scaduto) throw new ErroreApplicativo(410, 'INVITO_SCADUTO', "Questo invito è scaduto: chiedi a chi te l'ha mandato di inviarne uno nuovo.")
    return invito
  }

  return {
    /** Solo l'amministratore invita. Un nuovo invito alla stessa email annulla quello precedente. */
    async crea(cerchioId: number, utenteId: number, dati: z.infer<typeof schemaInvito>): Promise<InvitoCreato> {
      await richiediRuolo(db, cerchioId, utenteId, PUO_GESTIRE_MEMBRI)
      const [giaMembro] = await db.query(
        `SELECT 1 FROM membro_cerchio m JOIN utente u ON u.id = m.utente_id
         WHERE m.cerchio_id = $1 AND lower(u.email) = lower($2)`,
        [cerchioId, dati.email],
      )
      if (giaMembro) throw new ErroreApplicativo(409, 'GIA_MEMBRO', 'Questa persona fa già parte del cerchio.')

      const token = randomBytes(32).toString('base64url')
      return db.transazione(async (tx) => {
        await tx.query(
          `UPDATE invito SET revocato_il = now()
           WHERE cerchio_id = $1 AND lower(email) = lower($2) AND accettato_il IS NULL AND revocato_il IS NULL`,
          [cerchioId, dati.email],
        )
        const [invito] = await tx.query<Omit<InvitoCreato, 'token'>>(
          `INSERT INTO invito (cerchio_id, email, ruolo, token_hash, invitato_da, scade_il)
           VALUES ($1, $2, $3, $4, $5, now() + make_interval(days => $6))
           RETURNING id, email, ruolo, scade_il AS "scadeIl"`,
          [cerchioId, dati.email, dati.ruolo, hashDi(token), utenteId, GIORNI_VALIDITA_INVITO],
        )
        return { ...invito!, token }
      })
    },

    /** Cosa vede chi apre il link, anche senza aver fatto l'accesso. */
    async anteprima(token: string): Promise<AnteprimaInvito> {
      const { cerchio, invitatoDa, email, ruolo, scadeIl } = await trova(token)
      return { cerchio, invitatoDa, email, ruolo, scadeIl }
    },

    /** Entra nel cerchio. Restituisce l'id del cerchio. */
    async accetta(token: string, utenteId: number): Promise<{ cerchioId: number }> {
      const invito = await trova(token)
      const [utente] = await db.query<{ email: string; tipo: string }>('SELECT email, tipo FROM utente WHERE id = $1', [utenteId])
      if (!utente || utente.email.toLowerCase() !== invito.email.toLowerCase()) {
        throw new ErroreApplicativo(403, 'INVITO_ALTRA_EMAIL', `Questo invito è per ${invito.email}: accedi con quell'account.`)
      }
      const tipoAtteso = invito.ruolo === 'BADANTE' ? 'BADANTE' : 'FAMILIARE'
      if (utente.tipo !== tipoAtteso) {
        throw new ErroreApplicativo(403, 'TIPO_ACCOUNT_DIVERSO',
          tipoAtteso === 'BADANTE'
            ? 'Questo invito è per una badante, ma il tuo account è da familiare.'
            : 'Questo invito è per un familiare, ma il tuo account è da badante.')
      }
      await db.transazione(async (tx) => {
        // "AND accettato_il IS NULL": se due richieste arrivano insieme, solo una vince.
        const usato = await tx.query(
          `UPDATE invito SET accettato_il = now(), accettato_da = $2
           WHERE id = $1 AND accettato_il IS NULL AND revocato_il IS NULL RETURNING id`,
          [invito.id, utenteId],
        )
        if (usato.length === 0) throw new ErroreApplicativo(410, 'INVITO_GIA_USATO', 'Questo invito è già stato usato.')
        await tx.query(
          `INSERT INTO membro_cerchio (cerchio_id, utente_id, ruolo) VALUES ($1, $2, $3)
           ON CONFLICT (cerchio_id, utente_id) DO NOTHING`,
          [invito.cerchioId, utenteId, invito.ruolo],
        )
      })
      return { cerchioId: invito.cerchioId }
    },

    /** L'amministratore annulla un invito non ancora usato. */
    async revoca(invitoId: number, utenteId: number): Promise<void> {
      const [invito] = await db.query<{ cerchioId: number }>('SELECT cerchio_id AS "cerchioId" FROM invito WHERE id = $1', [invitoId])
      if (!invito) throw NON_VALIDO()
      await richiediRuolo(db, invito.cerchioId, utenteId, PUO_GESTIRE_MEMBRI)
      await db.query('UPDATE invito SET revocato_il = now() WHERE id = $1 AND accettato_il IS NULL', [invitoId])
    },
  }
}

export type ServizioInviti = ReturnType<typeof creaServizioInviti>
