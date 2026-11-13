// Endpoint dei promemoria delle medicine (lato famiglia) e delle notifiche push.
//
// GET    /api/anziani/:id/medicine     promemoria, cosa è successo oggi, consenso    (tutti i membri)
// POST   /api/anziani/:id/promemoria   nuovo promemoria {momento, ora, consenso}      (familiari, admin) 201
// PATCH  /api/promemoria/:id           cambia orario o lo spegne {ora?, attivo?}      (familiari, admin)
// DELETE /api/promemoria/:id           toglie il promemoria                           (familiari, admin) 204
//
// GET    /api/push/chiave              chiave pubblica per iscriversi alle notifiche  (nessun login)
// POST   /api/push/iscrizione          questo browser riceve le notifiche dell'utente (login)        204
// DELETE /api/push/iscrizione          non più                                         (login)        204

import { Router } from 'express'
import { z } from 'zod'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { schemaIscrizione, type Push } from '../notifiche/push.ts'
import { schemaModificaPromemoria, schemaNuovoPromemoria, type Pianificatore, type ServizioMedicine } from './medicine.service.ts'

export function rotteMedicine(medicine: ServizioMedicine, pianificatore: Pianificatore, push: Push): Router {
  const router = Router()

  router.get('/anziani/:id/medicine', richiedeAccesso, async (req, res) => {
    res.json(await medicine.perFamiglia(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/anziani/:id/promemoria', richiedeAccesso, async (req, res) => {
    const anzianoId = schemaId.parse(req.params.id)
    await medicine.crea(anzianoId, res.locals.idUtente, schemaNuovoPromemoria.parse(req.body))
    await pianificatore.giro() // così l'orario di oggi compare subito
    res.status(201).json(await medicine.perFamiglia(anzianoId, res.locals.idUtente))
  })

  router.patch('/promemoria/:id', richiedeAccesso, async (req, res) => {
    await medicine.modifica(schemaId.parse(req.params.id), res.locals.idUtente, schemaModificaPromemoria.parse(req.body))
    await pianificatore.giro()
    res.status(204).end()
  })

  router.delete('/promemoria/:id', richiedeAccesso, async (req, res) => {
    await medicine.elimina(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.get('/push/chiave', async (_req, res) => {
    res.json({ chiave: await push.chiavePubblica() })
  })

  router.post('/push/iscrizione', richiedeAccesso, async (req, res) => {
    await push.iscriviUtente(res.locals.idUtente, schemaIscrizione.parse(req.body))
    res.status(204).end()
  })

  router.delete('/push/iscrizione', richiedeAccesso, async (req, res) => {
    const { endpoint } = z.object({ endpoint: z.string().max(1000) }).parse(req.body)
    await push.cancellaUtente(endpoint, res.locals.idUtente)
    res.status(204).end()
  })

  return router
}
