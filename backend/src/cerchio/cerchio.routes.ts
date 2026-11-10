// Endpoint di cerchi, anziani e inviti. Tutti richiedono il login,
// tranne l'anteprima dell'invito (chi apre il link potrebbe non avere ancora un account).
//
// GET    /api/cerchi                         i miei cerchi
// POST   /api/cerchi                         crea un cerchio (solo familiari)        (201)
// GET    /api/cerchi/:id                     dettaglio: anziani, membri, inviti
// PATCH  /api/cerchi/:id                     rinomina (admin)
// DELETE /api/cerchi/:id/membri/:utenteId    toglie un membro (admin)                (204)
// POST   /api/cerchi/:id/anziani             aggiunge un anziano, con consenso       (201)
// PUT    /api/anziani/:id                    modifica la scheda (admin, familiari)
// POST   /api/cerchi/:id/inviti              crea un invito (admin)                  (201)
// DELETE /api/inviti/:id                     annulla un invito (admin)               (204)
// GET    /api/inviti/token/:token            anteprima dell'invito (senza login)
// POST   /api/inviti/token/:token/accetta    entra nel cerchio

import { Router } from 'express'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { schemaAnziano, schemaCerchio, schemaNuovoAnziano, type ServizioCerchio } from './cerchio.service.ts'
import { schemaInvito, type ServizioInviti } from './inviti.service.ts'

export function rotteCerchio(cerchi: ServizioCerchio, inviti: ServizioInviti): Router {
  const router = Router()

  // L'unica rotta senza login.
  router.get('/inviti/token/:token', async (req, res) => {
    res.json(await inviti.anteprima(req.params.token))
  })

  // Tutte le altre passano prima da richiedeAccesso.
  router.get('/cerchi', richiedeAccesso, async (_req, res) => {
    res.json(await cerchi.elenco(res.locals.idUtente))
  })

  router.post('/cerchi', richiedeAccesso, async (req, res) => {
    res.status(201).json(await cerchi.crea(res.locals.idUtente, schemaCerchio.parse(req.body)))
  })

  router.get('/cerchi/:id', richiedeAccesso, async (req, res) => {
    res.json(await cerchi.dettaglio(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.patch('/cerchi/:id', richiedeAccesso, async (req, res) => {
    res.json(await cerchi.rinomina(schemaId.parse(req.params.id), res.locals.idUtente, schemaCerchio.parse(req.body)))
  })

  router.delete('/cerchi/:id/membri/:utenteId', richiedeAccesso, async (req, res) => {
    await cerchi.rimuoviMembro(schemaId.parse(req.params.id), res.locals.idUtente, schemaId.parse(req.params.utenteId))
    res.status(204).end()
  })

  router.post('/cerchi/:id/anziani', richiedeAccesso, async (req, res) => {
    const dati = schemaNuovoAnziano.parse(req.body)
    res.status(201).json(await cerchi.aggiungiAnziano(schemaId.parse(req.params.id), res.locals.idUtente, dati))
  })

  router.put('/anziani/:id', richiedeAccesso, async (req, res) => {
    res.json(await cerchi.modificaAnziano(schemaId.parse(req.params.id), res.locals.idUtente, schemaAnziano.parse(req.body)))
  })

  router.post('/cerchi/:id/inviti', richiedeAccesso, async (req, res) => {
    res.status(201).json(await inviti.crea(schemaId.parse(req.params.id), res.locals.idUtente, schemaInvito.parse(req.body)))
  })

  router.delete('/inviti/:id', richiedeAccesso, async (req, res) => {
    await inviti.revoca(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.post('/inviti/token/:token/accetta', richiedeAccesso, async (req, res) => {
    res.json(await inviti.accetta(String(req.params.token), res.locals.idUtente))
  })

  return router
}
