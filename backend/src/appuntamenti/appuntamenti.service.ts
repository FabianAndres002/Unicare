// Calendario degli appuntamenti dell'anziano: visite, esami, il parrucchiere...
//
// Promemoria automatici (li manda il pianificatore, ogni minuto):
//   la sera prima, alle 18   all'anziano e a tutto il cerchio ("Chi ci va?")
//   due ore prima            all'anziano e a chi ci va
//
// Chi può fare cosa:
//   vedere il calendario                 tutti i membri del cerchio (badante compresa)
//   "Ci vado io" / "Non riesco più"   tutti i membri del cerchio
//   aggiungere, cambiare, togliere       familiari e amministratore

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { testoFacoltativo } from '../comune/validazione.ts'
import { PUO_MODIFICARE_ANZIANO, ruoloPerAnziano } from '../cerchio/permessi.ts'
import type { Avvisi } from '../notifiche/avvisi.ts'

const ORA_SERA_PRIMA = '18:00'
const ORE_PRIMA = 2

const schemaData = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data non valida (AAAA-MM-GG)')
const schemaOra = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ora non valida (HH:MM)')

export const schemaNuovoAppuntamento = z.object({
  titolo: z.string().trim().min(2, 'Scrivi di che appuntamento si tratta.').max(120),
  data: schemaData,
  ora: schemaOra,
  luogo: testoFacoltativo(200),
  note: testoFacoltativo(500),
})

export const schemaModificaAppuntamento = schemaNuovoAppuntamento.partial()

export type Appuntamento = {
  id: number
  titolo: string
  /** Data e ora, ISO in UTC. */
  quando: string
  luogo: string | null
  note: string | null
  accompagnaId: number | null
  accompagna: string | null
  creatoDa: string | null
}
export type AppuntamentoPerFamiglia = Appuntamento & { accompagnoIo: boolean }
export type CalendarioAnziano = {
  prossimi: AppuntamentoPerFamiglia[]
  passati: AppuntamentoPerFamiglia[]
  puoModificare: boolean
}

