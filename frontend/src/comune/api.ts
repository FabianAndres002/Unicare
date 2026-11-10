// Tutte le chiamate al backend passano da qui.

export type Stato = { app: string; database: string; tabelle: number }

export type TipoUtente = 'FAMILIARE' | 'BADANTE'
export type Ruolo = 'ADMIN' | 'FAMILIARE' | 'BADANTE'

export type Profilo = { id: number; email: string; nome: string; tipo: TipoUtente }

export type DatiRegistrazione = { email: string; password: string; nome: string; cognome: string; tipo: TipoUtente }

export type Anziano = { id: number; nome: string; cognome: string; dataNascita: string | null; comune: string | null }
export type DatiAnziano = Omit<Anziano, 'id'>

export type Membro = { id: number; nome: string; cognome: string; email: string; ruolo: Ruolo }
export type InvitoInAttesa = { id: number; email: string; ruolo: Ruolo; scadeIl: string }

export type RiassuntoCerchio = { id: number; nome: string; mioRuolo: Ruolo; anziani: Anziano[]; numeroMembri: number }
export type Cerchio = {
  id: number
  nome: string
  mioRuolo: Ruolo
  anziani: Anziano[]
  membri: Membro[]
  invitiInAttesa: InvitoInAttesa[]
}

export type InvitoCreato = InvitoInAttesa & { token: string }
export type AnteprimaInvito = { cerchio: string; invitatoDa: string; email: string; ruolo: Ruolo; scadeIl: string }

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

/** Il messaggio da mostrare all'utente per qualsiasi errore. */
export const messaggioErrore = (err: unknown) =>
  err instanceof ErroreApi ? err.message : 'Connessione non riuscita. Riprova.'

async function chiama<T>(metodo: string, url: string, corpo?: unknown): Promise<T> {
  const risposta = await fetch(url, {
    method: metodo,
    headers: corpo === undefined ? {} : { 'Content-Type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    credentials: 'same-origin', // invia il cookie di accesso (unicare_accesso)
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

  // Accesso
  io: () => chiama<Profilo>('GET', '/api/auth/io'),
  login: (email: string, password: string) => chiama<Profilo>('POST', '/api/auth/login', { email, password }),
  registrati: (dati: DatiRegistrazione) => chiama<Profilo>('POST', '/api/auth/registrati', dati),
  logout: () => chiama<void>('POST', '/api/auth/logout'),

  // Cerchi e anziani
  cerchi: () => chiama<RiassuntoCerchio[]>('GET', '/api/cerchi'),
  cerchio: (id: number) => chiama<Cerchio>('GET', `/api/cerchi/${id}`),
  creaCerchio: (nome: string) => chiama<Cerchio>('POST', '/api/cerchi', { nome }),
  rimuoviMembro: (cerchioId: number, utenteId: number) =>
    chiama<void>('DELETE', `/api/cerchi/${cerchioId}/membri/${utenteId}`),
  aggiungiAnziano: (cerchioId: number, dati: DatiAnziano) =>
    chiama<Anziano>('POST', `/api/cerchi/${cerchioId}/anziani`, { ...dati, consensoPrivacy: true }),
  modificaAnziano: (id: number, dati: DatiAnziano) => chiama<Anziano>('PUT', `/api/anziani/${id}`, dati),

  // Inviti
  invita: (cerchioId: number, email: string, ruolo: 'FAMILIARE' | 'BADANTE') =>
    chiama<InvitoCreato>('POST', `/api/cerchi/${cerchioId}/inviti`, { email, ruolo }),
  annullaInvito: (id: number) => chiama<void>('DELETE', `/api/inviti/${id}`),
  anteprimaInvito: (token: string) => chiama<AnteprimaInvito>('GET', `/api/inviti/token/${token}`),
  accettaInvito: (token: string) => chiama<{ cerchioId: number }>('POST', `/api/inviti/token/${token}/accetta`),
}
