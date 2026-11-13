// Endpoint di "Cerco una badante".
//
// Famiglia:
// POST /api/cerchi/:id/ricerche-badante    pubblica una ricerca                          201
// GET  /api/cerchi/:id/ricerche-badante    le ricerche del cerchio, con le proposte nuove
// GET  /api/ricerche-badante/:id           la ricerca e le proposte (con il profilo)
// POST /api/ricerche-badante/:id/chiudi    abbiamo trovato / non cerchiamo più           204
// POST /api/proposte/:id/scegli            "Scrivile" {testo}: apre la conversazione     201
// POST /api/proposte/:id/rifiuta           "No, grazie"                                  204
// Badante:
// GET  /api/lavoro/ricerche?provincia=     le famiglie che cercano (senza nomi)
// GET  /api/lavoro/ricerche/:id            una ricerca
// POST /api/lavoro/ricerche/:id/proposte   mi propongo {messaggio}                       201
// GET  /api/lavoro/proposte                le mie proposte
// POST /api/lavoro/proposte/:id/ritira     ritiro la proposta                            204

import { Router } from 'express'
import { z } from 'zod'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { schemaNuovaRicerca, schemaProposta, schemaScegli, type ServizioRicerche } from './ricerche.service.ts'

const schemaProvincia = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional()

export function rotteRicerche(ricerche: ServizioRicerche): Router {
  const router = Router()

  router.post('/cerchi/:id/ricerche-badante', richiedeAccesso, async (req, res) => {
    res.status(201).json(await ricerche.pubblica(schemaId.parse(req.params.id), res.locals.idUtente, schemaNuovaRicerca.parse(req.body)))
  })

  router.get('/cerchi/:id/ricerche-badante', richiedeAccesso, async (req, res) => {
    res.json(await ricerche.ricercheDelCerchio(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.get('/ricerche-badante/:id', richiedeAccesso, async (req, res) => {
    res.json(await ricerche.dettaglioPerFamiglia(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/ricerche-badante/:id/chiudi', richiedeAccesso, async (req, res) => {
    await ricerche.chiudi(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.post('/proposte/:id/scegli', richiedeAccesso, async (req, res) => {
    const { testo } = schemaScegli.parse(req.body)
    res.status(201).json(await ricerche.scegli(schemaId.parse(req.params.id), res.locals.idUtente, testo))
  })

  router.post('/proposte/:id/rifiuta', richiedeAccesso, async (req, res) => {
    await ricerche.rifiuta(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.get('/lavoro/ricerche', richiedeAccesso, async (req, res) => {
    const provincia = schemaProvincia.parse(req.query.provincia || undefined)
    res.json(await ricerche.aperte(res.locals.idUtente, provincia))
  })

  router.get('/lavoro/ricerche/:id', richiedeAccesso, async (req, res) => {
    res.json(await ricerche.ricercaPerBadante(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/lavoro/ricerche/:id/proposte', richiedeAccesso, async (req, res) => {
    const { messaggio } = schemaProposta.parse(req.body)
    res.status(201).json(await ricerche.proponiti(schemaId.parse(req.params.id), res.locals.idUtente, messaggio))
  })

  router.get('/lavoro/proposte', richiedeAccesso, async (_req, res) => {
    res.json(await ricerche.mieProposte(res.locals.idUtente))
  })

  router.post('/lavoro/proposte/:id/ritira', richiedeAccesso, async (req, res) => {
    await ricerche.ritira(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  return router
}
