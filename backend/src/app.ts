// Costruisce l'applicazione Express. È separata da server.ts così i test
// possono creare un'app con un database tutto loro.

import { existsSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import express from 'express'
import cookieParser from 'cookie-parser'
import type { Database } from './db/db.ts'
import { config } from './config.ts'
import { gestoreErrori, ErroreApplicativo } from './comune/errori.ts'
import { creaFrequenza } from './comune/limitatore.ts'
import { rotteStato } from './comune/stato.routes.ts'
import { creaServizioAccesso } from './accesso/accesso.service.ts'
import { rotteAccesso } from './accesso/accesso.routes.ts'
import { controlloSessione } from './accesso/sessione.ts'
import { creaServizioCerchio } from './cerchio/cerchio.service.ts'
import { creaServizioInviti } from './cerchio/inviti.service.ts'
import { rotteCerchio } from './cerchio/cerchio.routes.ts'
import { creaServizioRichieste } from './richieste/richieste.service.ts'
import { rotteRichieste } from './richieste/richieste.routes.ts'
import { creaAvvisi, type Avvisi } from './notifiche/avvisi.ts'
import { postinoPredefinito, type Postino } from './notifiche/postino.ts'
import { creaServizioTelefono } from './senior/telefono.service.ts'
import { creaPush, spingitoreWebPush, type Spingitore } from './notifiche/push.ts'
import { creaPianificatore, creaServizioMedicine, type Pianificatore } from './medicine/medicine.service.ts'
import { rotteMedicine } from './medicine/medicine.routes.ts'
import { rotteSenior } from './senior/senior.routes.ts'
import { creaPianificatoreAppuntamenti, creaServizioAppuntamenti } from './appuntamenti/appuntamenti.service.ts'
import { rotteAppuntamenti } from './appuntamenti/appuntamenti.routes.ts'
import { creaServizioVocali } from './vocali/vocali.service.ts'
import { creaServizioDocumenti } from './documenti/documenti.service.ts'
import { rotteDocumenti } from './documenti/documenti.routes.ts'
import { creaServizioBadanti } from './badanti/badanti.service.ts'
import { rotteBadanti } from './badanti/badanti.routes.ts'
import { creaServizioRicerche } from './badanti/ricerche.service.ts'
import { rotteRicerche } from './badanti/ricerche.routes.ts'
import { creaServizioTraduzione, traduttorePredefinito, type Traduttore } from './traduzione/traduzione.service.ts'
import { rotteTraduzione } from './traduzione/traduzione.routes.ts'
import { creaDiretta, type Diretta } from './diretta/diretta.ts'
import { rotteDiretta } from './diretta/diretta.routes.ts'
import { creaServizioFoto } from './foto/foto.ts'
import { rotteFoto } from './foto/foto.routes.ts'

/** postino, spingitore, traduttore: chi consegna email e push e chi traduce (i test ne passano di finti). */
export function creaApp(
  db: Database,
  opzioni: { postino?: Postino; spingitore?: Spingitore; traduttore?: Traduttore | null; limiti?: Partial<typeof config.limiti> } = {},
): express.Express & { avvisi: Avvisi; pianificatore: Pianificatore; diretta: Diretta } {
  const app = express()
  const push = creaPush(db, opzioni.spingitore ?? spingitoreWebPush())
  const avvisi = creaAvvisi(db, opzioni.postino ?? postinoPredefinito(), push)
  const diretta = creaDiretta(db)
  // Quando una richiesta cambia: avvisi (email e push) e, in più, la diretta per i telefoni aperti.
  const richieste = creaServizioRichieste(db, {
    ...avvisi,
    richiesta(evento, id, autoreId) {
      avvisi.richiesta(evento, id, autoreId)
      diretta.richiestaCambiata(id)
    },
  })
  const medicine = creaServizioMedicine(db, avvisi)
  const appuntamenti = creaServizioAppuntamenti(db, avvisi)
  const vocali = creaServizioVocali(db, avvisi)
  const traduzione = creaServizioTraduzione(opzioni.traduttore !== undefined ? opzioni.traduttore : traduttorePredefinito())
  const pianificatoreMedicine = creaPianificatore(db, avvisi)
  const pianificatoreAppuntamenti = creaPianificatoreAppuntamenti(db, avvisi)
  // Gira ogni minuto (server.ts): medicine, appuntamenti, pulizia dei vocali vecchi.
  const pianificatore: Pianificatore = {
    async giro(adesso: Date = new Date()) {
      await pianificatoreMedicine.giro(adesso)
      await pianificatoreAppuntamenti.giro(adesso)
      await vocali.pulizia(adesso)
    },
  }

  app.disable('x-powered-by')
  // Dietro il proxy dell'hosting (https) l'indirizzo vero del visitatore arriva in X-Forwarded-For.
  if (config.inProduzione) app.set('trust proxy', 1)
  // Intestazioni di sicurezza per tutte le risposte.
  app.use((_req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
      'Permissions-Policy': 'microphone=(self), camera=(self), geolocation=()',
    })
    if (config.inProduzione) res.set('Strict-Transport-Security', 'max-age=31536000')
    next()
  })
  // Pagine dell'app (solo online): da dove possono arrivare script, stili, immagini.
  // Anche se qualcuno riuscisse a infilare un testo malevolo, il browser non eseguirebbe codice esterno.
  if (config.inProduzione) {
    app.use((req, res, next) => {
      if (!req.path.startsWith('/api/')) {
        res.set({
          'Content-Security-Policy': [
            "default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:", "media-src 'self' blob:",
            "connect-src 'self'", "worker-src 'self'", "manifest-src 'self'", "object-src 'none'",
            "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
          ].join('; '),
          'Cross-Origin-Opener-Policy': 'same-origin',
        })
      }
      next()
    })
  }

  // Contro chi tempesta il server di chiamate: oltre il limite al minuto, 429 per quell'indirizzo.
  const limiti = { ...config.limiti, ...opzioni.limiti }
  const frequenzaApi = creaFrequenza(limiti.richiesteMinuto, 60_000)
  app.use('/api', (req, _res, next) => {
    frequenzaApi.conta(req.ip ?? 'sconosciuto')
    next()
  })

  app.use(express.json({ limit: '100kb' })) // legge i corpi JSON
  app.use(cookieParser()) // legge i cookie (serve per la sessione)
  app.use('/api', controlloSessione(db)) // chi è collegato (cookie valido e non annullato)

  app.use('/api', rotteStato(db))
  const inviti = creaServizioInviti(db)
  app.use('/api/auth', rotteAccesso(creaServizioAccesso(db), inviti, limiti.registrazioniOra))
  app.use('/api', rotteCerchio(creaServizioCerchio(db), inviti))
  app.use('/api', rotteRichieste(richieste))
  app.use('/api', rotteSenior(db, creaServizioTelefono(db), richieste, medicine, push, appuntamenti, vocali, traduzione, diretta))
  app.use('/api', rotteMedicine(medicine, pianificatore, push))
  app.use('/api', rotteAppuntamenti(appuntamenti, vocali))
  app.use('/api', rotteDocumenti(creaServizioDocumenti(db)))
  app.use('/api', rotteBadanti(creaServizioBadanti(db, avvisi, inviti), traduzione))
  app.use('/api', rotteRicerche(creaServizioRicerche(db, avvisi)))
  app.use('/api', rotteTraduzione(traduzione))
  app.use('/api', rotteDiretta(diretta))
  app.use('/api', rotteFoto(creaServizioFoto(db)))

  // Qualsiasi altro indirizzo /api: 404 in JSON.
  app.use('/api', () => {
    throw new ErroreApplicativo(404, 'NON_TROVATO', 'Indirizzo non trovato.')
  })

  // Online (un solo indirizzo): il backend serve anche l'app. Qualsiasi pagina che non è un
  // file (/richieste, /senior…) riceve index.html, poi ci pensa il router del frontend.
  const pagine = resolve(config.cartellaFrontend)
  if (config.inProduzione && existsSync(resolve(pagine, 'index.html'))) {
    app.use(express.static(pagine, {
      index: false,
      setHeaders(res, percorso) {
        // I file in /assets hanno l'impronta nel nome: si possono tenere a lungo.
        if (percorso.includes(`${sep}assets${sep}`)) res.set('Cache-Control', 'public, max-age=31536000, immutable')
        // sw.js e il manifest vanno sempre ricontrollati, altrimenti gli aggiornamenti non arrivano.
        else res.set('Cache-Control', 'no-cache')
      },
    }))
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.set('Cache-Control', 'no-cache')
      res.sendFile(resolve(pagine, 'index.html'))
    })
  }

  app.use(gestoreErrori)
  return Object.assign(app, { avvisi, pianificatore, diretta })
}
