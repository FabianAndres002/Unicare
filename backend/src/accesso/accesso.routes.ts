// Endpoint di registrazione, login e logout di familiari e badanti.
//
// POST /api/auth/registrati   crea l'account e fa entrare     (201)
// POST /api/auth/login        accesso con email e password
// POST /api/auth/logout       esce                             (204)
// POST /api/auth/conferma-email {codice}         conferma l'email con il codice ricevuto → profilo
// POST /api/auth/conferma-email/reinvia          manda un codice nuovo                  (204)
// POST /api/auth/password-dimenticata {email}    manda il codice per la nuova password   (204, anche se l'email non esiste)
// POST /api/auth/nuova-password {email, codice, password}  cambia la password ed entra → profilo
// POST /api/auth/esci-ovunque  esce da tutti gli altri telefoni; questo resta dentro (204)
// GET  /api/auth/registrazione  {serveCodice}: se per registrarsi serve il codice segreto
// GET  /api/auth/io           chi è l'utente collegato         (401 senza login)
// PATCH /api/auth/io          preferenze (avvisi via email)
// GET  /api/auth/io/dati      scarica tutti i miei dati (JSON)
// DELETE /api/auth/io         cancella l'account {password}   (204)
//
// Login: dopo 10 password sbagliate dallo stesso indirizzo di rete, oppure per lo stesso account
// (anche da indirizzi diversi), 15 minuti di attesa. Registrazioni: massimo 10 all'ora per indirizzo.

