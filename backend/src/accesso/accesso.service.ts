// Logica di registrazione e login. Non sa nulla di HTTP: riceve dati e restituisce dati.

import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'

export type TipoUtente = 'FAMILIARE' | 'BADANTE'

/** Quello che il frontend vede di un utente (mai la password!). */
export type Profilo = { id: number; email: string; nome: string; tipo: TipoUtente; emailAvvisi: boolean }

// ---- Regole sui dati in ingresso (zod controlla e rifiuta i dati sbagliati) ----

export const schemaRegistrazione = z.object({
  email: z.string().trim().email('email non valida').max(254),
  // bcrypt considera al massimo 72 byte: oltre non avrebbe senso.
  password: z.string().min(8, 'deve avere almeno 8 caratteri').max(72),
  nome: z.string().trim().min(1, 'obbligatorio').max(80),
  cognome: z.string().trim().min(1, 'obbligatorio').max(80),
  tipo: z.enum(['FAMILIARE', 'BADANTE']),
})

export const schemaLogin = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
})

export const schemaPreferenze = z.object({ emailAvvisi: z.boolean() })

type RigaUtente = Profilo & { password_hash: string }

const CREDENZIALI_ERRATE = new ErroreApplicativo(401, 'CREDENZIALI_ERRATE', 'Email o password non corretti.')

// Hash di una password qualsiasi: serve a far durare il login sempre uguale,
// anche quando l'email non esiste (così non si scopre quali email sono registrate).
const HASH_FINTO = bcrypt.hashSync('password-che-non-esiste', 10)

export function creaServizioAccesso(db: Database) {
  return {
    async registra(dati: z.infer<typeof schemaRegistrazione>): Promise<Profilo> {
      const [esistente] = await db.query('SELECT 1 FROM utente WHERE lower(email) = lower($1)', [dati.email])
      if (esistente) {
        throw new ErroreApplicativo(409, 'EMAIL_GIA_USATA', 'Esiste già un account con questa email.')
      }
      // La password non si salva mai: solo il suo hash bcrypt.
      const hash = await bcrypt.hash(dati.password, 10)
      const [nuovo] = await db.query<Profilo>(
        `INSERT INTO utente (email, password_hash, nome, cognome, tipo)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, nome, tipo, email_avvisi AS "emailAvvisi"`,
        [dati.email, hash, dati.nome, dati.cognome, dati.tipo],
      )
      return nuovo!
    },

    async verificaCredenziali(email: string, password: string): Promise<Profilo> {
      const [utente] = await db.query<RigaUtente>(
        'SELECT id, email, nome, tipo, email_avvisi AS "emailAvvisi", password_hash FROM utente WHERE lower(email) = lower($1)',
        [email],
      )
      const corretta = await bcrypt.compare(password, utente?.password_hash ?? HASH_FINTO)
      if (!utente || !corretta) throw CREDENZIALI_ERRATE
      return { id: utente.id, email: utente.email, nome: utente.nome, tipo: utente.tipo, emailAvvisi: utente.emailAvvisi }
    },

    async trovaProfilo(id: number): Promise<Profilo | undefined> {
      const [utente] = await db.query<Profilo>('SELECT id, email, nome, tipo, email_avvisi AS "emailAvvisi" FROM utente WHERE id = $1', [id])
      return utente
    },

    async impostaPreferenze(id: number, dati: z.infer<typeof schemaPreferenze>): Promise<Profilo | undefined> {
      await db.query('UPDATE utente SET email_avvisi = $2 WHERE id = $1', [id, dati.emailAvvisi])
      return this.trovaProfilo(id)
    },
  }
}

export type ServizioAccesso = ReturnType<typeof creaServizioAccesso>
