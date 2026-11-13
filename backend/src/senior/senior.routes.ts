// Endpoint della Senior App (il telefono dell'anziano) e del collegamento del telefono.
//
// Dal telefono dell'anziano (cookie "unicare_senior"):
// POST /api/senior/collega                  scambia il codice a 6 cifre con il collegamento
// GET  /api/senior/io                       nome, famiglia e richieste dell'anziano
// POST /api/senior/richieste                "Chiedi aiuto" con una categoria        (201, 200 se già chiesta)
// POST /api/senior/richieste/:id/annulla    "Non serve più"                          (204)
// POST /api/senior/esci                     scollega questo telefono                 (204)
//
// Dai familiari (login normale, ruolo familiare o amministratore):
// GET    /api/anziani/:id/telefono                   telefoni collegati e codice in attesa
// POST   /api/anziani/:id/telefono/codice            nuovo codice a 6 cifre                 (201)
// DELETE /api/anziani/:id/telefono/:dispositivoId    scollega un telefono                   (204)

import { Router, type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { schemaId } from '../comune/validazione.ts'
import { richiedeAccesso } from '../accesso/sessione.ts'
import { CATEGORIE, type ServizioRichieste } from '../richieste/richieste.service.ts'
import { schemaCodice, type AnzianoCollegato, type ServizioTelefono } from './telefono.service.ts'

const COOKIE = 'unicare_senior'

// Dalla Senior App si sceglie solo tra pulsanti: niente "Altro" da scrivere (arriverà con la voce).
const schemaRichiestaSenior = z.object({ categoria: z.enum(CATEGORIE.filter((c) => c !== 'ALTRO') as [string, ...string[]]) })

export function rotteSenior(db: Database, telefono: ServizioTelefono, richieste: ServizioRichieste): Router {
  const router = Router()

  /** Come richiedeAccesso, ma per il telefono dell'anziano. */
  async function richiedeTelefono(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.[COOKIE]
    const collegato = typeof token === 'string' ? await telefono.daToken(token) : undefined
    if (!collegato) {
      res.clearCookie(COOKIE, { path: '/' })
      throw new ErroreApplicativo(401, 'TELEFONO_NON_COLLEGATO', 'Questo telefono non è collegato.')
    }
    res.locals.senior = collegato
    next()
  }
  const senior = (res: Response) => res.locals.senior as AnzianoCollegato

  router.post('/senior/collega', async (req, res) => {
    const { codice } = schemaCodice.parse(req.body)
    const { token } = await telefono.collega(codice, req.ip ?? 'sconosciuto')
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.inProduzione,
      maxAge: config.durataTelefonoAnzianoGiorni * 24 * 60 * 60 * 1000,
      path: '/',
    })
    res.status(204).end()
  })

  router.get('/senior/io', richiedeTelefono, async (_req, res) => {
    const { anzianoId } = senior(res)
    const [anziano] = await db.query<{ nome: string; cognome: string; cerchio: string; cerchioId: number }>(
      `SELECT a.nome, a.cognome, c.nome AS cerchio, c.id AS "cerchioId"
       FROM anziano a JOIN cerchio c ON c.id = a.cerchio_id WHERE a.id = $1`,
      [anzianoId],
    )
    const famiglia = await db.query<{ nome: string; ruolo: string }>(
      `SELECT u.nome, m.ruolo FROM membro_cerchio m JOIN utente u ON u.id = m.utente_id
       WHERE m.cerchio_id = $1 ORDER BY (m.ruolo = 'BADANTE'), m.entrato_il`,
      [anziano!.cerchioId],
    )
    res.json({
      anziano: { id: anzianoId, nome: anziano!.nome, cognome: anziano!.cognome },
      cerchio: anziano!.cerchio,
      famiglia,
      richieste: await richieste.elencoAnziano(anzianoId),
    })
  })

  router.post('/senior/richieste', richiedeTelefono, async (req, res) => {
    const { categoria } = schemaRichiestaSenior.parse(req.body)
    const { richiesta, nuova } = await richieste.creaDallAnziano(senior(res).anzianoId, categoria as (typeof CATEGORIE)[number])
    res.status(nuova ? 201 : 200).json(richiesta)
  })

  router.post('/senior/richieste/:id/annulla', richiedeTelefono, async (req, res) => {
    await richieste.annullaDallAnziano(schemaId.parse(req.params.id), senior(res).anzianoId)
    res.status(204).end()
  })

  router.post('/senior/esci', richiedeTelefono, async (_req, res) => {
    await telefono.esci(senior(res).dispositivoId)
    res.clearCookie(COOKIE, { path: '/' })
    res.status(204).end()
  })

  // ---- Lato famiglia ----

  router.get('/anziani/:id/telefono', richiedeAccesso, async (req, res) => {
    res.json(await telefono.stato(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.post('/anziani/:id/telefono/codice', richiedeAccesso, async (req, res) => {
    res.status(201).json(await telefono.nuovoCodice(schemaId.parse(req.params.id), res.locals.idUtente))
  })

  router.delete('/anziani/:id/telefono/:dispositivoId', richiedeAccesso, async (req, res) => {
    await telefono.scollega(schemaId.parse(req.params.id), schemaId.parse(req.params.dispositivoId), res.locals.idUtente)
    res.status(204).end()
  })

  return router
}
