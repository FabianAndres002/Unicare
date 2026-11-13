// Endpoint di registrazione, login e logout di familiari e badanti.
//
// POST /api/auth/registrati   crea l'account e fa entrare     (201)
// POST /api/auth/login        accesso con email e password
// POST /api/auth/logout       esce                             (204)
// GET  /api/auth/io           chi è l'utente collegato         (401 senza login)
// PATCH /api/auth/io          preferenze (avvisi via email)

import { Router } from 'express'
import { ErroreApplicativo } from '../comune/errori.ts'
import { schemaLogin, schemaPreferenze, schemaRegistrazione, type ServizioAccesso } from './accesso.service.ts'
import { apriSessione, chiudiSessione, richiedeAccesso } from './sessione.ts'

export function rotteAccesso(accesso: ServizioAccesso): Router {
  const router = Router()

  router.post('/registrati', async (req, res) => {
    const dati = schemaRegistrazione.parse(req.body)
    const profilo = await accesso.registra(dati)
    apriSessione(res, profilo.id)
    res.status(201).json(profilo)
  })

  router.post('/login', async (req, res) => {
    const { email, password } = schemaLogin.parse(req.body)
    const profilo = await accesso.verificaCredenziali(email, password)
    apriSessione(res, profilo.id)
    res.json(profilo)
  })

  router.post('/logout', (_req, res) => {
    chiudiSessione(res)
    res.status(204).end()
  })

  router.get('/io', richiedeAccesso, async (_req, res) => {
    const profilo = await accesso.trovaProfilo(res.locals.idUtente)
    if (!profilo) {
      // L'utente è stato cancellato dopo il login.
      chiudiSessione(res)
      throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    }
    res.json(profilo)
  })

  router.patch('/io', richiedeAccesso, async (req, res) => {
    const profilo = await accesso.impostaPreferenze(res.locals.idUtente, schemaPreferenze.parse(req.body))
    if (!profilo) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    res.json(profilo)
  })

  return router
}
