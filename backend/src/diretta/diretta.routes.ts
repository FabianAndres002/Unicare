// GET /api/diretta   aggiornamenti in diretta per chi ha fatto il login (text/event-stream)
// (per il telefono dell'anziano c'è GET /api/senior/diretta, in senior.routes.ts)

import { Router } from 'express'
import { richiedeAccesso } from '../accesso/sessione.ts'
import type { Diretta } from './diretta.ts'

export function rotteDiretta(diretta: Diretta): Router {
  const router = Router()
  router.get('/diretta', richiedeAccesso, (req, res) => {
    diretta.apri(`u${res.locals.idUtente}`, req, res)
  })
  return router
}
