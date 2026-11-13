// Tutte le chiamate al backend passano da qui.

export type Stato = { app: string; database: string; tabelle: number }

export type TipoUtente = 'FAMILIARE' | 'BADANTE'
export type Ruolo = 'ADMIN' | 'FAMILIARE' | 'BADANTE'

export type Profilo = { id: number; email: string; nome: string; tipo: TipoUtente; emailAvvisi: boolean }

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

export type Categoria = 'SPESA' | 'FARMACIA' | 'ACCOMPAGNAMENTO' | 'COMPAGNIA' | 'CASA' | 'ALTRO'
export type StatoRichiesta = 'APERTA' | 'PRESA_IN_CARICO' | 'COMPLETATA' | 'ANNULLATA'
export type AzioneRichiesta = 'PRENDI' | 'RILASCIA' | 'COMPLETA' | 'ANNULLA'
type Persona = { id: number; nome: string } | null

export type Richiesta = {
  id: number
  cerchioId: number
  anziano: { id: number; nome: string }
  categoria: Categoria
  testo: string | null
  stato: StatoRichiesta
  creataDa: Persona
  /** true se l'ha chiesta l'anziano dal suo telefono. */
  creataDallAnziano: boolean
  creataIl: string
  presaDa: Persona
  presaIl: string | null
  chiusaIl: string | null
  /** Le azioni che puoi fare tu: il backend le calcola, noi mostriamo solo quei pulsanti. */
  azioni: AzioneRichiesta[]
}
export type EventoRichiesta = { tipo: 'CREATA' | 'PRESA' | 'RILASCIATA' | 'COMPLETATA' | 'ANNULLATA'; utente: string | null; dallAnziano: boolean; nota: string | null; il: string }
export type DettaglioRichiesta = Richiesta & { eventi: EventoRichiesta[] }

/** Il telefono dell'anziano, visto dalla famiglia. */
export type StatoTelefono = {
  collegati: { id: number; collegatoIl: string; ultimoUsoIl: string | null }[]
  codiceScadeIl: string | null
}

/** Promemoria delle medicine: solo il momento e l'orario, mai il nome dei farmaci. */
export type Momento = 'MATTINO' | 'PRANZO' | 'SERA'
export type Promemoria = { id: number; momento: Momento; ora: string; attivo: boolean }
export type Occorrenza = {
  id: number
  promemoriaId: number
  momento: Momento
  previstoIl: string
  stato: 'IN_ATTESA' | 'FATTO' | 'NON_CONFERMATO'
  confermatoIl: string | null
  rimandi: number
  avvisareIl: string | null
}
export type MedicineAnziano = { promemoria: Promemoria[]; oggi: Occorrenza[]; consenso: boolean; puoModificare: boolean }

/** Iscrizione alle notifiche push, come la dà il browser (PushSubscription.toJSON()). */
export type IscrizionePush = { endpoint: string; keys: { p256dh: string; auth: string } }

/** Un appuntamento dell'anziano (visita, esame...). */
export type Appuntamento = {
  id: number
  titolo: string
  quando: string
  luogo: string | null
  note: string | null
  accompagnaId: number | null
  /** Chi ha detto "Ci vado io". */
  accompagna: string | null
  creatoDa: string | null
}
export type AppuntamentoFamiglia = Appuntamento & { accompagnoIo: boolean }
export type CalendarioAnziano = { prossimi: AppuntamentoFamiglia[]; passati: AppuntamentoFamiglia[]; puoModificare: boolean }
export type DatiAppuntamento = { titolo: string; data: string; ora: string; luogo: string; note: string }

/** Un messaggio vocale tra l'anziano e il cerchio (l'audio si scarica a parte). */
export type Vocale = {
  id: number
  dallAnziano: boolean
  autore: string | null
  durataSecondi: number
  creatoIl: string
  ascoltatoDa: string | null
  ascoltatoIl: string | null
}

/** Documenti sanitari: foto o PDF. */
export type CategoriaDocumento = 'PRESCRIZIONE' | 'ANALISI' | 'IMMAGINI' | 'REFERTO' | 'RICEVUTA' | 'ALTRO'
export type Documento = {
  id: number
  categoria: CategoriaDocumento
  titolo: string
  /** La data scritta sul documento, AAAA-MM-GG. */
  data: string
  note: string | null
  importoCentesimi: number | null
  tipoFile: string
  nomeFile: string
  dimensione: number
  caricatoDa: string | null
  caricatoIl: string
}
export type ArchivioDocumenti = { documenti: Documento[]; consenso: boolean; speseAnno: { anno: number; centesimi: number } }
export type DatiDocumento = { categoria: CategoriaDocumento; titolo: string; data: string; note: string; importo: number | null }

