// Prepara un database vuoto già inizializzato e con tutte le tabelle (.modello-database.tgz).
// Si usa nel comando di build di Render: al primo avvio il server lo copia invece di creare
// il database da zero, che richiederebbe troppa memoria. Vedi src/db/db.ts.

import { writeFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { comeDatabase, fileModelloDatabase, parametriAvvio } from '../src/db/db.ts'
import { eseguiMigrazioni } from '../src/db/migrazioni.ts'

const db = new PGlite({ startParams: parametriAvvio })
await db.waitReady
// Anche le migrazioni si fanno qui, così il primo avvio online non deve fare quasi niente.
await eseguiMigrazioni(comeDatabase(db), () => {})
const archivio = await db.dumpDataDir('gzip')
writeFileSync(fileModelloDatabase, Buffer.from(await archivio.arrayBuffer()))
await db.close()
console.log(`Modello del database pronto: ${fileModelloDatabase}`)
