// Richieste di aiuto: qualcuno chiede (la spesa, la farmacia, un passaggio...) e un membro
// del cerchio se ne occupa. Non sa nulla di HTTP: riceve dati e restituisce dati.
//
//   APERTA ──prendi──▶ PRESA_IN_CARICO ──completa──▶ COMPLETATA
//      ▲                    │
//      └─────rilascia───────┘          annulla: da APERTA o PRESA_IN_CARICO ▶ ANNULLATA
//
// Chi può fare cosa:
//   prendi    qualsiasi membro, se la richiesta è aperta
//   rilascia  solo chi l'ha presa ("non riesco più")
//   completa  chi l'ha presa, oppure l'amministratore
//   annulla   chi l'ha creata, oppure l'amministratore
//
// Il backend calcola le azioni permesse e le manda al frontend, che mostra solo quei pulsanti.
// Ma ogni azione viene ricontrollata qui: il frontend non è mai la difesa.

import { z } from 'zod'
import type { Database, Esecutore } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { testoFacoltativo } from '../comune/validazione.ts'
import { ruoloNelCerchio, type Ruolo } from '../cerchio/permessi.ts'

export const CATEGORIE = ['SPESA', 'FARMACIA', 'ACCOMPAGNAMENTO', 'COMPAGNIA', 'CASA', 'ALTRO'] as const
export type Categoria = (typeof CATEGORIE)[number]
export type Stato = 'APERTA' | 'PRESA_IN_CARICO' | 'COMPLETATA' | 'ANNULLATA'
export type Azione = 'PRENDI' | 'RILASCIA' | 'COMPLETA' | 'ANNULLA'

export const schemaNuovaRichiesta = z
  .object({
    anzianoId: z.number().int().positive(),
    categoria: z.enum(CATEGORIE),
    testo: testoFacoltativo(500),
  })
  .refine((r) => r.categoria !== 'ALTRO' || r.testo, { path: ['testo'], message: 'scrivi di cosa c’è bisogno' })

export const schemaNota = z.object({ nota: testoFacoltativo(300) }).default({ nota: null })

export const schemaVista = z.enum(['attive', 'concluse']).default('attive')

type Persona = { id: number; nome: string } | null

export type Richiesta = {
  id: number
  cerchioId: number
  anziano: { id: number; nome: string }
  categoria: Categoria
  testo: string | null
  stato: Stato
  creataDa: Persona
  creataIl: string
  presaDa: Persona
  presaIl: string | null
  chiusaIl: string | null
  /** Cosa può fare l'utente che sta guardando. */
  azioni: Azione[]
}

export type Evento = { tipo: string; utente: string | null; nota: string | null; il: string }
export type DettaglioRichiesta = Richiesta & { eventi: Evento[] }

type Riga = Omit<Richiesta, 'anziano' | 'creataDa' | 'presaDa' | 'azioni'> & {
  anzianoId: number
  anzianoNome: string
  creataDaId: number | null
  creataDaNome: string | null
  presaDaId: number | null
  presaDaNome: string | null
}

const SELECT_RICHIESTA = `
  SELECT r.id, r.cerchio_id AS "cerchioId", r.categoria, r.testo, r.stato,
         r.creata_il AS "creataIl", r.presa_il AS "presaIl", r.chiusa_il AS "chiusaIl",
         a.id AS "anzianoId", a.nome AS "anzianoNome",
         c.id AS "creataDaId", c.nome AS "creataDaNome",
         p.id AS "presaDaId", p.nome AS "presaDaNome"
  FROM richiesta r
  JOIN anziano a ON a.id = r.anziano_id
  LEFT JOIN utente c ON c.id = r.creata_da
  LEFT JOIN utente p ON p.id = r.presa_da`

/** Le azioni che questo utente può fare su questa richiesta, nel suo stato attuale. */
export function azioniPermesse(r: { stato: Stato; creataDaId: number | null; presaDaId: number | null }, utenteId: number, ruolo: Ruolo): Azione[] {
  const admin = ruolo === 'ADMIN'
  const creatore = r.creataDaId === utenteId
  const incaricato = r.presaDaId === utenteId
  const azioni: Azione[] = []
  if (r.stato === 'APERTA') azioni.push('PRENDI')
  if (r.stato === 'PRESA_IN_CARICO' && incaricato) azioni.push('RILASCIA')
  if (r.stato === 'PRESA_IN_CARICO' && (incaricato || admin)) azioni.push('COMPLETA')
  if ((r.stato === 'APERTA' || r.stato === 'PRESA_IN_CARICO') && (creatore || admin)) azioni.push('ANNULLA')
  return azioni
}