/** Badanti che si propongono. */
export type Servizio = 'COMPAGNIA' | 'IGIENE' | 'PASTI' | 'PULIZIE' | 'SPESA' | 'ACCOMPAGNAMENTO' | 'FARMACI' | 'NOTTE'
export type Disponibilita = 'CONVIVENTE' | 'A_ORE' | 'NOTTE' | 'WEEKEND'
export type DatiProfiloBadante = {
  presentazione: string
  provincia: string
  comune: string
  zone: string | null
  anniEsperienza: number
  lingue: string | null
  servizi: Servizio[]
  disponibilita: Disponibilita[]
  tariffaOrariaCentesimi: number | null
  automunita: boolean
  visibile: boolean
}
export type ProfiloBadante = DatiProfiloBadante & { aggiornatoIl: string }
export type SchedaBadante = Omit<ProfiloBadante, 'visibile'> & { id: number; nome: string; cognome: string; contattoId: number | null }

// "Cerco una badante" e proposte
export type StatoProposta = 'INVIATA' | 'SCELTA' | 'NON_SCELTA' | 'RITIRATA'
export type DatiRicerca = {
  provincia: string
  comune: string
  descrizione: string
  orario: string
  servizi: Servizio[]
  disponibilita: Disponibilita[]
}
type BaseRicerca = Omit<DatiRicerca, 'orario'> & { id: number; orario: string | null; creataIl: string; chiusa: boolean }
/** Come la vede una badante: senza nomi. */
export type RicercaPubblica = BaseRicerca & { miaProposta: { id: number; stato: StatoProposta; messaggio: string } | null }
export type RicercaFamiglia = BaseRicerca & { creataDa: string | null; nuove: number; proposte: number }
export type PropostaPerFamiglia = {
  id: number
  messaggio: string
  stato: StatoProposta
  creataIl: string
  contattoId: number | null
  badante: Omit<ProfiloBadante, 'visibile' | 'aggiornatoIl'> & { id: number; nome: string; cognome: string }
}
export type MiaProposta = { id: number; messaggio: string; stato: StatoProposta; creataIl: string; contattoId: number | null; ricerca: BaseRicerca }
export type Conversazione = {
  id: number
  altro: { id: number; nome: string; cognome: string; tipo: TipoUtente }
  ultimoTesto: string | null
  ultimoIl: string
  nonLetti: number
  bloccato: boolean
}
export type MessaggioChat = { id: number; mio: boolean; autore: string; testo: string; creatoIl: string; lettoIl: string | null }
export type DettaglioConversazione = { conversazione: Conversazione; messaggi: MessaggioChat[]; puoInvitare: { id: number; nome: string }[] }

