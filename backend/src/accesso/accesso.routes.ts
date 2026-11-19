// Endpoint di registrazione, login e logout di familiari e badanti.
//
// POST /api/auth/registrati   crea l'account e fa entrare     (201)
// POST /api/auth/login        accesso con email e password
// POST /api/auth/logout       esce                             (204)
// GET  /api/auth/registrazione  {serveCodice}: se per registrarsi serve il codice segreto
// GET  /api/auth/io           chi è l'utente collegato         (401 senza login)
// PATCH /api/auth/io          preferenze (avvisi via email)
// GET  /api/auth/io/dati      scarica tutti i miei dati (JSON)
// DELETE /api/auth/io         cancella l'account {password}   (204)
//
// Login: dopo 10 password sbagliate dallo stesso indirizzo di rete, 15 minuti di attesa.

import { createHash, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { config } from '../config.ts'
import type { ServizioInviti } from '../cerchio/inviti.service.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { schemaEliminaAccount, schemaLogin, schemaPreferenze, schemaRegistrazione, type ServizioAccesso } from './accesso.service.ts'
import { creaLimitatore } from '../comune/limitatore.ts'
import { apriSessione, chiudiSessione, richiedeAccesso } from './sessione.ts'

/** Confronta due testi senza far capire, dai tempi di risposta, quanto sono simili. */
function uguali(a: string, b: string): boolean {
  const h = (x: string) => createHash('sha256').update(x).digest()
  return timingSafeEqual(h(a), h(b))
}

export function rotteAccesso(accesso: ServizioAccesso, inviti: ServizioInviti): Router {
  const router = Router()

  /**
   * Con CODICE_REGISTRAZIONE nel .env si registra solo chi conosce il codice
   * o arriva da un link d'invito valido per la sua email.
   */
  async function puoRegistrarsi(email: string, codice?: string, invito?: string): Promise<boolean> {
    const segreto = config.codiceRegistrazione
    if (!segreto) return true
    if (codice && uguali(codice.toLowerCase(), segreto.toLowerCase())) return true
    if (invito) {
      const a = await inviti.anteprima(invito).catch(() => null)
      if (a && a.email.toLowerCase() === email.toLowerCase()) return true
    }
    return false
  }

  router.get('/registrazione', (_req, res) => {
    res.json({ serveCodice: !!config.codiceRegistrazione })
  })
  const limiteLogin = creaLimitatore(10, 15)

  router.post('/registrati', async (req, res) => {
    const { codice, invito, ...dati } = schemaRegistrazione.parse(req.body)
    if (!(await puoRegistrarsi(dati.email, codice, invito))) {
      if (codice) throw new ErroreApplicativo(403, 'CODICE_REGISTRAZIONE', 'Il codice non è giusto. Controlla il messaggio di chi ti ha invitato.')
      throw new ErroreApplicativo(403, 'CODICE_REGISTRAZIONE', 'Per registrarti serve il codice che ti ha mandato chi ti ha invitato.')
    }
    const profilo = await accesso.registra(dati)
    apriSessione(res, profilo.id)
    res.status(201).json(profilo)
  })

  router.post('/login', async (req, res) => {
    const { email, password } = schemaLogin.parse(req.body)
    const chi = req.ip ?? 'sconosciuto'
    limiteLogin.controlla(chi)
    let profilo
    try {
      profilo = await accesso.verificaCredenziali(email, password)
    } catch (e) {
      if (e instanceof ErroreApplicativo && e.stato === 401) limiteLogin.sbagliato(chi)
      throw e
    }
    limiteLogin.riuscito(chi)
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

  router.get('/io/dati', richiedeAccesso, async (_req, res) => {
    const dati = await accesso.esportaDati(res.locals.idUtente)
    res.set('Content-Disposition', 'attachment; filename="unicare-i-miei-dati.json"').json(dati)
  })

  router.delete('/io', richiedeAccesso, async (req, res) => {
    const { password } = schemaEliminaAccount.parse(req.body)
    await accesso.eliminaAccount(res.locals.idUtente, password)
    chiudiSessione(res)
    res.status(204).end()
  })

  return router
}
