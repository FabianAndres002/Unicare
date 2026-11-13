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

export const schemaEliminaAccount = z.object({ password: z.string().min(1, 'Scrivi la tua password per confermare.') })

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

    /**
     * Tutti i dati personali dell'utente, da scaricare (diritto di accesso e portabilità, GDPR art. 15 e 20).
     * Dei cerchi riporta solo il suo ruolo e cosa ha fatto lui: i dati degli altri non sono suoi.
     */
    async esportaDati(id: number) {
      const [profilo] = await db.query(
        `SELECT email, nome, cognome, tipo, email_avvisi AS "emailAvvisi", creato_il AS "registratoIl" FROM utente WHERE id = $1`,
        [id],
      )
      if (!profilo) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
      return {
        esportatoIl: new Date().toISOString(),
        profilo,
        cerchi: await db.query(
          `SELECT c.nome, m.ruolo, m.entrato_il AS "entratoIl" FROM membro_cerchio m JOIN cerchio c ON c.id = m.cerchio_id WHERE m.utente_id = $1`,
          [id],
        ),
        richiesteCreate: await db.query(
          `SELECT categoria, testo, stato, creata_il AS "creataIl" FROM richiesta WHERE creata_da = $1 ORDER BY creata_il`,
          [id],
        ),
        richiestePrese: await db.query(
          `SELECT categoria, testo, stato, presa_il AS "presaIl" FROM richiesta WHERE presa_da = $1 ORDER BY presa_il`,
          [id],
        ),
        appuntamentiAccompagnati: await db.query(
          `SELECT titolo, quando, luogo FROM appuntamento WHERE accompagna_id = $1 ORDER BY quando`,
          [id],
        ),
        messaggiVocaliMandati: await db.query(
          `SELECT creato_il AS "mandatoIl", durata_secondi AS "durataSecondi" FROM messaggio_vocale WHERE autore_id = $1 ORDER BY creato_il`,
          [id],
        ),
        consensiDati: await db.query(
          `SELECT tipo, versione_testo AS versione, dato_il AS "datoIl", revocato_il AS "revocatoIl" FROM consenso WHERE dato_da = $1 OR utente_id = $1 ORDER BY dato_il`,
          [id],
        ),
        telefoniConNotifiche: (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM iscrizione_push WHERE utente_id = $1', [id]))[0]!.n,
      }
    },

    /**
     * Cancella l'account (diritto all'oblio, GDPR art. 17), dopo aver ricontrollato la password.
     * Nei cerchi che amministrava: se resta un altro familiare, diventa lui l'amministratore;
     * se non resta nessun familiare, il cerchio viene cancellato con la scheda e tutti i dati.
     * Restano, senza il suo nome, le richieste e gli appuntamenti che riguardano l'anziano.
     */
    async eliminaAccount(id: number, password: string): Promise<{ cerchiCancellati: number }> {
      const [utente] = await db.query<{ hash: string }>('SELECT password_hash AS hash FROM utente WHERE id = $1', [id])
      if (!utente) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
      if (!(await bcrypt.compare(password, utente.hash))) throw new ErroreApplicativo(403, 'PASSWORD_ERRATA', 'La password non è corretta.')
      return db.transazione(async (tx) => {
        const amministrati = await tx.query<{ cerchioId: number }>(
          `SELECT cerchio_id AS "cerchioId" FROM membro_cerchio WHERE utente_id = $1 AND ruolo = 'ADMIN'`,
          [id],
        )
        let cerchiCancellati = 0
        for (const { cerchioId } of amministrati) {
          const [erede] = await tx.query<{ id: number }>(
            `SELECT utente_id AS id FROM membro_cerchio WHERE cerchio_id = $1 AND utente_id <> $2 AND ruolo IN ('ADMIN', 'FAMILIARE')
             ORDER BY (ruolo = 'ADMIN') DESC, entrato_il LIMIT 1`,
            [cerchioId, id],
          )
          if (erede) {
            await tx.query(`UPDATE membro_cerchio SET ruolo = 'ADMIN' WHERE cerchio_id = $1 AND utente_id = $2`, [cerchioId, erede.id])
          } else {
            await tx.query('DELETE FROM cerchio WHERE id = $1', [cerchioId])
            cerchiCancellati++
          }
        }
        await tx.query('DELETE FROM utente WHERE id = $1', [id])
        return { cerchiCancellati }
      })
    },

    async impostaPreferenze(id: number, dati: z.infer<typeof schemaPreferenze>): Promise<Profilo | undefined> {
      await db.query('UPDATE utente SET email_avvisi = $2 WHERE id = $1', [id, dati.emailAvvisi])
      return this.trovaProfilo(id)
    },
  }
}

export type ServizioAccesso = ReturnType<typeof creaServizioAccesso>
