// Come il server ricorda chi ha fatto il login.
//
// Dopo il login mettiamo nel browser un cookie "unicare_accesso" con un token firmato (JWT).
// - HttpOnly: il JavaScript della pagina non può leggerlo (protegge dal furto via XSS).
// - SameSite=Lax: il browser non lo invia nelle richieste POST che partono da altri siti
//   (protegge dal CSRF). In più accettiamo solo corpi JSON, che un form esterno non può inviare.
// - Secure in produzione: viaggia solo su HTTPS.
// - Porta la "versione" dell'utente: con "Esci dagli altri telefoni" la versione cresce e
//   tutti i cookie vecchi smettono di valere (anche quello di un telefono rubato).

import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.ts'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'

const NOME_COOKIE = 'unicare_accesso'

export function apriSessione(res: Response, idUtente: number, versione: number): void {
  const token = jwt.sign({ v: versione }, config.segretoJwt, {
    subject: String(idUtente),
    expiresIn: `${config.durataAccessoGiorni}d`,
  })
  res.cookie(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.inProduzione,
    maxAge: config.durataAccessoGiorni * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function chiudiSessione(res: Response): void {
  res.clearCookie(NOME_COOKIE, { path: '/' })
}

/** Legge utente e versione dal cookie, se la firma è valida e non è scaduto. */
function leggiCookie(req: Request): { id: number; versione: number } | undefined {
  const token = req.cookies?.[NOME_COOKIE]
  if (!token) return undefined
  try {
    const dati = jwt.verify(token, config.segretoJwt, { algorithms: ['HS256'] })
    if (typeof dati !== 'object' || !dati.sub) return undefined
    return { id: Number(dati.sub), versione: typeof dati.v === 'number' ? dati.v : 0 }
  } catch {
    return undefined // token scaduto o manomesso
  }
}

/**
 * Davanti a tutte le API: se il cookie è valido e la sua versione è quella attuale
 * dell'utente, segna chi è collegato. Un cookie vecchio (dopo "Esci dagli altri telefoni")
 * o di un utente cancellato viene tolto.
 */
export function controlloSessione(db: Database) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const c = leggiCookie(req)
    if (c) {
      const [u] = await db.query<{ v: number }>('SELECT sessione_versione AS v FROM utente WHERE id = $1', [c.id])
      if (u && u.v === c.versione) res.locals.idUtente = c.id
      else chiudiSessione(res)
    }
    next()
  }
}

/** Da mettere davanti alle rotte protette: senza login risponde 401. */
export function richiedeAccesso(_req: Request, res: Response, next: NextFunction): void {
  if (typeof res.locals.idUtente !== 'number') {
    next(new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.'))
    return
  }
  next()
}
