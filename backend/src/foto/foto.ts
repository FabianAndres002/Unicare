// Foto profilo: di chi usa l'app (familiari e badanti) e della persona assistita.
//
// L'app rimpicciolisce la foto prima di mandarla (al massimo 512 px, JPEG), qui si controlla
// solo che sia davvero un'immagine e non troppo grande.
// Ogni foto ha un indirizzo con una chiave casuale (/api/foto/<chiave>): lo ricevono solo
// le persone che vedono già quel nome (stesso cerchio, conversazione, scheda badante).
// Cambiando foto cambia la chiave, così il telefono non mostra quella vecchia.
// Al posto della foto si può scegliere uno dei disegni dell'app (DISEGNI): o l'una o l'altro.

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { PUO_MODIFICARE_ANZIANO, ruoloPerAnziano } from '../cerchio/permessi.ts'

export const DIMENSIONE_MASSIMA_FOTO = 1024 * 1024 // 1 MB

/** I disegni che si possono scegliere al posto della foto (file in frontend/public/avatar). */
export const DISEGNI = [
  'nonna', 'nonno', 'nonno-baffi', 'donna', 'donna-ricci', 'donna-treccine', 'donna-bionda', 'ragazza', 'ragazza-viola', 'uomo', 'uomo-elegante', 'uomo-cuffia', 'uomo-viola', 'ragazzo', 'ragazzo-righe', 'gatto', 'cane', 'cane-felice', 'carlino', 'leone',
] as const

/** Espressione SQL: la foto dell'utente con quell'id, o il disegno scelto, o null. */
export const fotoUtente = (colonnaId: string) =>
  `COALESCE((SELECT '/api/foto/' || f.chiave FROM foto f WHERE f.utente_id = ${colonnaId}),
            (SELECT '/avatar/' || x.avatar || '.webp' FROM utente x WHERE x.id = ${colonnaId}))`
/** Espressione SQL: la foto dell'anziano con quell'id, o il disegno scelto, o null. */
export const fotoAnziano = (colonnaId: string) =>
  `COALESCE((SELECT '/api/foto/' || f.chiave FROM foto f WHERE f.anziano_id = ${colonnaId}),
            (SELECT '/avatar/' || x.avatar || '.webp' FROM anziano x WHERE x.id = ${colonnaId}))`

export const schemaDisegno = z.object({ disegno: z.enum(DISEGNI) })

/** Il tipo vero dell'immagine, letto dai primi byte (non ci si fida di quello dichiarato). */
export function tipoImmagine(dati: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (dati.length >= 3 && dati[0] === 0xff && dati[1] === 0xd8 && dati[2] === 0xff) return 'image/jpeg'
  if (dati.length >= 8 && dati.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (dati.length >= 12 && dati.toString('ascii', 0, 4) === 'RIFF' && dati.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export function creaServizioFoto(db: Database) {
  function controlla(dati: unknown) {
    if (!Buffer.isBuffer(dati) || dati.length === 0) throw new ErroreApplicativo(400, 'FOTO_MANCANTE', 'Scegli una foto.')
    const tipo = tipoImmagine(dati)
    if (!tipo) throw new ErroreApplicativo(400, 'FOTO_NON_VALIDA', 'Questo file non è una foto (JPEG, PNG o WebP).')
    return { dati, tipo }
  }

  const TABELLA = { utente_id: 'utente', anziano_id: 'anziano' } as const

  async function salva(colonna: 'utente_id' | 'anziano_id', id: number, file: unknown): Promise<string> {
    const { dati, tipo } = controlla(file)
    const chiave = randomBytes(18).toString('base64url')
    await db.transazione(async (tx) => {
      await tx.query(`DELETE FROM foto WHERE ${colonna} = $1`, [id])
      await tx.query(`INSERT INTO foto (chiave, ${colonna}, tipo, dati) VALUES ($1, $2, $3, $4)`, [chiave, id, tipo, dati])
      await tx.query(`UPDATE ${TABELLA[colonna]} SET avatar = NULL WHERE id = $1`, [id])
    })
    return `/api/foto/${chiave}`
  }

  /** Sceglie un disegno: la foto, se c'era, si cancella (o l'una o l'altro). */
  async function disegna(colonna: 'utente_id' | 'anziano_id', id: number, corpo: unknown): Promise<string> {
    const { disegno } = schemaDisegno.parse(corpo)
    await db.transazione(async (tx) => {
      await tx.query(`DELETE FROM foto WHERE ${colonna} = $1`, [id])
      await tx.query(`UPDATE ${TABELLA[colonna]} SET avatar = $2 WHERE id = $1`, [id, disegno])
    })
    return `/avatar/${disegno}.webp`
  }

  async function togli(colonna: 'utente_id' | 'anziano_id', id: number) {
    await db.transazione(async (tx) => {
      await tx.query(`DELETE FROM foto WHERE ${colonna} = $1`, [id])
      await tx.query(`UPDATE ${TABELLA[colonna]} SET avatar = NULL WHERE id = $1`, [id])
    })
  }

  return {
    salvaMia: (utenteId: number, file: unknown) => salva('utente_id', utenteId, file),
    disegnoMio: (utenteId: number, corpo: unknown) => disegna('utente_id', utenteId, corpo),
    togliMia: (utenteId: number) => togli('utente_id', utenteId),

    /** La foto della persona assistita: la cambiano l'amministratore e i familiari. */
    async salvaAnziano(anzianoId: number, utenteId: number, file: unknown) {
      await ruoloPerAnziano(db, anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      return salva('anziano_id', anzianoId, file)
    },
    async togliAnziano(anzianoId: number, utenteId: number) {
      await ruoloPerAnziano(db, anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      await togli('anziano_id', anzianoId)
    },
    async disegnoAnziano(anzianoId: number, utenteId: number, corpo: unknown) {
      await ruoloPerAnziano(db, anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      return disegna('anziano_id', anzianoId, corpo)
    },

    async leggi(chiave: string): Promise<{ dati: Buffer; tipo: string }> {
      const [f] = /^[A-Za-z0-9_-]{10,40}$/.test(chiave)
        ? await db.query<{ dati: Buffer | Uint8Array; tipo: string }>('SELECT dati, tipo FROM foto WHERE chiave = $1', [chiave])
        : []
      if (!f) throw new ErroreApplicativo(404, 'FOTO_NON_TROVATA', 'Foto non trovata.')
      return { dati: Buffer.from(f.dati), tipo: f.tipo }
    },
  }
}

export type ServizioFoto = ReturnType<typeof creaServizioFoto>