import { createHash, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import { config } from '../config.ts'
import type { ServizioInviti } from '../cerchio/inviti.service.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import type { CodiciEmail } from './codiciEmail.ts'
import { schemaPassword, type Profilo, schemaEliminaAccount, schemaLogin, schemaPreferenze, schemaRegistrazione, type ServizioAccesso } from './accesso.service.ts'
import { creaFrequenza, creaLimitatore } from '../comune/limitatore.ts'
import { apriSessione, chiudiSessione, richiedeAccesso } from './sessione.ts'

/** Confronta due testi senza far capire, dai tempi di risposta, quanto sono simili. */
function uguali(a: string, b: string): boolean {
  const h = (x: string) => createHash('sha256').update(x).digest()
  return timingSafeEqual(h(a), h(b))
}

export function rotteAccesso(accesso: ServizioAccesso, inviti: ServizioInviti, codici: CodiciEmail,
  { registrazioniOra, confermaEmail }: { registrazioniOra: number; confermaEmail: boolean }): Router {
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
  /** Il profilo per il frontend: daConfermare = deve ancora scrivere il codice ricevuto per email. */
  const conStato = (p: Profilo) => ({ ...p, daConfermare: confermaEmail && !p.emailConfermata })
  /** Manda il codice senza far fallire la richiesta se la posta non va (l'errore resta nel terminale). */
  const mandaCodice = (id: number, scopo: 'CONFERMA' | 'PASSWORD') =>
    codici.manda(id, scopo).catch((e) => console.error('Codice email non inviato:', e))
  const schemaCodiceEmail = z.string().trim().regex(/^\d{6}$/, 'il codice ha 6 cifre')
  const limiteCodici = creaLimitatore(10, 15)
  const limiteInvioCodici = creaFrequenza(5, 3_600_000, () =>
    new ErroreApplicativo(429, 'TROPPI_CODICI', 'Hai chiesto troppi codici. Riprova tra un’ora.'))

  const limiteLogin = creaLimitatore(10, 15)
  const limiteAccount = creaLimitatore(10, 15)
  const limiteRegistrazioni = creaFrequenza(registrazioniOra, 3_600_000,
    () => new ErroreApplicativo(429, 'TROPPE_REGISTRAZIONI', 'Troppi account creati da questa rete. Riprova tra un’ora.'))

  router.post('/registrati', async (req, res) => {
    const { codice, invito, ...dati } = schemaRegistrazione.parse(req.body)
    limiteRegistrazioni.conta(req.ip ?? 'sconosciuto')
    if (!(await puoRegistrarsi(dati.email, codice, invito))) {
      if (codice) throw new ErroreApplicativo(403, 'CODICE_REGISTRAZIONE', 'Il codice non è giusto. Controlla il messaggio di chi ti ha invitato.')
      throw new ErroreApplicativo(403, 'CODICE_REGISTRAZIONE', 'Per registrarti serve il codice che ti ha mandato chi ti ha invitato.')
    }
    const profilo = await accesso.registra(dati)
    apriSessione(res, profilo.id, 0)
    if (confermaEmail) await mandaCodice(profilo.id, 'CONFERMA')
    res.status(201).json(conStato(profilo))
  })

  router.post('/conferma-email', async (req, res) => {
    // Qui arriva anche chi non ha ancora confermato (vedi controlloSessione).
    const id = res.locals.idUtente as number | undefined
    if (id === undefined) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    const codice = schemaCodiceEmail.parse(req.body?.codice)
    limiteCodici.controlla(`u${id}`)
    if (!(await codici.verifica(id, 'CONFERMA', codice))) {
      limiteCodici.sbagliato(`u${id}`)
      throw new ErroreApplicativo(400, 'CODICE_EMAIL_SBAGLIATO', 'Il codice non è giusto o è scaduto. Controlla l’email o chiedine uno nuovo.')
    }
    limiteCodici.riuscito(`u${id}`)
    await accesso.confermaEmail(id)
    res.json(conStato((await accesso.trovaProfilo(id))!))
  })

  router.post('/conferma-email/reinvia', async (_req, res) => {
    const id = res.locals.idUtente as number | undefined
    if (id === undefined) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    limiteInvioCodici.conta(`u${id}`)
    await codici.manda(id, 'CONFERMA')
    res.status(204).end()
  })

  router.post('/password-dimenticata', async (req, res) => {
    const { email } = z.object({ email: z.string().trim().email('email non valida').max(254) }).parse(req.body)
    limiteInvioCodici.conta(`e${email.toLowerCase()}`)
    limiteInvioCodici.conta(`ip${req.ip}`)
    // Stessa risposta che l'account esista o no: così non si scopre chi è iscritto.
    const id = await accesso.idDaEmail(email)
    if (id !== undefined) void mandaCodice(id, 'PASSWORD')
    res.status(204).end()
  })

  router.post('/nuova-password', async (req, res) => {
    const dati = z.object({ email: z.string().trim().max(254), codice: schemaCodiceEmail, password: schemaPassword }).parse(req.body)
    const chiave = `p${dati.email.toLowerCase()}`
    limiteCodici.controlla(chiave)
    const id = await accesso.idDaEmail(dati.email)
    if (id === undefined || !(await codici.verifica(id, 'PASSWORD', dati.codice))) {
      limiteCodici.sbagliato(chiave)
      throw new ErroreApplicativo(400, 'CODICE_EMAIL_SBAGLIATO', 'Il codice non è giusto o è scaduto. Controlla l’email o chiedine uno nuovo.')
    }
    limiteCodici.riuscito(chiave)
    apriSessione(res, id, await accesso.cambiaPassword(id, dati.password))
    res.json(conStato((await accesso.trovaProfilo(id))!))
  })

  router.post('/login', async (req, res) => {
    const { email, password } = schemaLogin.parse(req.body)
    const chi = req.ip ?? 'sconosciuto'
    const account = email.trim().toLowerCase()
    limiteLogin.controlla(chi)
    limiteAccount.controlla(account)
    let profilo
    try {
      profilo = await accesso.verificaCredenziali(email, password)
    } catch (e) {
      if (e instanceof ErroreApplicativo && e.stato === 401) {
        limiteLogin.sbagliato(chi)
        limiteAccount.sbagliato(account)
      }
      throw e
    }
    limiteLogin.riuscito(chi)
    limiteAccount.riuscito(account)
    apriSessione(res, profilo.id, await accesso.versioneSessione(profilo.id))
    res.json(conStato(profilo))
  })

  router.post('/logout', (_req, res) => {
    chiudiSessione(res)
    res.status(204).end()
  })

  router.post('/esci-ovunque', richiedeAccesso, async (req, res) => {
    const id: number = res.locals.idUtente
    const { endpoint } = z.object({ endpoint: z.string().max(1000).optional() }).parse(req.body ?? {})
    apriSessione(res, id, await accesso.esciOvunque(id, endpoint))
    res.status(204).end()
  })

  router.get('/io', richiedeAccesso, async (_req, res) => {
    const profilo = await accesso.trovaProfilo(res.locals.idUtente)
    if (!profilo) {
      // L'utente è stato cancellato dopo il login.
      chiudiSessione(res)
      throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    }
    res.json(conStato(profilo))
  })

  router.patch('/io', richiedeAccesso, async (req, res) => {
    const profilo = await accesso.impostaPreferenze(res.locals.idUtente, schemaPreferenze.parse(req.body))
    if (!profilo) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    res.json(conStato(profilo))
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
