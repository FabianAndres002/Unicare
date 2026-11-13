// Il telefono dell'anziano. L'anziano non ha email né password:
//
// 1. Un familiare tocca "Collega il telefono" sulla scheda dell'anziano e riceve un codice
//    di 6 cifre, valido 24 ore e usabile una volta sola.
// 2. Sul telefono dell'anziano si apre Unicare e si scrive il codice.
// 3. Il server scambia il codice con un "token" lungo e casuale, salvato in un cookie
//    sul telefono. Da quel momento il telefono resta collegato (fino a un anno).
// 4. Se il telefono si perde, un familiare tocca "Scollega" e il token smette di funzionare.
//
// Nel database non salviamo mai il codice né il token, solo la loro impronta (hash).
// Il codice è corto, quindi la sua impronta usa anche la chiave segreta del server (HMAC):
// chi rubasse il database non potrebbe ricavarlo provando tutti i milioni di combinazioni.

import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto'
import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { PUO_MODIFICARE_ANZIANO, richiediRuolo } from '../cerchio/permessi.ts'

export const schemaCodice = z.object({ codice: z.string().trim().regex(/^\d{6}$/, 'il codice ha 6 cifre') })

const ORE_VALIDITA_CODICE = 24
const MAX_TENTATIVI = 5
const MINUTI_BLOCCO = 15

const impronta = (token: string) => createHash('sha256').update(token).digest('hex')
const improntaCodice = (codice: string) => createHmac('sha256', config.segretoJwt).update(`codice:${codice}`).digest('hex')

export type StatoTelefono = {
  /** Telefoni collegati e ancora attivi. */
  collegati: { id: number; collegatoIl: string; ultimoUsoIl: string | null }[]
  /** Se c'è un codice generato e non ancora usato, quando scade. */
  codiceScadeIl: string | null
}

export type AnzianoCollegato = { dispositivoId: number; anzianoId: number }

/**
 * Limite ai tentativi di codice sbagliati, per indirizzo di rete: 5 errori,
 * poi 15 minuti di attesa. Così nessuno può provare tutti i codici possibili.
 */
function creaLimitatore() {
  const errori = new Map<string, { quanti: number; finoAl: number }>()
  return {
    controlla(chi: string) {
      const e = errori.get(chi)
      if (e && e.quanti >= MAX_TENTATIVI && e.finoAl > Date.now()) {
        const minuti = Math.ceil((e.finoAl - Date.now()) / 60000)
        throw new ErroreApplicativo(429, 'TROPPI_TENTATIVI', `Troppi tentativi. Riprova tra ${minuti} minuti.`)
      }
    },
    sbagliato(chi: string) {
      const e = errori.get(chi)
      const valido = e && e.finoAl > Date.now()
      errori.set(chi, { quanti: (valido ? e.quanti : 0) + 1, finoAl: Date.now() + MINUTI_BLOCCO * 60000 })
    },
    riuscito(chi: string) {
      errori.delete(chi)
    },
  }
}

