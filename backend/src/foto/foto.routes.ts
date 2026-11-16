// Endpoint delle foto profilo.
//
// PUT    /api/auth/io/foto        la mia foto (il corpo è l'immagine, max 1 MB)   → { foto }
// DELETE /api/auth/io/foto        tolgo la mia foto                               204
// PUT    /api/anziani/:id/foto    foto della persona assistita (admin, familiari) → { foto }
// DELETE /api/anziani/:id/foto    la toglie                                       204
// GET    /api/foto/:chiave        l'immagine (chiave casuale, vedi foto.ts)

import express, { Router } from 'express'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { DIMENSIONE_MASSIMA_FOTO, type ServizioFoto } from './foto.ts'

const corpoFoto = express.raw({ type: () => true, limit: DIMENSIONE_MASSIMA_FOTO })

export function rotteFoto(foto: ServizioFoto): Router {
  const router = Router()

  router.put('/auth/io/foto', richiedeAccesso, corpoFoto, async (req, res) => {
    res.json({ foto: await foto.salvaMia(res.locals.idUtente, req.body) })
  })
  router.delete('/auth/io/foto', richiedeAccesso, async (_req, res) => {
    await foto.togliMia(res.locals.idUtente)
    res.status(204).end()
  })

  router.put('/anziani/:id/foto', richiedeAccesso, corpoFoto, async (req, res) => {
    res.json({ foto: await foto.salvaAnziano(schemaId.parse(req.params.id), res.locals.idUtente, req.body) })
  })
  router.delete('/anziani/:id/foto', richiedeAccesso, async (req, res) => {
    await foto.togliAnziano(schemaId.parse(req.params.id), res.locals.idUtente)
    res.status(204).end()
  })

  router.get('/foto/:chiave', async (req, res) => {
    const { dati, tipo } = await foto.leggi(req.params.chiave)
    res
      .set({
        // La chiave cambia a ogni nuova foto: il telefono può tenerla in memoria a lungo.
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Cross-Origin-Resource-Policy': 'same-origin',
      })
      .type(tipo)
      .send(dati)
  })

  return router
}
