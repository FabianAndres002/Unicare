// Cerchi, membri e scheda dell'anziano. Non sa nulla di HTTP: riceve dati e restituisce dati.

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { testoFacoltativo } from '../comune/validazione.ts'
import { PUO_GESTIRE_MEMBRI, PUO_MODIFICARE_ANZIANO, richiediRuolo, ruoloNelCerchio, type Ruolo } from './permessi.ts'

/** Versione del testo dell'informativa privacy accettata per l'anziano. */
export const VERSIONE_PRIVACY = '2026-11'

// ---- Regole sui dati in ingresso ----

export const schemaCerchio = z.object({
  nome: z.string().trim().min(1, 'obbligatorio').max(100),
})

const oggi = () => new Date().toISOString().slice(0, 10)

export const schemaAnziano = z.object({
  nome: z.string().trim().min(1, 'obbligatorio').max(80),
  cognome: z.string().trim().min(1, 'obbligatorio').max(80),
  dataNascita: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'formato AAAA-MM-GG')
    .refine((d) => d >= '1900-01-01' && d <= oggi(), 'data non valida')
    .nullish()
    .or(z.literal('').transform(() => null))
    .transform((v) => v ?? null),
  comune: testoFacoltativo(100),
})

export const schemaNuovoAnziano = schemaAnziano.extend({
  // Senza consenso non salviamo i dati dell'anziano (GDPR).
  consensoPrivacy: z.literal(true, { error: 'serve il consenso al trattamento dei dati' }),
})

// ---- Quello che vede il frontend ----

export type Anziano = {
  id: number
  nome: string
  cognome: string
  dataNascita: string | null
  comune: string | null
}

export type Membro = { id: number; nome: string; cognome: string; email: string; ruolo: Ruolo }

export type InvitoInAttesa = { id: number; email: string; ruolo: Ruolo; scadeIl: string }

export type RiassuntoCerchio = { id: number; nome: string; mioRuolo: Ruolo; anziani: Anziano[]; numeroMembri: number }

export type DettaglioCerchio = {
  id: number
  nome: string
  mioRuolo: Ruolo
  anziani: Anziano[]
  membri: Membro[]
  /** Solo per l'amministratore; per gli altri è una lista vuota. */
  invitiInAttesa: InvitoInAttesa[]
}

const COLONNE_ANZIANO = `id, nome, cognome, to_char(data_nascita, 'YYYY-MM-DD') AS "dataNascita", comune`

