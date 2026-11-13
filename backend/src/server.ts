// Punto di avvio del backend: apre il database, applica le migrazioni e si mette in ascolto.
// Avvio in sviluppo: npm run dev  (si riavvia da solo quando modifichi un file)

import { config } from './config.ts'
import { apriDatabaseEsterno, apriDatabaseIntegrato, type Database } from './db/db.ts'
import { eseguiMigrazioni } from './db/migrazioni.ts'
import { creaApp } from './app.ts'

let db: Database
if (config.databaseUrl) {
  db = apriDatabaseEsterno(config.databaseUrl)
  console.log('Database: PostgreSQL esterno (DATABASE_URL)')
} else {
  db = await apriDatabaseIntegrato(config.cartellaDatabaseLocale)
  console.log(`Database: PostgreSQL integrato, dati in ${config.cartellaDatabaseLocale}`)
}

await eseguiMigrazioni(db)

const app = creaApp(db)

// Ogni minuto: promemoria delle medicine e degli appuntamenti, pulizia dei vocali vecchi.
const giro = () => app.pianificatore.giro().catch((e) => console.error('Pianificatore:', e))
giro()
const timer = setInterval(giro, 60_000)

const server = app.listen(config.porta, () => {
  // Il comando di VS Code aspetta questa riga per sapere che il backend è pronto.
  console.log(`Unicare backend in ascolto su http://localhost:${config.porta}`)
})

// Spegnimento pulito (Ctrl+C): chiude il server e poi il database, così i dati restano integri.
async function spegni() {
  console.log('Spegnimento in corso...')
  clearInterval(timer)
  server.close()
  await db.chiudi()
  process.exit(0)
}
process.on('SIGINT', spegni)
process.on('SIGTERM', spegni)
