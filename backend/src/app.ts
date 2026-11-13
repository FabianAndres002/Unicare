// Costruisce l'applicazione Express. È separata da server.ts così i test
// possono creare un'app con un database tutto loro.

import express from 'express'
import cookieParser from 'cookie-parser'
import type { Database } from './db/db.ts'
import { gestoreErrori, ErroreApplicativo } from './comune/errori.ts'
import { rotteStato } from './comune/stato.routes.ts'
import { creaServizioAccesso } from './accesso/accesso.service.ts'
import { rotteAccesso } from './accesso/accesso.routes.ts'
import { creaServizioCerchio } from './cerchio/cerchio.service.ts'
import { creaServizioInviti } from './cerchio/inviti.service.ts'
import { rotteCerchio } from './cerchio/cerchio.routes.ts'
import { creaServizioRichieste } from './richieste/richieste.service.ts'
import { rotteRichieste } from './richieste/richieste.routes.ts'
import { creaAvvisi, type Avvisi } from './notifiche/avvisi.ts'
import { postinoPredefinito, type Postino } from './notifiche/postino.ts'
import { creaServizioTelefono } from './senior/telefono.service.ts'
import { rotteSenior } from './senior/senior.routes.ts'

/** postino: chi consegna le email (i test ne passano uno finto). */
export function creaApp(db: Database, opzioni: { postino?: Postino } = {}): express.Express & { avvisi: Avvisi } {
  const app = express()
  const avvisi = creaAvvisi(db, opzioni.postino ?? postinoPredefinito())
  const richieste = creaServizioRichieste(db, avvisi)

  app.disable('x-powered-by')
  app.use(express.json({ limit: '100kb' })) // legge i corpi JSON
  app.use(cookieParser()) // legge i cookie (serve per la sessione)

  app.use('/api', rotteStato(db))
  app.use('/api/auth', rotteAccesso(creaServizioAccesso(db)))
  app.use('/api', rotteCerchio(creaServizioCerchio(db), creaServizioInviti(db)))
  app.use('/api', rotteRichieste(richieste))
  app.use('/api', rotteSenior(db, creaServizioTelefono(db), richieste))

  // Qualsiasi altro indirizzo /api: 404 in JSON.
  app.use('/api', () => {
    throw new ErroreApplicativo(404, 'NON_TROVATO', 'Indirizzo non trovato.')
  })

  app.use(gestoreErrori)
  return Object.assign(app, { avvisi })
}
