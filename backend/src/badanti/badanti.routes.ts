// Endpoint per badanti che si propongono e famiglie che le cercano.
//
// Badante:
// GET  /api/badante/profilo               il mio profilo professionale (null se non c'è ancora)
// PUT  /api/badante/profilo               salva il profilo e "Mi propongo" (visibile)       204
// Famiglia:
// GET  /api/badanti?provincia=&servizio=&disponibilita=   badanti che si propongono
// GET  /api/badanti/:id                   il profilo di una badante
// POST /api/badanti/:id/messaggi          primo messaggio {testo}: apre la conversazione   201
// Tutti e due:
// GET  /api/contatti                      le mie conversazioni
// GET  /api/contatti/:id                  i messaggi (segna come letti quelli ricevuti)
// POST /api/contatti/:id/messaggi         risponde {testo}                                  204
// POST /api/contatti/:id/chiudi           la badante chiude o riapre {chiusa}               204
// POST /api/contatti/:id/invita           la famiglia la invita nel cerchio {cerchioId}     204

import { Router } from 'express'
import { z } from 'zod'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { schemaInvitaDaContatto, schemaMessaggio, schemaProfiloBadante, schemaRicerca, type ServizioBadanti } from './badanti.service.ts'

export function rotteBadanti(badanti: ServizioBadanti): Router {
  const router = Router()

  router.get('/badante/profilo', richiedeAccesso, async (_req, res) => {
    res.json(await badanti.mioProfilo(res.locals.idUtente))
  })

  router.put('/badante/profilo', richiedeAccesso, async (req, res) => {
    await badanti.salvaProfilo(res.locals.idUtente, schemaProfiloBadante.parse(req.body))
    res.status(204).end()
  })

  router.get('/badanti', richiedeAccesso, async (req, res) => {
    const q = Object.fromEntries(Object.entries(req.query).filter(([, v]) => v !== ''))
    res.json(await badanti.cerca(res.locals.idUtente, schemaRicerca.parse(q)))
  })

  router.get('/badanti/:id', richiedeAccesso, async (req, res) => {
    res.json(await badanti.scheda(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/badanti/:id/messaggi', richiedeAccesso, async (req, res) => {
    const { testo } = schemaMessaggio.parse(req.body)
    res.status(201).json(await badanti.scrivi(schemaId.parse(req.params.id), res.locals.idUtente, testo))
  })

  router.get('/contatti', richiedeAccesso, async (_req, res) => {
    res.json(await badanti.conversazioni(res.locals.idUtente))
  })

  router.get('/contatti/:id', richiedeAccesso, async (req, res) => {
    res.json(await badanti.messaggi(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/contatti/:id/messaggi', richiedeAccesso, async (req, res) => {
    const { testo } = schemaMessaggio.parse(req.body)
    await badanti.rispondi(schemaId.parse(req.params.id), res.locals.idUtente, testo)
    res.status(204).end()
  })

  router.post('/contatti/:id/chiudi', richiedeAccesso, async (req, res) => {
    const { chiusa } = z.object({ chiusa: z.boolean() }).parse(req.body)
    await badanti.blocca(schemaId.parse(req.params.id), res.locals.idUtente, chiusa)
    res.status(204).end()
  })

  router.post('/contatti/:id/invita', richiedeAccesso, async (req, res) => {
    const { cerchioId } = schemaInvitaDaContatto.parse(req.body)
    await badanti.invita(schemaId.parse(req.params.id), res.locals.idUtente, cerchioId)
    res.status(204).end()
  })

  return router
}
