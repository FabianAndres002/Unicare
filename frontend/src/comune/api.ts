// Tutte le chiamate al backend passano da qui.

export type Stato = {
  app: string
  database: string
  tabelle: number
}

export type TipoUtente = 'FAMILIARE' | 'BADANTE'

export type Profilo = {
  id: number
  email: string
  nome: string
  tipo: TipoUtente
}

export type DatiRegistrazione = {
  email: string
  password: string
  nome: string
  cognome: string
  tipo: TipoUtente
}

/** Errore restituito dal backend nel formato {"codice": ..., "messaggio": ...}. */
export class ErroreApi extends Error {
  readonly stato: number
  readonly codice: string

  constructor(stato: number, codice: string, messaggio: string) {
    super(messaggio)
    this.stato = stato
    this.codice = codice
  }
}

/**
 * Protezione CSRF: il backend mette un token nel cookie XSRF-TOKEN
 * e per ogni POST/PUT/DELETE vuole lo stesso valore nell'header X-XSRF-TOKEN.
 * Un sito estraneo non può leggere il cookie, quindi non può copiarlo.
 */
function tokenCsrf(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
}

async function chiama<T>(metodo: string, url: string, corpo?: unknown): Promise<T> {
  const intestazioni: Record<string, string> = {}
  if (corpo !== undefined) intestazioni['Content-Type'] = 'application/json'
  const token = tokenCsrf()
  if (metodo !== 'GET' && token) intestazioni['X-XSRF-TOKEN'] = decodeURIComponent(token)

  const risposta = await fetch(url, {
    method: metodo,
    headers: intestazioni,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    credentials: 'same-origin', // invia il cookie di sessione
  })

  if (!risposta.ok) {
    const errore = await risposta.json().catch(() => null)
    throw new ErroreApi(
      risposta.status,
      errore?.codice ?? 'ERRORE',
      errore?.messaggio ?? `Il server ha risposto ${risposta.status}`,
    )
  }
  if (risposta.status === 204) return undefined as T
  return risposta.json()
}

export const api = {
  stato: () => chiama<Stato>('GET', '/api/stato'),
  io: () => chiama<Profilo>('GET', '/api/auth/io'),
  login: (email: string, password: string) =>
    chiama<Profilo>('POST', '/api/auth/login', { email, password }),
  registrati: (dati: DatiRegistrazione) => chiama<Profilo>('POST', '/api/auth/registrati', dati),
  logout: () => chiama<void>('POST', '/api/auth/logout'),
}
