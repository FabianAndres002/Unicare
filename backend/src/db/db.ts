// Accesso al database. Tutto il resto del backend usa solo "query" e "transazione".
//
// - In sviluppo e nei test: PGlite, un vero PostgreSQL che gira dentro Node.
//   Niente da installare; i dati restano nella cartella .database-locale.
// - In produzione: un PostgreSQL normale, indicato da DATABASE_URL (libreria "pg").

import { PGlite } from '@electric-sql/pglite'
import pg from 'pg'

/** Il minimo che ci serve da un database: eseguire una query con parametri $1, $2... */
export interface Esecutore {
  query<R>(sql: string, parametri?: unknown[]): Promise<R[]>
}

export interface Database extends Esecutore {
  /** Esegue più istruzioni SQL in un colpo (usato dalle migrazioni). */
  eseguiScript(sql: string): Promise<void>
  /** Tutto quello che fa "lavoro" va a buon fine insieme, oppure viene annullato insieme. */
  transazione<T>(lavoro: (tx: Esecutore) => Promise<T>): Promise<T>
  chiudi(): Promise<void>
}

/** PostgreSQL integrato. cartella = undefined → solo in memoria (usato nei test). */
export async function apriDatabaseIntegrato(cartella?: string): Promise<Database> {
  const db = cartella ? new PGlite(cartella) : new PGlite()
  await db.waitReady
  return {
    async query<R>(sql: string, parametri: unknown[] = []) {
      return (await db.query<R>(sql, parametri)).rows
    },
    async eseguiScript(sql) {
      await db.exec(sql)
    },
    async transazione(lavoro) {
      return db.transaction((tx) =>
        lavoro({ query: async <R>(sql: string, p: unknown[] = []) => (await tx.query<R>(sql, p)).rows }),
      )
    },
    chiudi: () => db.close(),
  }
}

/** PostgreSQL esterno (produzione). */
export function apriDatabaseEsterno(url: string): Database {
  // Come PGlite: gli id BIGINT e i COUNT arrivano come numeri, non come testo.
  pg.types.setTypeParser(pg.types.builtins.INT8, Number)
  const pool = new pg.Pool({ connectionString: url, max: 5 })
  return {
    async query<R>(sql: string, parametri: unknown[] = []) {
      return (await pool.query(sql, parametri)).rows as R[]
    },
    async eseguiScript(sql) {
      await pool.query(sql)
    },
    async transazione(lavoro) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const risultato = await lavoro({
          query: async <R>(sql: string, p: unknown[] = []) => (await client.query(sql, p)).rows as R[],
        })
        await client.query('COMMIT')
        return risultato
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
      }
    },
    chiudi: () => pool.end(),
  }
}
