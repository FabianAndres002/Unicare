// Accesso al database. Tutto il resto del backend usa solo "query" e "transazione".
//
// - In sviluppo e nei test: PGlite, un vero PostgreSQL che gira dentro Node.
//   Niente da installare; i dati restano nella cartella .database-locale.
// - In produzione: un PostgreSQL normale, indicato da DATABASE_URL (libreria "pg").

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

// Creare un database da zero (initdb) chiede più di 600 MB per qualche secondo: troppo per Render.
// Per questo "npm run prepara-database" (nel comando di build) prepara un database vuoto già pronto,
// e al primo avvio lo si copia nella cartella invece di crearlo da zero.
export const fileModelloDatabase = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../.modello-database.tgz',
)

// Memoria piccola: su Render il server ha 512 MB in tutto. Per pochi utenti bastano 16 MB di cache.
export const parametriAvvio = [...PGlite.defaultStartParams, '-c', 'shared_buffers=16MB']

/** PostgreSQL integrato. cartella = undefined → solo in memoria (usato nei test). */
export async function apriDatabaseIntegrato(cartella?: string): Promise<Database> {
  let db: PGlite
  if (!cartella) {
    db = new PGlite({ startParams: parametriAvvio })
  } else {
    mkdirSync(cartella, { recursive: true })
    const nuovo = !existsSync(path.join(cartella, 'PG_VERSION'))
    const modello = nuovo && existsSync(fileModelloDatabase)
    db = new PGlite(cartella, {
      startParams: parametriAvvio,
      ...(modello ? { loadDataDir: new Blob([readFileSync(fileModelloDatabase)]) } : {}),
    })
    if (modello) console.log('Database nuovo creato dal modello già pronto')
  }
  await db.waitReady
  return comeDatabase(db)
}

/** Avvolge un PGlite già aperto con l'interfaccia Database. */
export function comeDatabase(db: PGlite): Database {
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