function componi(r: Riga, utenteId: number, ruolo: Ruolo): Richiesta {
  return {
    id: r.id,
    cerchioId: r.cerchioId,
    anziano: { id: r.anzianoId, nome: r.anzianoNome },
    categoria: r.categoria,
    testo: r.testo,
    stato: r.stato,
    creataDa: r.creataDaId ? { id: r.creataDaId, nome: r.creataDaNome! } : null,
    creataIl: r.creataIl,
    presaDa: r.presaDaId ? { id: r.presaDaId, nome: r.presaDaNome! } : null,
    presaIl: r.presaIl,
    chiusaIl: r.chiusaIl,
    azioni: azioniPermesse(r, utenteId, ruolo),
  }
}

const NON_TROVATA = () => new ErroreApplicativo(404, 'RICHIESTA_NON_TROVATA', 'Richiesta non trovata.')

/** Perché un'azione non si può più fare: la richiesta è cambiata nel frattempo? */
function erroreStato(r: Riga, azione: Azione): ErroreApplicativo {
  const cambiata = (messaggio: string) => new ErroreApplicativo(409, 'STATO_CAMBIATO', messaggio)
  if (r.stato === 'COMPLETATA') return cambiata('Questa richiesta è già stata completata.')
  if (r.stato === 'ANNULLATA') return cambiata('Questa richiesta è stata annullata.')
  if (azione === 'PRENDI' && r.stato === 'PRESA_IN_CARICO') return cambiata(`Se ne sta già occupando ${r.presaDaNome ?? 'qualcun altro'}.`)
  if (azione !== 'PRENDI' && r.stato === 'APERTA' && azione !== 'ANNULLA') return cambiata('Nessuno se ne sta ancora occupando.')
  return new ErroreApplicativo(403, 'PERMESSO_NEGATO', 'Non hai il permesso per questa operazione.')
}

// Per ogni azione: la modifica alla riga e il nome dell'evento nello storico.
// Ogni UPDATE controlla anche lo stato di partenza (e l'incaricato): se nel frattempo
// qualcun altro ha cambiato la richiesta, non aggiorna nulla e rispondiamo 409.
// $1 = id della richiesta, $2 (se serve) = utente che agisce.
const TRANSIZIONI: Record<Azione, { evento: string; sql: string; conUtente: boolean }> = {
  PRENDI: {
    evento: 'PRESA',
    sql: `UPDATE richiesta SET stato = 'PRESA_IN_CARICO', presa_da = $2, presa_il = now()
          WHERE id = $1 AND stato = 'APERTA' RETURNING id`,
    conUtente: true,
  },
  RILASCIA: {
    evento: 'RILASCIATA',
    sql: `UPDATE richiesta SET stato = 'APERTA', presa_da = NULL, presa_il = NULL
          WHERE id = $1 AND stato = 'PRESA_IN_CARICO' AND presa_da = $2 RETURNING id`,
    conUtente: true,
  },
  COMPLETA: {
    // L'amministratore può completare anche se l'ha presa un altro: per lui basta lo stato.
    evento: 'COMPLETATA',
    sql: `UPDATE richiesta SET stato = 'COMPLETATA', chiusa_il = now()
          WHERE id = $1 AND stato = 'PRESA_IN_CARICO' RETURNING id`,
    conUtente: false,
  },
  ANNULLA: {
    evento: 'ANNULLATA',
    sql: `UPDATE richiesta SET stato = 'ANNULLATA', chiusa_il = now()
          WHERE id = $1 AND stato IN ('APERTA', 'PRESA_IN_CARICO') RETURNING id`,
    conUtente: false,
  },
}

