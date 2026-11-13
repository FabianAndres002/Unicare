// Endpoint delle richieste di aiuto. Tutti richiedono il login e l'appartenenza al cerchio.
//
// GET  /api/cerchi/:id/richieste?vista=attive|concluse   elenco
// POST /api/cerchi/:id/richieste                          nuova richiesta          (201)
// GET  /api/richieste/:id                                 dettaglio con lo storico
// POST /api/richieste/:id/prendi                          "Me ne occupo io"
// POST /api/richieste/:id/rilascia                        "Non riesco più"
// POST /api/richieste/:id/completa                        "Fatto"  (nota facoltativa)
// POST /api/richieste/:id/annulla                         "Non serve più"

import { Router } from 'express'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { schemaNota, schemaNuovaRichiesta, schemaVista, type Azione, type ServizioRichieste } from './richieste.service.ts'

const AZIONI: Record<string, Azione> = { prendi: 'PRENDI', rilascia: 'RILASCIA', completa: 'COMPLETA', annulla: 'ANNULLA' }

export function rotteRichieste(richieste: ServizioRichieste): Router {
  const router = Router()

  router.get('/cerchi/:id/richieste', richiedeAccesso, async (req, res) => {
    res.json(await richieste.elenco(schemaId.parse(req.params.id), res.locals.idUtente, schemaVista.parse(req.query.vista)))
  })

  router.post('/cerchi/:id/richieste', richiedeAccesso, async (req, res) => {
    const dati = schemaNuovaRichiesta.parse(req.body)
    res.status(201).json(await richieste.crea(schemaId.parse(req.params.id), res.locals.idUtente, dati))
  })

  router.get('/richieste/:id', richiedeAccesso, async (req, res) => {
    res.json(await richieste.dettaglio(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/richieste/:id/:azione', richiedeAccesso, async (req, res, next) => {
    const azione = AZIONI[String(req.params.azione)]
    if (!azione) return next() // indirizzo sconosciuto: arriva al 404
    const { nota } = schemaNota.parse(req.body ?? {})
    res.json(await richieste.esegui(schemaId.parse(req.params.id), res.locals.idUtente, azione, nota))
  })

  return router
}