export function creaServizioTelefono(db: Database) {
  const limitatore = creaLimitatore()

  /** Controlla che l'utente possa gestire questo anziano (familiare o amministratore). */
  async function controllaPermesso(anzianoId: number, utenteId: number) {
    const [a] = await db.query<{ cerchioId: number }>('SELECT cerchio_id AS "cerchioId" FROM anziano WHERE id = $1', [anzianoId])
    if (!a) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Persona non trovata.')
    try {
      await richiediRuolo(db, a.cerchioId, utenteId, PUO_MODIFICARE_ANZIANO)
    } catch (e) {
      if (e instanceof ErroreApplicativo && e.stato === 404) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Persona non trovata.')
      throw e
    }
  }

  return {
    async stato(anzianoId: number, utenteId: number): Promise<StatoTelefono> {
      await controllaPermesso(anzianoId, utenteId)
      const collegati = await db.query<StatoTelefono['collegati'][number]>(
        `SELECT id, to_char(attivato_il AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "collegatoIl",
                to_char(ultimo_accesso_il AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "ultimoUsoIl"
         FROM dispositivo_anziano WHERE anziano_id = $1 AND attivato_il IS NOT NULL AND revocato_il IS NULL
         ORDER BY attivato_il DESC`,
        [anzianoId],
      )
      const [codice] = await db.query<{ scade: string }>(
        `SELECT to_char(codice_scade_il AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS scade
         FROM dispositivo_anziano WHERE anziano_id = $1 AND attivato_il IS NULL AND codice_scade_il > now()`,
        [anzianoId],
      )
      return { collegati, codiceScadeIl: codice?.scade ?? null }
    },

    /** Genera un nuovo codice a 6 cifre. Quello precedente non ancora usato smette di valere. */
    async nuovoCodice(anzianoId: number, utenteId: number): Promise<{ codice: string; scadeIl: string }> {
      await controllaPermesso(anzianoId, utenteId)
      return db.transazione(async (tx) => {
        await tx.query('DELETE FROM dispositivo_anziano WHERE anziano_id = $1 AND attivato_il IS NULL', [anzianoId])
        // Due codici validi nello stesso momento non possono essere uguali.
        for (;;) {
          const codice = String(randomInt(0, 1_000_000)).padStart(6, '0')
          const [usato] = await tx.query(
            'SELECT 1 FROM dispositivo_anziano WHERE codice_hash = $1 AND codice_scade_il > now()',
            [improntaCodice(codice)],
          )
          if (usato) continue
          const [r] = await tx.query<{ scadeIl: string }>(
            `INSERT INTO dispositivo_anziano (anziano_id, codice_hash, codice_scade_il)
             VALUES ($1, $2, now() + make_interval(hours => $3))
             RETURNING to_char(codice_scade_il AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "scadeIl"`,
            [anzianoId, improntaCodice(codice), ORE_VALIDITA_CODICE],
          )
          return { codice, scadeIl: r!.scadeIl }
        }
      })
    },

    /** "Scollega": il telefono perde l'accesso subito. */
    async scollega(anzianoId: number, dispositivoId: number, utenteId: number): Promise<void> {
      await controllaPermesso(anzianoId, utenteId)
      const r = await db.query(
        'UPDATE dispositivo_anziano SET revocato_il = now() WHERE id = $1 AND anziano_id = $2 AND revocato_il IS NULL RETURNING id',
        [dispositivoId, anzianoId],
      )
      if (!r.length) throw new ErroreApplicativo(404, 'TELEFONO_NON_TROVATO', 'Telefono non trovato.')
    },

    /** Dal telefono dell'anziano: scambia il codice con il token da tenere nel cookie. */
    async collega(codice: string, chi: string): Promise<{ token: string; anzianoId: number }> {
      limitatore.controlla(chi)
      const token = randomBytes(32).toString('base64url')
      const [r] = await db.query<{ anzianoId: number }>(
        `UPDATE dispositivo_anziano
           SET token_hash = $2, attivato_il = now(), ultimo_accesso_il = now(), codice_hash = NULL, codice_scade_il = NULL
         WHERE codice_hash = $1 AND codice_scade_il > now() AND attivato_il IS NULL AND revocato_il IS NULL
         RETURNING anziano_id AS "anzianoId"`,
        [improntaCodice(codice), impronta(token)],
      )
      if (!r) {
        limitatore.sbagliato(chi)
        throw new ErroreApplicativo(400, 'CODICE_NON_VALIDO', 'Codice non valido o scaduto. Chiedi un nuovo codice ai tuoi familiari.')
      }
      limitatore.riuscito(chi)
      return { token, anzianoId: r.anzianoId }
    },

    /** Chi è il telefono che sta chiamando, dal suo token. undefined se scollegato. */
    async daToken(token: string): Promise<AnzianoCollegato | undefined> {
      const [r] = await db.query<AnzianoCollegato>(
        `UPDATE dispositivo_anziano SET ultimo_accesso_il = now()
         WHERE token_hash = $1 AND revocato_il IS NULL
         RETURNING id AS "dispositivoId", anziano_id AS "anzianoId"`,
        [impronta(token)],
      )
      return r
    },

    /** L'anziano esce dal telefono: il token non vale più. */
    async esci(dispositivoId: number): Promise<void> {
      await db.query('UPDATE dispositivo_anziano SET revocato_il = now() WHERE id = $1', [dispositivoId])
    },
  }
}

export type ServizioTelefono = ReturnType<typeof creaServizioTelefono>
