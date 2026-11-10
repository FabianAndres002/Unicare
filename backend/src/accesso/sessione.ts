// Come il server ricorda chi ha fatto il login.
//
// Dopo il login mettiamo nel browser un cookie "unicare_accesso" con un token firmato (JWT).
// - HttpOnly: il JavaScript della pagina non può leggerlo (protegge dal furto via XSS).
// - SameSite=Lax: il browser non lo invia nelle richieste POST che partono da altri siti
//   (protegge dal CSRF). In più accettiamo solo corpi JSON, che un form esterno non può inviare.
// - Secure in produzione: viaggia solo su HTTPS.

import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'

const NOME_COOKIE = 'unicare_accesso'

export function apriSessione(res: Response, idUtente: number): void {
  const token = jwt.sign({}, config.segretoJwt, {
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

/** Legge l'id dell'utente dal cookie, se valido. */
function idDalCookie(req: Request): number | undefined {
  const token = req.cookies?.[NOME_COOKIE]
  if (!token) return undefined
  try {
    const dati = jwt.verify(token, config.segretoJwt)
    return typeof dati === 'object' && dati.sub ? Number(dati.sub) : undefined
  } catch {
    return undefined // token scaduto o manomesso
  }
}

/** Da mettere davanti alle rotte protette: senza login risponde 401. */
export function richiedeAccesso(req: Request, res: Response, next: NextFunction): void {
  const id = idDalCookie(req)
  if (id === undefined) {
    next(new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.'))
    return
  }
  res.locals.idUtente = id
  next()
}
