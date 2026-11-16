// Aggiornamenti "in diretta": quando una richiesta di aiuto cambia, i telefoni aperti su Unicare
// lo sanno subito, senza ricaricare la pagina.
//
// Si usa Server-Sent Events (SSE): il telefono apre GET /api/diretta (o /api/senior/diretta) e la
// connessione resta aperta; il server ci scrive una riga quando c'è una novità. Il browser si
// ricollega da solo se la linea cade.
//
// Il messaggio dice solo "la richiesta 12 è cambiata", mai cosa contiene: la pagina poi chiede i dati
// con le solite rotte, che controllano i permessi. Così la diretta non può far vedere nulla in più.
//
// Chi riceve: ogni membro del cerchio (calcolato al momento, quindi chi esce dal cerchio smette di
// ricevere) e il telefono dell'anziano. Funziona con un solo server; con più server servirebbe
// un canale comune (per esempio LISTEN/NOTIFY di PostgreSQL).

import type { Request, Response } from 'express'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'

/** Al massimo tante connessioni per persona (telefono, computer, qualche scheda) e in tutto. */
const MAX_PER_CHIAVE = 5
const MAX_TOTALI = 2000
/** Una riga vuota ogni tanto, così i proxy (Cloudflare, Render) non chiudono la linea per inattività. */
const BATTITO_MS = 25_000

export function creaDiretta(db: Database) {
  const clienti = new Map<string, Set<Response>>()
  let totali = 0

  function manda(chiave: string, evento: string, dati: unknown) {
    const riga = `event: ${evento}\ndata: ${JSON.stringify(dati)}\n\n`
    for (const res of clienti.get(chiave) ?? []) res.write(riga)
  }

  return {
    /** Apre la connessione per "u12" (un utente) o "a5" (il telefono di un anziano). */
    apri(chiave: string, req: Request, res: Response) {
      const suoi = clienti.get(chiave) ?? new Set<Response>()
      if (suoi.size >= MAX_PER_CHIAVE || totali >= MAX_TOTALI) {
        throw new ErroreApplicativo(429, 'TROPPE_CONNESSIONI', 'Troppe pagine aperte: chiudine qualcuna.')
      }
      res.status(200).set({
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // alcuni proxy altrimenti trattengono le righe
      })
      res.flushHeaders()
      // "retry": se cade, il browser riprova dopo 5 secondi.
      res.write('retry: 5000\n: collegato\n\n')
      suoi.add(res)
      clienti.set(chiave, suoi)
      totali++
      const battito = setInterval(() => res.write(': \n\n'), BATTITO_MS)
      req.on('close', () => {
        clearInterval(battito)
        suoi.delete(res)
        if (suoi.size === 0) clienti.delete(chiave)
        totali--
      })
    },

    /** Avvisa chi deve sapere che una richiesta è cambiata. Non fa mai fallire l'azione. */
    richiestaCambiata(richiestaId: number): void {
      db.query<{ anzianoId: number; utenteId: number }>(
        `SELECT r.anziano_id AS "anzianoId", m.utente_id AS "utenteId"
         FROM richiesta r JOIN membro_cerchio m ON m.cerchio_id = r.cerchio_id WHERE r.id = $1`,
        [richiestaId],
      )
        .then((righe) => {
          for (const r of righe) manda(`u${r.utenteId}`, 'richiesta', { id: richiestaId })
          if (righe[0]) manda(`a${righe[0].anzianoId}`, 'richiesta', { id: richiestaId })
        })
        .catch((e) => console.error('Diretta:', e))
    },

    /** Quante connessioni sono aperte (per i test). */
    aperte: () => totali,

    /** Allo spegnimento: chiude tutte le connessioni, altrimenti il server aspetterebbe per sempre. */
    chiudiTutto() {
      for (const suoi of clienti.values()) for (const res of suoi) res.end()
    },
  }
}

export type Diretta = ReturnType<typeof creaDiretta>