export function creaServizioCerchio(db: Database) {
  async function anzianiDi(cerchioIds: number[]) {
    if (cerchioIds.length === 0) return new Map<number, Anziano[]>()
    const righe = await db.query<Anziano & { cerchioId: number }>(
      `SELECT cerchio_id AS "cerchioId", ${COLONNE_ANZIANO}
       FROM anziano WHERE cerchio_id = ANY($1::bigint[]) ORDER BY id`,
      [cerchioIds],
    )
    const mappa = new Map<number, Anziano[]>()
    for (const { cerchioId, ...anziano } of righe) {
      mappa.set(cerchioId, [...(mappa.get(cerchioId) ?? []), anziano])
    }
    return mappa
  }

  return {
    /** Crea il cerchio; chi lo crea ne diventa amministratore. Solo i familiari possono crearne. */
    async crea(utenteId: number, dati: z.infer<typeof schemaCerchio>): Promise<DettaglioCerchio> {
      const [utente] = await db.query<{ tipo: string }>('SELECT tipo FROM utente WHERE id = $1', [utenteId])
      if (utente?.tipo !== 'FAMILIARE') {
        throw new ErroreApplicativo(403, 'SOLO_FAMILIARI', 'Solo un familiare può creare un cerchio. Le badanti entrano con un invito.')
      }
      const id = await db.transazione(async (tx) => {
        const [cerchio] = await tx.query<{ id: number }>(
          'INSERT INTO cerchio (nome, creato_da) VALUES ($1, $2) RETURNING id',
          [dati.nome, utenteId],
        )
        await tx.query(`INSERT INTO membro_cerchio (cerchio_id, utente_id, ruolo) VALUES ($1, $2, 'ADMIN')`, [cerchio!.id, utenteId])
        return cerchio!.id
      })
      return this.dettaglio(id, utenteId)
    },

    /** I cerchi di cui l'utente fa parte. */
    async elenco(utenteId: number): Promise<RiassuntoCerchio[]> {
      const cerchi = await db.query<Omit<RiassuntoCerchio, 'anziani'>>(
        `SELECT c.id, c.nome, m.ruolo AS "mioRuolo",
                (SELECT count(*) FROM membro_cerchio x WHERE x.cerchio_id = c.id) AS "numeroMembri"
         FROM cerchio c JOIN membro_cerchio m ON m.cerchio_id = c.id
         WHERE m.utente_id = $1 ORDER BY m.entrato_il, c.id`,
        [utenteId],
      )
      const anziani = await anzianiDi(cerchi.map((c) => c.id))
      return cerchi.map((c) => ({ ...c, anziani: anziani.get(c.id) ?? [] }))
    },

    async dettaglio(cerchioId: number, utenteId: number): Promise<DettaglioCerchio> {
      const mioRuolo = await ruoloNelCerchio(db, cerchioId, utenteId)
      const [cerchio] = await db.query<{ nome: string }>('SELECT nome FROM cerchio WHERE id = $1', [cerchioId])
      const membri = await db.query<Membro>(
        `SELECT u.id, u.nome, u.cognome, u.email, m.ruolo
         FROM membro_cerchio m JOIN utente u ON u.id = m.utente_id
         WHERE m.cerchio_id = $1 ORDER BY m.entrato_il, u.id`,
        [cerchioId],
      )
      const invitiInAttesa = PUO_GESTIRE_MEMBRI.includes(mioRuolo)
        ? await db.query<InvitoInAttesa>(
            `SELECT id, email, ruolo, scade_il AS "scadeIl" FROM invito
             WHERE cerchio_id = $1 AND accettato_il IS NULL AND revocato_il IS NULL AND scade_il > now()
             ORDER BY id DESC`,
            [cerchioId],
          )
        : []
      const anziani = (await anzianiDi([cerchioId])).get(cerchioId) ?? []
      return { id: cerchioId, nome: cerchio!.nome, mioRuolo, anziani, membri, invitiInAttesa }
    },

    async rinomina(cerchioId: number, utenteId: number, dati: z.infer<typeof schemaCerchio>) {
      await richiediRuolo(db, cerchioId, utenteId, PUO_GESTIRE_MEMBRI)
      await db.query('UPDATE cerchio SET nome = $1 WHERE id = $2', [dati.nome, cerchioId])
      return this.dettaglio(cerchioId, utenteId)
    },

    /** L'amministratore toglie qualcuno dal cerchio. Non può togliere sé stesso. */
    async rimuoviMembro(cerchioId: number, utenteId: number, daRimuovere: number): Promise<void> {
      await richiediRuolo(db, cerchioId, utenteId, PUO_GESTIRE_MEMBRI)
      if (daRimuovere === utenteId) {
        throw new ErroreApplicativo(400, 'NON_PUOI_RIMUOVERTI', "Non puoi toglierti dal cerchio che amministri.")
      }
      const tolti = await db.query('DELETE FROM membro_cerchio WHERE cerchio_id = $1 AND utente_id = $2 RETURNING utente_id', [cerchioId, daRimuovere])
      if (tolti.length === 0) throw new ErroreApplicativo(404, 'MEMBRO_NON_TROVATO', 'Questa persona non fa parte del cerchio.')
    },

    /** Cancella la scheda dell'anziano e TUTTI i suoi dati (solo l'amministratore). */
    async eliminaAnziano(anzianoId: number, utenteId: number): Promise<void> {
      const [riga] = await db.query<{ cerchioId: number }>('SELECT cerchio_id AS "cerchioId" FROM anziano WHERE id = $1', [anzianoId])
      if (!riga) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Persona non trovata.')
      await richiediRuolo(db, riga.cerchioId, utenteId, PUO_GESTIRE_MEMBRI)
      await db.query('DELETE FROM anziano WHERE id = $1', [anzianoId])
    },

    /** Aggiunge un anziano al cerchio, registrando il consenso privacy dato dal familiare. */
    async aggiungiAnziano(cerchioId: number, utenteId: number, dati: z.infer<typeof schemaNuovoAnziano>): Promise<Anziano> {
      await richiediRuolo(db, cerchioId, utenteId, PUO_MODIFICARE_ANZIANO)
      return db.transazione(async (tx) => {
        const [anziano] = await tx.query<Anziano>(
          `INSERT INTO anziano (cerchio_id, nome, cognome, data_nascita, comune)
           VALUES ($1, $2, $3, $4, $5) RETURNING ${COLONNE_ANZIANO}`,
          [cerchioId, dati.nome, dati.cognome, dati.dataNascita, dati.comune],
        )
        await tx.query(
          `INSERT INTO consenso (anziano_id, tipo, versione_testo, dato_da) VALUES ($1, 'PRIVACY', $2, $3)`,
          [anziano!.id, VERSIONE_PRIVACY, utenteId],
        )
        return anziano!
      })
    },

    async modificaAnziano(anzianoId: number, utenteId: number, dati: z.infer<typeof schemaAnziano>): Promise<Anziano> {
      const [riga] = await db.query<{ cerchioId: number }>('SELECT cerchio_id AS "cerchioId" FROM anziano WHERE id = $1', [anzianoId])
      if (!riga) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Scheda non trovata.')
      try {
        await richiediRuolo(db, riga.cerchioId, utenteId, PUO_MODIFICARE_ANZIANO)
      } catch (e) {
        // Chi non è nel cerchio non deve sapere che la scheda esiste.
        if (e instanceof ErroreApplicativo && e.stato === 404) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Scheda non trovata.')
        throw e
      }
      const [anziano] = await db.query<Anziano>(
        `UPDATE anziano SET nome = $2, cognome = $3, data_nascita = $4, comune = $5
         WHERE id = $1 RETURNING ${COLONNE_ANZIANO}`,
        [anzianoId, dati.nome, dati.cognome, dati.dataNascita, dati.comune],
      )
      return anziano!
    },
  }
}

export type ServizioCerchio = ReturnType<typeof creaServizioCerchio>
