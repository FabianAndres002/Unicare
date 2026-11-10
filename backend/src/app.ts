// Costruisce l'applicazione Express. È separata da server.ts così i test
// possono creare un'app con un database tutto loro.

import express from 'express'
import cookieParser from 'cookie-parser'
import type { Database } from './db/db.ts'
import { gestoreErrori, ErroreApplicativo } from './comune/errori.ts'
import { rotteStato } from './comune/stato.routes.ts'
import { creaServizioAccesso } from './accesso/accesso.service.ts'
import { rotteAccesso } from './accesso/accesso.routes.ts'

export function creaApp(db: Database) {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' })) // legge i corpi JSON
  app.use(cookieParser()) // legge i cookie (serve per la sessione)

  app.use('/api', rotteStato(db))
  app.use('/api/auth', rotteAccesso(creaServizioAccesso(db)))

  // Qualsiasi altro indirizzo /api: 404 in JSON.
  app.use('/api', () => {
    throw new ErroreApplicativo(404, 'NON_TROVATO', 'Indirizzo non trovato.')
  })

  app.use(gestoreErrori)
  return app
}
