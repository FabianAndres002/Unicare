// Endpoint del calendario degli appuntamenti e dei messaggi vocali (lato famiglia).
//
// GET    /api/anziani/:id/appuntamenti        prossimi e passati                         (tutti i membri)
// POST   /api/anziani/:id/appuntamenti        nuovo {titolo, data, ora, luogo?, note?}  (familiari, admin) 201
// PATCH  /api/appuntamenti/:id                cambia                                     (familiari, admin) 204
// DELETE /api/appuntamenti/:id                toglie                                     (familiari, admin) 204
// POST   /api/appuntamenti/:id/accompagno     "Ci vado io"                               (tutti i membri)   204
// DELETE /api/appuntamenti/:id/accompagno     "Non riesco più"                           (chi ci va)        204
//
// GET    /api/anziani/:id/vocali              messaggi vocali degli ultimi 30 giorni     (tutti i membri)
// POST   /api/anziani/:id/vocali?durata=12    nuovo vocale all'anziano (corpo: l'audio)  (tutti i membri)   201
// GET    /api/vocali/:id/audio                l'audio da ascoltare                       (tutti i membri)

import express, { Router } from 'express'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { schemaModificaAppuntamento, schemaNuovoAppuntamento, type ServizioAppuntamenti } from './appuntamenti.service.ts'
import { DIMENSIONE_MASSIMA, schemaDurata, schemaTipoAudio, type ServizioVocali } from '../vocali/vocali.service.ts'

/** Il corpo della richiesta è l'audio registrato, così com'è. */
export const corpoAudio = express.raw({ type: 'audio/*', limit: DIMENSIONE_MASSIMA })

export function rotteAppuntamenti(appuntamenti: ServizioAppuntamenti, vocali: ServizioVocali): Router {
  const router = Router()

  router.get('/anziani/:id/appuntamenti', richiedeAccesso, async (req, res) => {
    res.json(await appuntamenti.calendario(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/anziani/:id/appuntamenti', richiedeAccesso, async (req, res) => {
    const anzianoId = schemaId.parse(req.params.id)
    await appuntamenti.crea(anzianoId, res.locals.idUtente, schemaNuovoAppuntamento.parse(req.body))
    res.status(201).json(await appuntamenti.calendario(anzianoId, res.locals.idUtente))
  })

  router.patch('/appuntamenti/:id', richiedeAccesso, async (req, res) => {
    await appuntamenti.modifica(schemaId.parse(req.params.id), res.locals.idUtente, schemaModificaAppuntamento.parse(req.body))
    res.status(204).end()
  })

  router.delete('/appuntamenti/:id', richiedeAccesso, async (req, res) => {
    await appuntamenti.elimina(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.post('/appuntamenti/:id/accompagno', richiedeAccesso, async (req, res) => {
    await appuntamenti.accompagno(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.delete('/appuntamenti/:id/accompagno', richiedeAccesso, async (req, res) => {
    await appuntamenti.nonAccompagno(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.get('/anziani/:id/vocali', richiedeAccesso, async (req, res) => {
    res.json(await vocali.elenco(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/anziani/:id/vocali', richiedeAccesso, corpoAudio, async (req, res) => {
    const id = await vocali.daFamiglia(
      schemaId.parse(req.params.id),
      res.locals.idUtente,
      req.body,
      schemaTipoAudio.parse(req.get('content-type')),
      schemaDurata.parse(req.query.durata),
    )
    res.status(201).json({ id })
  })

  router.get('/vocali/:id/audio', richiedeAccesso, async (req, res) => {
    const { audio, tipo } = await vocali.audioPerFamiglia(schemaId.parse(req.params.id), res.locals.idUtente)
    res.set('Cache-Control', 'private, no-store').type(tipo).send(audio)
  })

  return router
}
