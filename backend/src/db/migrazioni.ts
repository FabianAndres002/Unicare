// Migrazioni del database: i file V1__..., V2__... nella cartella "migrazioni"
// vengono eseguiti in ordine, una volta sola ciascuno (come faceva Flyway in Java).
// Regola: un file già eseguito non si modifica mai; per cambiare qualcosa si crea il successivo.

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { Database } from './db.ts'

const cartella = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrazioni')

export async function eseguiMigrazioni(db: Database, log = console.log): Promise<void> {
  await db.eseguiScript(`
    CREATE TABLE IF NOT EXISTS migrazione_eseguita (
      versione     INT PRIMARY KEY,
      nome         TEXT NOT NULL,
      eseguita_il  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`)

  const giaEseguite = new Set(
    (await db.query<{ versione: number }>('SELECT versione FROM migrazione_eseguita')).map((r) => r.versione),
  )

  const file = readdirSync(cartella)
    .map((nome) => ({ nome, versione: Number(/^V(\d+)__/.exec(nome)?.[1]) }))
    .filter((f) => f.nome.endsWith('.sql') && Number.isInteger(f.versione))
    .sort((a, b) => a.versione - b.versione)

  for (const f of file) {
    if (giaEseguite.has(f.versione)) continue
    const sql = readFileSync(path.join(cartella, f.nome), 'utf8')
    // Script e registrazione nella stessa transazione: o tutto o niente.
    await db.eseguiScript(`BEGIN;\n${sql}\n;INSERT INTO migrazione_eseguita (versione, nome) VALUES (${f.versione}, '${f.nome.replaceAll("'", "''")}');\nCOMMIT;`)
    log(`Migrazione eseguita: ${f.nome}`)
  }
}