const ISO = (colonna: string) => `to_char(${colonna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

const SELECT = `
  SELECT ap.id, ap.titolo, ${ISO('ap.quando')} AS quando, ap.luogo, ap.note,
         ap.accompagna_id AS "accompagnaId", acc.nome AS accompagna, cr.nome AS "creatoDa"
  FROM appuntamento ap
  LEFT JOIN utente acc ON acc.id = ap.accompagna_id
  LEFT JOIN utente cr ON cr.id = ap.creato_da`

/** "giovedì 19 novembre alle 10:30" nel fuso italiano. */
export function quandoInParole(iso: string | Date): string {
  const d = new Date(iso)
  const giorno = d.toLocaleDateString('it-IT', { timeZone: config.fusoOrario, weekday: 'long', day: 'numeric', month: 'long' })
  const ora = d.toLocaleTimeString('it-IT', { timeZone: config.fusoOrario, hour: '2-digit', minute: '2-digit', hour12: false })
  return `${giorno} alle ${ora}`
}

const oraInParole = (iso: string | Date) =>
  new Date(iso).toLocaleTimeString('it-IT', { timeZone: config.fusoOrario, hour: '2-digit', minute: '2-digit', hour12: false })

export function creaServizioAppuntamenti(db: Database, avvisi: Avvisi) {
  async function appuntamento(id: number): Promise<Appuntamento & { anzianoId: number }> {
    const [a] = await db.query<Appuntamento & { anzianoId: number }>(
      SELECT.replace('SELECT ap.id,', 'SELECT ap.id, ap.anziano_id AS "anzianoId",') + ' WHERE ap.id = $1',
      [id],
    )
    if (!a) throw new ErroreApplicativo(404, 'APPUNTAMENTO_NON_TROVATO', 'Appuntamento non trovato.')
    return a
  }

  async function nomeAnziano(anzianoId: number): Promise<string> {
    const [a] = await db.query<{ nome: string }>('SELECT nome FROM anziano WHERE id = $1', [anzianoId])
    return a!.nome
  }

  /** Data e ora italiane → istante; non si possono mettere appuntamenti già passati. */
  async function istante(data: string, ora: string): Promise<Date> {
    const [r] = await db.query<{ quando: Date; passato: boolean }>(
      `SELECT t.q AS quando, t.q < now() AS passato
       FROM (SELECT (($1::date + $2::time) AT TIME ZONE $3) AS q) t`,
      [data, ora, config.fusoOrario],
    )
    if (r!.passato) throw new ErroreApplicativo(400, 'APPUNTAMENTO_NEL_PASSATO', 'Questa data è già passata.')
    return new Date(r!.quando)
  }

  return {
    async calendario(anzianoId: number, utenteId: number): Promise<CalendarioAnziano> {
      const ruolo = await ruoloPerAnziano(db, anzianoId, utenteId)
      const tutti = (lista: Appuntamento[]) => lista.map((a) => ({ ...a, accompagnoIo: a.accompagnaId === utenteId }))
      const prossimi = await db.query<Appuntamento>(
        `${SELECT} WHERE ap.anziano_id = $1 AND ap.quando >= now() - interval '1 hour' ORDER BY ap.quando`,
        [anzianoId],
      )
      const passati = await db.query<Appuntamento>(
        `${SELECT} WHERE ap.anziano_id = $1 AND ap.quando < now() - interval '1 hour' ORDER BY ap.quando DESC LIMIT 10`,
        [anzianoId],
      )
      return { prossimi: tutti(prossimi), passati: tutti(passati), puoModificare: PUO_MODIFICARE_ANZIANO.includes(ruolo) }
    },

    /** I prossimi appuntamenti, per la Senior App. */
    prossimiPerAnziano(anzianoId: number): Promise<Appuntamento[]> {
      return db.query<Appuntamento>(
        `${SELECT} WHERE ap.anziano_id = $1 AND ap.quando >= now() - interval '1 hour' ORDER BY ap.quando LIMIT 5`,
        [anzianoId],
      )
    },

    async crea(anzianoId: number, utenteId: number, dati: z.infer<typeof schemaNuovoAppuntamento>): Promise<number> {
      await ruoloPerAnziano(db, anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      const quando = await istante(dati.data, dati.ora)
      const [r] = await db.query<{ id: number }>(
        `INSERT INTO appuntamento (anziano_id, titolo, quando, luogo, note, creato_da)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [anzianoId, dati.titolo, quando, dati.luogo, dati.note, utenteId],
      )
      const [autore] = await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [utenteId])
      const nome = await nomeAnziano(anzianoId)
      avvisi.cerchio(
        anzianoId,
        `Nuovo appuntamento per ${nome}: ${dati.titolo}`,
        [`${autore!.nome} l’ha messo in calendario per ${quandoInParole(quando)}.`, ...(dati.luogo ? [`Dove: ${dati.luogo}`] : []), `Chi può andare con ${nome}?`],
        `/anziano/${anzianoId}/appuntamenti`,
        `appuntamento-${r!.id}`,
        { tranne: utenteId },
      )
      return r!.id
    },

    async modifica(id: number, utenteId: number, dati: z.infer<typeof schemaModificaAppuntamento>): Promise<void> {
      const a = await appuntamento(id)
      await ruoloPerAnziano(db, a.anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      let quando: Date | null = null
      if (dati.data !== undefined || dati.ora !== undefined) {
        const attuale = new Date(a.quando)
        const data = dati.data ?? attuale.toLocaleDateString('sv-SE', { timeZone: config.fusoOrario })
        const ora = dati.ora ?? oraInParole(attuale)
        quando = await istante(data, ora)
        if (quando.getTime() === attuale.getTime()) quando = null
      }
      await db.query(
        `UPDATE appuntamento SET
           titolo = COALESCE($2, titolo),
           luogo = CASE WHEN $3 THEN $4 ELSE luogo END,
           note = CASE WHEN $5 THEN $6 ELSE note END,
           quando = COALESCE($7, quando),
           -- Nuova data o ora: i promemoria ripartono da capo.
           modificato_il = CASE WHEN $7::timestamptz IS NULL THEN modificato_il ELSE now() END,
           avvisato_sera_prima_il = CASE WHEN $7::timestamptz IS NULL THEN avvisato_sera_prima_il END,
           avvisato_ore_prima_il = CASE WHEN $7::timestamptz IS NULL THEN avvisato_ore_prima_il END
         WHERE id = $1`,
        [id, dati.titolo ?? null, dati.luogo !== undefined, dati.luogo ?? null, dati.note !== undefined, dati.note ?? null, quando],
      )
      if (quando && a.accompagnaId && a.accompagnaId !== utenteId) {
        avvisi.cerchio(
          a.anzianoId,
          `Cambiato: ${dati.titolo ?? a.titolo}`,
          [`Ora è ${quandoInParole(quando)}. Riesci ancora ad andare con ${await nomeAnziano(a.anzianoId)}?`],
          `/anziano/${a.anzianoId}/appuntamenti`,
          `appuntamento-${id}`,
          { solo: [a.accompagnaId] },
        )
      }
    },

    async elimina(id: number, utenteId: number): Promise<void> {
      const a = await appuntamento(id)
      await ruoloPerAnziano(db, a.anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      await db.query('DELETE FROM appuntamento WHERE id = $1', [id])
      if (a.accompagnaId && a.accompagnaId !== utenteId && new Date(a.quando) > new Date()) {
        avvisi.cerchio(
          a.anzianoId,
          `Annullato: ${a.titolo}`,
          [`L’appuntamento di ${quandoInParole(a.quando)} è stato tolto dal calendario: non serve più andare con ${await nomeAnziano(a.anzianoId)}.`],
          `/anziano/${a.anzianoId}/appuntamenti`,
          `appuntamento-${id}`,
          { solo: [a.accompagnaId] },
        )
      }
    },

    /** "Ci vado io": accompagno io l'anziano. */
    async accompagno(id: number, utenteId: number): Promise<void> {
      const a = await appuntamento(id)
      await ruoloPerAnziano(db, a.anzianoId, utenteId)
      const r = await db.query(
        `UPDATE appuntamento SET accompagna_id = $2 WHERE id = $1 AND (accompagna_id IS NULL OR accompagna_id = $2) AND quando > now() RETURNING id`,
        [id, utenteId],
      )
      if (!r.length) {
        throw new ErroreApplicativo(409, 'GIA_ACCOMPAGNATO', a.accompagna ? `Ci va già ${a.accompagna}.` : 'Questo appuntamento è già passato.')
      }
      if (a.accompagnaId === utenteId) return
      const [io] = await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [utenteId])
      avvisi.anziano(a.anzianoId, {
        titolo: `${io!.nome} ti accompagna`,
        testo: `${a.titolo}, ${quandoInParole(a.quando)}.`,
        url: '/senior',
        tag: `appuntamento-${id}`,
      })
    },

    /** "Non riesco più ad andarci". */
    async nonAccompagno(id: number, utenteId: number): Promise<void> {
      const a = await appuntamento(id)
      await ruoloPerAnziano(db, a.anzianoId, utenteId)
      const r = await db.query('UPDATE appuntamento SET accompagna_id = NULL WHERE id = $1 AND accompagna_id = $2 RETURNING id', [id, utenteId])
      if (!r.length) throw new ErroreApplicativo(409, 'NON_ACCOMPAGNI', 'Non risulti tu ad andarci.')
      if (new Date(a.quando) <= new Date()) return
      const nome = await nomeAnziano(a.anzianoId)
      avvisi.cerchio(
        a.anzianoId,
        `Serve qualcuno che accompagni ${nome}: ${a.titolo}`,
        [`${a.accompagna} non riesce più ad andare con ${nome} ${quandoInParole(a.quando)}.`, 'Chi può andare?'],
        `/anziano/${a.anzianoId}/appuntamenti`,
        `appuntamento-${id}`,
        { tranne: utenteId },
      )
    },
  }
}