/** Quello che vede la Senior App. */
export type SeniorIo = {
  anziano: { id: number; nome: string; cognome: string }
  cerchio: string
  famiglia: { nome: string; ruolo: Ruolo }[]
  richieste: Richiesta[]
  medicine: Occorrenza[]
  appuntamenti: Appuntamento[]
  vocali: Vocale[]
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

/** Manda un audio registrato così com'è (non in JSON). */
async function inviaAudio(url: string, audio: Blob, durata: number): Promise<{ id: number }> {
  const risposta = await fetch(`${url}?durata=${Math.max(1, Math.round(durata))}`, {
    method: 'POST',
    headers: { 'Content-Type': audio.type || 'audio/webm' },
    body: audio,
    credentials: 'same-origin',
  })
  if (!risposta.ok) {
    const errore = await risposta.json().catch(() => null)
    throw new ErroreApi(risposta.status, errore?.codice ?? 'ERRORE', errore?.messaggio ?? `Il server ha risposto ${risposta.status}`)
  }
  return risposta.json()
}

/** Carica un documento: il file nel corpo, i dati nell'indirizzo. */
async function inviaDocumento(anzianoId: number, file: Blob, nome: string, dati: DatiDocumento, consenso: boolean): Promise<{ id: number }> {
  const q = new URLSearchParams({ categoria: dati.categoria, titolo: dati.titolo, data: dati.data, note: dati.note, nome })
  if (dati.importo !== null) q.set('importo', String(dati.importo))
  if (consenso) q.set('consenso', 'true')
  const risposta = await fetch(`/api/anziani/${anzianoId}/documenti?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: file,
    credentials: 'same-origin',
  })
  if (!risposta.ok) {
    const errore = await risposta.json().catch(() => null)
    throw new ErroreApi(risposta.status, errore?.codice ?? 'ERRORE', errore?.messaggio ?? `Il server ha risposto ${risposta.status}`)
  }
  return risposta.json()
}

/** Scarica un file (audio di un messaggio, documento). */
export async function scaricaFile(url: string): Promise<Blob> {
  const risposta = await fetch(url, { credentials: 'same-origin' })
  if (!risposta.ok) throw new ErroreApi(risposta.status, 'AUDIO', 'Non riesco a caricare il file. Riprova.')
  return risposta.blob()
}

export const api = {
  stato: () => chiama<Stato>('GET', '/api/stato'),

  // Accesso
  io: () => chiama<Profilo>('GET', '/api/auth/io'),
  login: (email: string, password: string) => chiama<Profilo>('POST', '/api/auth/login', { email, password }),
  registrati: (dati: DatiRegistrazione) => chiama<Profilo>('POST', '/api/auth/registrati', dati),
  logout: () => chiama<void>('POST', '/api/auth/logout'),
  preferenze: (emailAvvisi: boolean) => chiama<Profilo>('PATCH', '/api/auth/io', { emailAvvisi }),

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

  // Richieste di aiuto
  richieste: (cerchioId: number, vista: 'attive' | 'concluse') =>
    chiama<Richiesta[]>('GET', `/api/cerchi/${cerchioId}/richieste?vista=${vista}`),
  nuovaRichiesta: (cerchioId: number, anzianoId: number, categoria: Categoria, testo: string) =>
    chiama<Richiesta>('POST', `/api/cerchi/${cerchioId}/richieste`, { anzianoId, categoria, testo }),
  richiesta: (id: number) => chiama<DettaglioRichiesta>('GET', `/api/richieste/${id}`),
  azioneRichiesta: (id: number, azione: AzioneRichiesta, nota?: string) =>
    chiama<DettaglioRichiesta>('POST', `/api/richieste/${id}/${azione.toLowerCase()}`, nota ? { nota } : undefined),

  // Telefono dell'anziano (lato famiglia)
  statoTelefono: (anzianoId: number) => chiama<StatoTelefono>('GET', `/api/anziani/${anzianoId}/telefono`),
  nuovoCodice: (anzianoId: number) =>
    chiama<{ codice: string; scadeIl: string }>('POST', `/api/anziani/${anzianoId}/telefono/codice`),
  scollegaTelefono: (anzianoId: number, dispositivoId: number) =>
    chiama<void>('DELETE', `/api/anziani/${anzianoId}/telefono/${dispositivoId}`),

  // Medicine (lato famiglia)
  medicine: (anzianoId: number) => chiama<MedicineAnziano>('GET', `/api/anziani/${anzianoId}/medicine`),
  creaPromemoria: (anzianoId: number, momento: Momento, ora: string, consenso?: boolean) =>
    chiama<MedicineAnziano>('POST', `/api/anziani/${anzianoId}/promemoria`, { momento, ora, consenso }),
  modificaPromemoria: (id: number, dati: { ora?: string; attivo?: boolean }) => chiama<void>('PATCH', `/api/promemoria/${id}`, dati),
  eliminaPromemoria: (id: number) => chiama<void>('DELETE', `/api/promemoria/${id}`),

  // Appuntamenti
  appuntamenti: (anzianoId: number) => chiama<CalendarioAnziano>('GET', `/api/anziani/${anzianoId}/appuntamenti`),
  creaAppuntamento: (anzianoId: number, dati: DatiAppuntamento) =>
    chiama<CalendarioAnziano>('POST', `/api/anziani/${anzianoId}/appuntamenti`, dati),
  modificaAppuntamento: (id: number, dati: Partial<DatiAppuntamento>) => chiama<void>('PATCH', `/api/appuntamenti/${id}`, dati),
  eliminaAppuntamento: (id: number) => chiama<void>('DELETE', `/api/appuntamenti/${id}`),
  ciVadoIo: (id: number) => chiama<void>('POST', `/api/appuntamenti/${id}/accompagno`),
  nonCiVado: (id: number) => chiama<void>('DELETE', `/api/appuntamenti/${id}/accompagno`),

  // Messaggi vocali
  vocali: (anzianoId: number) => chiama<Vocale[]>('GET', `/api/anziani/${anzianoId}/vocali`),
  inviaVocale: (anzianoId: number, audio: Blob, durata: number) => inviaAudio(`/api/anziani/${anzianoId}/vocali`, audio, durata),
  audioVocale: (id: number) => `/api/vocali/${id}/audio`,

  // Documenti sanitari
  documenti: (anzianoId: number) => chiama<ArchivioDocumenti>('GET', `/api/anziani/${anzianoId}/documenti`),
  caricaDocumento: inviaDocumento,
  modificaDocumento: (id: number, dati: Partial<DatiDocumento>) => chiama<Documento>('PATCH', `/api/documenti/${id}`, dati),
  eliminaDocumento: (id: number) => chiama<void>('DELETE', `/api/documenti/${id}`),
  fileDocumento: (id: number) => `/api/documenti/${id}/file`,

  // Badanti
  mioProfiloBadante: () => chiama<{ profilo: ProfiloBadante | null; nome: string; cognome: string }>('GET', '/api/badante/profilo'),
  salvaProfiloBadante: (dati: DatiProfiloBadante) => chiama<void>('PUT', '/api/badante/profilo', dati),
  cercaBadanti: (filtri: { provincia?: string; servizio?: string; disponibilita?: string }) =>
    chiama<SchedaBadante[]>('GET', `/api/badanti?${new URLSearchParams(Object.entries(filtri).filter(([, v]) => v) as [string, string][])}`),
  schedaBadante: (id: number) => chiama<SchedaBadante>('GET', `/api/badanti/${id}`),
  scriviABadante: (id: number, testo: string) => chiama<{ contattoId: number }>('POST', `/api/badanti/${id}/messaggi`, { testo }),
  conversazioni: () => chiama<Conversazione[]>('GET', '/api/contatti'),
  conversazione: (id: number) => chiama<DettaglioConversazione>('GET', `/api/contatti/${id}`),
  rispondi: (id: number, testo: string) => chiama<void>('POST', `/api/contatti/${id}/messaggi`, { testo }),
  chiudiConversazione: (id: number, chiusa: boolean) => chiama<void>('POST', `/api/contatti/${id}/chiudi`, { chiusa }),
  invitaDaConversazione: (id: number, cerchioId: number) => chiama<void>('POST', `/api/contatti/${id}/invita`, { cerchioId }),

  // Cerco una badante: famiglia
  ricercheBadante: (cerchioId: number) => chiama<RicercaFamiglia[]>('GET', `/api/cerchi/${cerchioId}/ricerche-badante`),
  pubblicaRicerca: (cerchioId: number, dati: DatiRicerca) => chiama<{ id: number }>('POST', `/api/cerchi/${cerchioId}/ricerche-badante`, dati),
  ricercaBadante: (id: number) => chiama<{ ricerca: RicercaFamiglia; proposte: PropostaPerFamiglia[] }>('GET', `/api/ricerche-badante/${id}`),
  chiudiRicerca: (id: number) => chiama<void>('POST', `/api/ricerche-badante/${id}/chiudi`),
  scegliProposta: (id: number, testo: string) => chiama<{ contattoId: number }>('POST', `/api/proposte/${id}/scegli`, { testo }),
  rifiutaProposta: (id: number) => chiama<void>('POST', `/api/proposte/${id}/rifiuta`),
  // Cerco una badante: badante
  ricercheAperte: (provincia?: string) =>
    chiama<{ provincia: string | null; ricerche: RicercaPubblica[] }>('GET', `/api/lavoro/ricerche${provincia ? `?provincia=${provincia}` : ''}`),
  ricercaAperta: (id: number) => chiama<RicercaPubblica>('GET', `/api/lavoro/ricerche/${id}`),
  proponiti: (id: number, messaggio: string) => chiama<{ id: number }>('POST', `/api/lavoro/ricerche/${id}/proposte`, { messaggio }),
  mieProposte: () => chiama<MiaProposta[]>('GET', '/api/lavoro/proposte'),
  ritiraProposta: (id: number) => chiama<void>('POST', `/api/lavoro/proposte/${id}/ritira`),

  // Privacy
  datiPersonali: '/api/auth/io/dati',
  eliminaAccount: (password: string) => chiama<void>('DELETE', '/api/auth/io', { password }),
  eliminaAnziano: (id: number) => chiama<void>('DELETE', `/api/anziani/${id}`),

  // Notifiche push
  push: {
    chiave: () => chiama<{ chiave: string }>('GET', '/api/push/chiave'),
    iscrivi: (s: IscrizionePush) => chiama<void>('POST', '/api/push/iscrizione', s),
    cancella: (endpoint: string) => chiama<void>('DELETE', '/api/push/iscrizione', { endpoint }),
  },

  // Senior App (il telefono dell'anziano)
  senior: {
    fatto: (occorrenzaId: number) => chiama<void>('POST', `/api/senior/medicine/${occorrenzaId}/fatto`),
    rimanda: (occorrenzaId: number) => chiama<void>('POST', `/api/senior/medicine/${occorrenzaId}/rimanda`),
    iscriviPush: (s: IscrizionePush) => chiama<void>('POST', '/api/senior/push', s),
    inviaVocale: (audio: Blob, durata: number) => inviaAudio('/api/senior/vocali', audio, durata),
    audioVocale: (id: number) => `/api/senior/vocali/${id}/audio`,
    collega: (codice: string) => chiama<void>('POST', '/api/senior/collega', { codice }),
    io: () => chiama<SeniorIo>('GET', '/api/senior/io'),
    chiedi: (categoria: Categoria) => chiama<Richiesta>('POST', '/api/senior/richieste', { categoria }),
    annulla: (id: number) => chiama<void>('POST', `/api/senior/richieste/${id}/annulla`),
    esci: () => chiama<void>('POST', '/api/senior/esci'),
  },
}
