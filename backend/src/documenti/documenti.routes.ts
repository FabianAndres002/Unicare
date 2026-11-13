// Endpoint dei documenti sanitari (familiari e amministratore).
//
// GET    /api/anziani/:id/documenti     elenco, consenso, spese mediche dell'anno
// POST   /api/anziani/:id/documenti?categoria=&titolo=&data=&note=&importo=&nome=&consenso=true
//                                       carica: il corpo è il file (foto o PDF, max 10 MB)   201
// GET    /api/documenti/:id/file        il file
// PATCH  /api/documenti/:id             cambia categoria, titolo, data, note, importo
// DELETE /api/documenti/:id             toglie                                             204

import express, { Router } from 'express'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { DIMENSIONE_MASSIMA_DOCUMENTO, schemaModificaDocumento, schemaNuovoDocumento, type ServizioDocumenti } from './documenti.service.ts'

const corpoFile = express.raw({ type: () => true, limit: DIMENSIONE_MASSIMA_DOCUMENTO })

export function rotteDocumenti(documenti: ServizioDocumenti): Router {
  const router = Router()

  router.get('/anziani/:id/documenti', richiedeAccesso, async (req, res) => {
    res.json(await documenti.archivio(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/anziani/:id/documenti', richiedeAccesso, corpoFile, async (req, res) => {
    const id = await documenti.carica(schemaId.parse(req.params.id), res.locals.idUtente, schemaNuovoDocumento.parse(req.query), req.body)
    res.status(201).json({ id })
  })

  router.get('/documenti/:id/file', richiedeAccesso, async (req, res) => {
    const { file, tipo, nome } = await documenti.file(schemaId.parse(req.params.id), res.locals.idUtente)
    res
      .set({
        'Cache-Control': 'private, no-store',
        // Il file non deve mai essere eseguito come pagina: si scarica e basta.
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(nome)}`,
      })
      .type(tipo)
      .send(file)
  })

  router.patch('/documenti/:id', richiedeAccesso, async (req, res) => {
    res.json(await documenti.modifica(schemaId.parse(req.params.id), res.locals.idUtente, schemaModificaDocumento.parse(req.body)))
  })

  router.delete('/documenti/:id', richiedeAccesso, async (req, res) => {
    await documenti.elimina(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  return router
}