export type ServizioAppuntamenti = ReturnType<typeof creaServizioAppuntamenti>

/** I promemoria degli appuntamenti: la sera prima e due ore prima. Il pianificatore lo chiama ogni minuto. */
export function creaPianificatoreAppuntamenti(db: Database, avvisi: Avvisi) {
  type Riga = { id: number; anzianoId: number; nome: string; titolo: string; quando: Date; luogo: string | null; accompagnaId: number | null; accompagna: string | null }
  const RITORNO = `RETURNING ap.id, ap.anziano_id AS "anzianoId", an.nome, ap.titolo, ap.quando, ap.luogo, ap.accompagna_id AS "accompagnaId",
                   (SELECT nome FROM utente WHERE id = ap.accompagna_id) AS accompagna`

  return {
    async giro(adesso: Date = new Date()): Promise<void> {
      const fuso = config.fusoOrario
      const sera = `((ap.quando AT TIME ZONE $2)::date - 1 + $3::time) AT TIME ZONE $2`

      // La sera prima. Non parte se l'appuntamento è stato messo (o spostato) dopo quell'ora,
      // o se ormai manca poco: in quel caso ci pensa l'avviso di due ore prima.
      const seraPrima = await db.query<Riga>(
        `UPDATE appuntamento ap SET avvisato_sera_prima_il = $1
         FROM anziano an
         WHERE an.id = ap.anziano_id AND ap.avvisato_sera_prima_il IS NULL
           AND ${sera} <= $1 AND ${sera} > ap.modificato_il
           AND ap.quando - make_interval(hours => $4) > $1
         ${RITORNO}`,
        [adesso, fuso, ORA_SERA_PRIMA, ORE_PRIMA],
      )
      for (const a of seraPrima) {
        const ora = oraInParole(a.quando)
        const dove = a.luogo ? `, ${a.luogo}` : ''
        avvisi.anziano(a.anzianoId, {
          titolo: `Domani: ${a.titolo}`,
          testo: `Alle ${ora}${dove}.${a.accompagna ? ` Ti accompagna ${a.accompagna}.` : ''}`,
          url: '/senior',
          tag: `appuntamento-${a.id}`,
        })
        avvisi.cerchio(
          a.anzianoId,
          `Domani ${a.nome} ha: ${a.titolo}`,
          [`Alle ${ora}${dove}.`, a.accompagna ? `Ci va ${a.accompagna}.` : 'Nessuno ha ancora detto “Ci vado io”.'],
          `/anziano/${a.anzianoId}/appuntamenti`,
          `appuntamento-${a.id}`,
        )
      }

      // Due ore prima: all'anziano e a chi ci va.
      const orePrima = await db.query<Riga>(
        `UPDATE appuntamento ap SET avvisato_ore_prima_il = $1
         FROM anziano an
         WHERE an.id = ap.anziano_id AND ap.avvisato_ore_prima_il IS NULL
           AND ap.quando - make_interval(hours => $2) <= $1 AND ap.quando > $1
         ${RITORNO}`,
        [adesso, ORE_PRIMA],
      )
      for (const a of orePrima) {
        const ora = oraInParole(a.quando)
        const dove = a.luogo ? `, ${a.luogo}` : ''
        avvisi.anziano(a.anzianoId, {
          titolo: `Tra poco: ${a.titolo}`,
          testo: `Alle ${ora}${dove}.${a.accompagna ? ` Ti accompagna ${a.accompagna}.` : ''}`,
          url: '/senior',
          tag: `appuntamento-${a.id}`,
          insistente: true,
        })
        if (a.accompagnaId) {
          avvisi.cerchio(
            a.anzianoId,
            `Alle ${ora} accompagni ${a.nome}: ${a.titolo}`,
            [a.luogo ? `Dove: ${a.luogo}` : 'Controlla i dettagli in Unicare.'],
            `/anziano/${a.anzianoId}/appuntamenti`,
            `appuntamento-${a.id}`,
            { solo: [a.accompagnaId] },
          )
        }
      }
    },
  }
}
