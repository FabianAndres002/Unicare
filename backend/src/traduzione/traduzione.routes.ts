// Endpoint dell'interprete (per familiari e badanti; quello dell'anziano è in senior.routes.ts).
//
// GET  /api/traduci           l'interprete è attivo? quale servizio usa?
// POST /api/traduci           {testo, da, a} → {traduzione}

import { Router } from 'express'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { LINGUE, schemaTraduzione, type ServizioTraduzione } from './traduzione.service.ts'

export function rotteTraduzione(traduzione: ServizioTraduzione): Router {
  const router = Router()

  router.get('/traduci', richiedeAccesso, (_req, res) => {
    res.json({ disponibile: traduzione.disponibile, servizio: traduzione.servizio, lingue: LINGUE })
  })

  router.post('/traduci', richiedeAccesso, async (req, res) => {
    res.json(await traduzione.traduci(`u${res.locals.idUtente}`, schemaTraduzione.parse(req.body)))
  })

  return router
}