export function creaServizioRichieste(db: Database) {
  async function trova(tx: Esecutore, id: number): Promise<Riga | undefined> {
    const [r] = await tx.query<Riga>(`${SELECT_RICHIESTA} WHERE r.id = $1`, [id])
    return r
  }

  /** Carica la richiesta e il ruolo dell'utente; chi non è nel cerchio riceve 404. */
  async function caricaPer(id: number, utenteId: number): Promise<{ riga: Riga; ruolo: Ruolo }> {
    const riga = await trova(db, id)
    if (!riga) throw NON_TROVATA()
    try {
      return { riga, ruolo: await ruoloNelCerchio(db, riga.cerchioId, utenteId) }
    } catch {
      throw NON_TROVATA()
    }
  }

  return {
    async crea(cerchioId: number, utenteId: number, dati: z.infer<typeof schemaNuovaRichiesta>): Promise<Richiesta> {
      const ruolo = await ruoloNelCerchio(db, cerchioId, utenteId)
      const [anziano] = await db.query('SELECT 1 FROM anziano WHERE id = $1 AND cerchio_id = $2', [dati.anzianoId, cerchioId])
      if (!anziano) throw new ErroreApplicativo(400, 'ANZIANO_NON_VALIDO', 'Questa persona non fa parte del cerchio.')
      const id = await db.transazione(async (tx) => {
        const [r] = await tx.query<{ id: number }>(
          `INSERT INTO richiesta (cerchio_id, anziano_id, categoria, testo, creata_da)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [cerchioId, dati.anzianoId, dati.categoria, dati.testo, utenteId],
        )
        await tx.query(`INSERT INTO richiesta_evento (richiesta_id, tipo, utente_id) VALUES ($1, 'CREATA', $2)`, [r!.id, utenteId])
        return r!.id
      })
      return componi((await trova(db, id))!, utenteId, ruolo)
    },

    /** "attive": aperte (le più vecchie prima) e poi quelle in corso. "concluse": le ultime 50. */
    async elenco(cerchioId: number, utenteId: number, vista: z.infer<typeof schemaVista>): Promise<Richiesta[]> {
      const ruolo = await ruoloNelCerchio(db, cerchioId, utenteId)
      const righe = await db.query<Riga>(
        vista === 'attive'
          ? `${SELECT_RICHIESTA} WHERE r.cerchio_id = $1 AND r.stato IN ('APERTA', 'PRESA_IN_CARICO')
             ORDER BY (r.stato = 'APERTA') DESC, r.creata_il, r.id`
          : `${SELECT_RICHIESTA} WHERE r.cerchio_id = $1 AND r.stato IN ('COMPLETATA', 'ANNULLATA')
             ORDER BY r.chiusa_il DESC, r.id DESC LIMIT 50`,
        [cerchioId],
      )
      return righe.map((r) => componi(r, utenteId, ruolo))
    },

    async dettaglio(id: number, utenteId: number): Promise<DettaglioRichiesta> {
      const { riga, ruolo } = await caricaPer(id, utenteId)
      const eventi = await db.query<Evento>(
        `SELECT e.tipo, u.nome AS utente, e.nota, e.il FROM richiesta_evento e
         LEFT JOIN utente u ON u.id = e.utente_id WHERE e.richiesta_id = $1 ORDER BY e.il, e.id`,
        [id],
      )
      return { ...componi(riga, utenteId, ruolo), eventi }
    },

    /** Esegue un passaggio di stato, se permesso. */
    async esegui(id: number, utenteId: number, azione: Azione, nota: string | null = null): Promise<DettaglioRichiesta> {
      const { riga, ruolo } = await caricaPer(id, utenteId)
      if (!azioniPermesse(riga, utenteId, ruolo).includes(azione)) throw erroreStato(riga, azione)

      const t = TRANSIZIONI[azione]
      await db.transazione(async (tx) => {
        const aggiornate = await tx.query(t.sql, t.conUtente ? [id, utenteId] : [id])
        if (aggiornate.length === 0) {
          throw erroreStato((await trova(tx, id))!, azione)
        }
        await tx.query('INSERT INTO richiesta_evento (richiesta_id, tipo, utente_id, nota) VALUES ($1, $2, $3, $4)', [id, t.evento, utenteId, nota])
      })
      return this.dettaglio(id, utenteId)
    },

  }
}

export type ServizioRichieste = ReturnType<typeof creaServizioRichieste>
