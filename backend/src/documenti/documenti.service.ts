// Documenti sanitari dell'anziano: ricette e prescrizioni, analisi, ecografie e radiografie,
// referti, ricevute delle spese mediche. Ognuno è una foto o un PDF.
//
// Sono dati sanitari: li vedono e li caricano solo familiari e amministratore (non la badante),
// e prima del primo caricamento serve il consenso dell'anziano (registrato con la data).
//
// I file sono salvati nel database. Per sicurezza accettiamo solo immagini (JPEG, PNG, WEBP, HEIC)
// e PDF, e controlliamo i primi byte del file: non basta il nome per far passare altro.

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { testoFacoltativo } from '../comune/validazione.ts'
import { PUO_MODIFICARE_ANZIANO, ruoloPerAnziano } from '../cerchio/permessi.ts'

export const CATEGORIE_DOCUMENTO = ['PRESCRIZIONE', 'ANALISI', 'IMMAGINI', 'REFERTO', 'RICEVUTA', 'ALTRO'] as const
export const DIMENSIONE_MASSIMA_DOCUMENTO = '10mb'
export const VERSIONE_CONSENSO_DOCUMENTI = '2026-11'

const schemaData = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data non valida (AAAA-MM-GG)')
const schemaImporto = z.coerce.number().int().min(0).max(10_000_000).nullish()

/** I dati del documento arrivano nell'indirizzo (?titolo=...), il file nel corpo. */
export const schemaNuovoDocumento = z.object({
  categoria: z.enum(CATEGORIE_DOCUMENTO),
  titolo: z.string().trim().min(2, 'Scrivi che documento è.').max(120),
  data: schemaData,
  note: testoFacoltativo(500),
  importo: schemaImporto,
  nome: z.string().trim().min(1).max(200).default('documento'),
  consenso: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
})

export const schemaModificaDocumento = z
  .object({
    categoria: z.enum(CATEGORIE_DOCUMENTO),
    titolo: z.string().trim().min(2).max(120),
    data: schemaData,
    note: testoFacoltativo(500),
    importo: schemaImporto,
  })
  .partial()

export type Documento = {
  id: number
  categoria: (typeof CATEGORIE_DOCUMENTO)[number]
  titolo: string
  data: string
  note: string | null
  importoCentesimi: number | null
  tipoFile: string
  nomeFile: string
  dimensione: number
  caricatoDa: string | null
  caricatoIl: string
}

export type ArchivioDocumenti = {
  documenti: Documento[]
  consenso: boolean
  /** Le spese mediche dell'anno in corso (dalle ricevute). */
  speseAnno: { anno: number; centesimi: number }
}

/** Riconosce il tipo di file dai primi byte. undefined = non accettato. */
export function riconosciFile(b: Buffer): string | undefined {
  if (b.length < 12) return undefined
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp'
  if (b.toString('latin1', 0, 5) === '%PDF-') return 'application/pdf'
  if (b.toString('latin1', 4, 8) === 'ftyp' && ['heic', 'heix', 'mif1', 'msf1', 'heif'].includes(b.toString('latin1', 8, 12))) return 'image/heic'
  return undefined
}

const ISO = (colonna: string) => `to_char(${colonna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

const SELECT = `
  SELECT d.id, d.categoria, d.titolo, to_char(d.data_documento, 'YYYY-MM-DD') AS data, d.note,
         d.importo_centesimi AS "importoCentesimi", d.tipo_file AS "tipoFile", d.nome_file AS "nomeFile",
         d.dimensione, u.nome AS "caricatoDa", ${ISO('d.caricato_il')} AS "caricatoIl"
  FROM documento d LEFT JOIN utente u ON u.id = d.caricato_da`

export function creaServizioDocumenti(db: Database) {
  const nonTrovato = () => new ErroreApplicativo(404, 'DOCUMENTO_NON_TROVATO', 'Documento non trovato.')

  /** Il documento, solo se l'utente è familiare o amministratore di quel cerchio. */
  async function documentoPer(id: number, utenteId: number): Promise<{ anzianoId: number }> {
    const [d] = await db.query<{ anzianoId: number }>('SELECT anziano_id AS "anzianoId" FROM documento WHERE id = $1', [id])
    if (!d) throw nonTrovato()
    await ruoloPerAnziano(db, d.anzianoId, utenteId, PUO_MODIFICARE_ANZIANO).catch((e) => {
      throw e instanceof ErroreApplicativo && e.stato === 404 ? nonTrovato() : e
    })
    return d
  }

  return {
    async archivio(anzianoId: number, utenteId: number): Promise<ArchivioDocumenti> {
      await ruoloPerAnziano(db, anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      const documenti = await db.query<Documento>(`${SELECT} WHERE d.anziano_id = $1 ORDER BY d.data_documento DESC, d.id DESC`, [anzianoId])
      const [consenso] = await db.query(
        `SELECT 1 FROM consenso WHERE anziano_id = $1 AND tipo = 'DOCUMENTI_SANITARI' AND revocato_il IS NULL`,
        [anzianoId],
      )
      const [spese] = await db.query<{ anno: number; centesimi: number }>(
        `SELECT extract(year FROM now() AT TIME ZONE $2)::int AS anno, COALESCE(sum(importo_centesimi), 0)::int AS centesimi
         FROM documento WHERE anziano_id = $1 AND categoria = 'RICEVUTA'
           AND extract(year FROM data_documento) = extract(year FROM now() AT TIME ZONE $2)`,
        [anzianoId, config.fusoOrario],
      )
      return { documenti, consenso: Boolean(consenso), speseAnno: spese! }
    },

    async carica(anzianoId: number, utenteId: number, dati: z.infer<typeof schemaNuovoDocumento>, file: unknown): Promise<number> {
      await ruoloPerAnziano(db, anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      if (!Buffer.isBuffer(file) || !file.length) throw new ErroreApplicativo(400, 'FILE_MANCANTE', 'Scegli una foto o un PDF.')
      const tipo = riconosciFile(file)
      if (!tipo) throw new ErroreApplicativo(400, 'FILE_NON_ACCETTATO', 'Si possono caricare solo foto (JPEG, PNG, HEIC) e PDF.')
      return db.transazione(async (tx) => {
        const [consenso] = await tx.query(
          `SELECT 1 FROM consenso WHERE anziano_id = $1 AND tipo = 'DOCUMENTI_SANITARI' AND revocato_il IS NULL`,
          [anzianoId],
        )
        if (!consenso) {
          if (!dati.consenso) throw new ErroreApplicativo(400, 'CONSENSO_MANCANTE', 'Serve il consenso dell’anziano per conservare i suoi documenti sanitari.')
          await tx.query(
            `INSERT INTO consenso (anziano_id, tipo, versione_testo, dato_da) VALUES ($1, 'DOCUMENTI_SANITARI', $2, $3)`,
            [anzianoId, VERSIONE_CONSENSO_DOCUMENTI, utenteId],
          )
        }
        const [r] = await tx.query<{ id: number }>(
          `INSERT INTO documento (anziano_id, categoria, titolo, data_documento, note, importo_centesimi, file, tipo_file, nome_file, dimensione, caricato_da)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          [anzianoId, dati.categoria, dati.titolo, dati.data, dati.note, dati.categoria === 'RICEVUTA' ? (dati.importo ?? null) : null,
            file, tipo, dati.nome, file.length, utenteId],
        )
        return r!.id
      })
    },

    async file(id: number, utenteId: number): Promise<{ file: Buffer; tipo: string; nome: string }> {
      await documentoPer(id, utenteId)
      const [d] = await db.query<{ file: Uint8Array; tipo: string; nome: string }>(
        'SELECT file, tipo_file AS tipo, nome_file AS nome FROM documento WHERE id = $1',
        [id],
      )
      return { ...d!, file: Buffer.from(d!.file) }
    },

    async modifica(id: number, utenteId: number, dati: z.infer<typeof schemaModificaDocumento>): Promise<Documento> {
      await documentoPer(id, utenteId)
      await db.query(
        `UPDATE documento SET
           categoria = COALESCE($2, categoria),
           titolo = COALESCE($3, titolo),
           data_documento = COALESCE($4::date, data_documento),
           note = CASE WHEN $5 THEN $6 ELSE note END,
           importo_centesimi = CASE WHEN COALESCE($2, categoria) <> 'RICEVUTA' THEN NULL WHEN $7 THEN $8 ELSE importo_centesimi END
         WHERE id = $1`,
        [id, dati.categoria ?? null, dati.titolo ?? null, dati.data ?? null, dati.note !== undefined, dati.note ?? null,
          dati.importo !== undefined, dati.importo ?? null],
      )
      const [d] = await db.query<Documento>(`${SELECT} WHERE d.id = $1`, [id])
      return d!
    },

    async elimina(id: number, utenteId: number): Promise<void> {
      await documentoPer(id, utenteId)
      await db.query('DELETE FROM documento WHERE id = $1', [id])
    },
  }
}

export type ServizioDocumenti = ReturnType<typeof creaServizioDocumenti>
