// Promemoria delle medicine.
//
// La famiglia imposta fino a tre promemoria al giorno: "Medicine del mattino", "del pranzo",
// "della sera", ognuno con il suo orario. All'orario il telefono dell'anziano suona e mostra
// "Fatto" e "Ricordamelo tra 15 minuti". Se dopo un'ora non ha confermato, i familiari
// ricevono un avviso.
//
// Il nome dei farmaci non si salva e non compare mai: è un dato sanitario.
// Prima del primo promemoria serve il consenso: la famiglia vedrà se l'anziano ha preso le medicine.
//
// Chi può fare cosa:
//   vedere i promemoria e chi li ha confermati   tutti i membri del cerchio (badante compresa)
//   creare, cambiare, togliere                   familiari e amministratore

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { PUO_MODIFICARE_ANZIANO, richiediRuolo, ruoloNelCerchio, type Ruolo } from '../cerchio/permessi.ts'
import type { Avvisi } from '../notifiche/avvisi.ts'

export const MOMENTI = ['MATTINO', 'PRANZO', 'SERA'] as const
export type Momento = (typeof MOMENTI)[number]

export const NOME_MOMENTO: Record<Momento, string> = {
  MATTINO: 'le medicine del mattino',
  PRANZO: 'le medicine del pranzo',
  SERA: 'le medicine della sera',
}

export const TITOLO_MOMENTO: Record<Momento, string> = {
  MATTINO: 'medicine del mattino',
  PRANZO: 'medicine del pranzo',
  SERA: 'medicine della sera',
}

const MINUTI_PRIMA_DI_AVVISARE_LA_FAMIGLIA = 60
const MINUTI_RIMANDO = 15
export const VERSIONE_CONSENSO_MEDICINE = '2026-11'

const schemaOra = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'ora non valida (HH:MM)')

export const schemaNuovoPromemoria = z.object({
  momento: z.enum(MOMENTI),
  ora: schemaOra,
  /** Va mandato true la prima volta: l'anziano è d'accordo. */
  consenso: z.boolean().optional(),
})

export const schemaModificaPromemoria = z
  .object({ ora: schemaOra.optional(), attivo: z.boolean().optional() })
  .refine((d) => d.ora !== undefined || d.attivo !== undefined, 'niente da modificare')

export type Promemoria = { id: number; momento: Momento; ora: string; attivo: boolean }
export type Occorrenza = {
  id: number
  promemoriaId: number
  momento: Momento
  previstoIl: string
  stato: 'IN_ATTESA' | 'FATTO' | 'NON_CONFERMATO'
  confermatoIl: string | null
  rimandi: number
  /** Quando suonerà la prossima notifica (dopo "Ricordamelo"); null se è già suonata. */
  avvisareIl: string | null
}
export type MedicineAnziano = {
  promemoria: Promemoria[]
  oggi: Occorrenza[]
  consenso: boolean
  puoModificare: boolean
}

const ISO = (colonna: string) => `to_char(${colonna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

const SELECT_OGGI = `
  SELECT o.id, o.promemoria_id AS "promemoriaId", p.momento, ${ISO('o.previsto_il')} AS "previstoIl",
         o.stato, ${ISO('o.confermato_il')} AS "confermatoIl", o.rimandi, ${ISO('o.avvisare_il')} AS "avvisareIl"
  FROM occorrenza o JOIN promemoria p ON p.id = o.promemoria_id
  WHERE p.anziano_id = $1 AND (o.previsto_il AT TIME ZONE $2)::date = (now() AT TIME ZONE $2)::date
  ORDER BY o.previsto_il`

export function creaServizioMedicine(db: Database, avvisi: Avvisi) {
  async function anzianoECerchio(anzianoId: number) {
    const [a] = await db.query<{ cerchioId: number; nome: string }>('SELECT cerchio_id AS "cerchioId", nome FROM anziano WHERE id = $1', [anzianoId])
    if (!a) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Persona non trovata.')
    return a
  }

  /** Il ruolo nel cerchio dell'anziano; chi non ne fa parte riceve 404. */
  async function ruoloPer(anzianoId: number, utenteId: number, ammessi?: Ruolo[]): Promise<Ruolo> {
    const { cerchioId } = await anzianoECerchio(anzianoId)
    try {
      return ammessi ? await richiediRuolo(db, cerchioId, utenteId, ammessi) : await ruoloNelCerchio(db, cerchioId, utenteId)
    } catch (e) {
      if (e instanceof ErroreApplicativo && e.stato === 404) throw new ErroreApplicativo(404, 'ANZIANO_NON_TROVATO', 'Persona non trovata.')
      throw e
    }
  }

  async function promemoriaDi(id: number): Promise<{ anzianoId: number }> {
    const [p] = await db.query<{ anzianoId: number }>('SELECT anziano_id AS "anzianoId" FROM promemoria WHERE id = $1', [id])
    if (!p) throw new ErroreApplicativo(404, 'PROMEMORIA_NON_TROVATO', 'Promemoria non trovato.')
    return p
  }

  const oggi = (anzianoId: number) => db.query<Occorrenza>(SELECT_OGGI, [anzianoId, config.fusoOrario])

  return {
    oggi,

    async perFamiglia(anzianoId: number, utenteId: number): Promise<MedicineAnziano> {
      const ruolo = await ruoloPer(anzianoId, utenteId)
      const promemoria = await db.query<Promemoria>(
        `SELECT id, momento, to_char(ora, 'HH24:MI') AS ora, attivo FROM promemoria WHERE anziano_id = $1 ORDER BY ora`,
        [anzianoId],
      )
      const [consenso] = await db.query(
        `SELECT 1 FROM consenso WHERE anziano_id = $1 AND tipo = 'PROMEMORIA_MEDICINE' AND revocato_il IS NULL`,
        [anzianoId],
      )
      return { promemoria, oggi: await oggi(anzianoId), consenso: Boolean(consenso), puoModificare: PUO_MODIFICARE_ANZIANO.includes(ruolo) }
    },

    async crea(anzianoId: number, utenteId: number, dati: z.infer<typeof schemaNuovoPromemoria>): Promise<void> {
      await ruoloPer(anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      await db.transazione(async (tx) => {
        const [consenso] = await tx.query(
          `SELECT 1 FROM consenso WHERE anziano_id = $1 AND tipo = 'PROMEMORIA_MEDICINE' AND revocato_il IS NULL`,
          [anzianoId],
        )
        if (!consenso) {
          if (!dati.consenso) {
            throw new ErroreApplicativo(400, 'CONSENSO_MANCANTE', 'Serve il consenso dell’anziano per i promemoria delle medicine.')
          }
          await tx.query(
            `INSERT INTO consenso (anziano_id, tipo, versione_testo, dato_da) VALUES ($1, 'PROMEMORIA_MEDICINE', $2, $3)`,
            [anzianoId, VERSIONE_CONSENSO_MEDICINE, utenteId],
          )
        }
        const [doppio] = await tx.query('SELECT 1 FROM promemoria WHERE anziano_id = $1 AND momento = $2', [anzianoId, dati.momento])
        if (doppio) throw new ErroreApplicativo(409, 'PROMEMORIA_GIA_PRESENTE', 'C’è già un promemoria per questo momento: cambia l’orario di quello.')
        await tx.query('INSERT INTO promemoria (anziano_id, momento, ora, creato_da) VALUES ($1, $2, $3, $4)', [anzianoId, dati.momento, dati.ora, utenteId])
      })
    },

    async modifica(id: number, utenteId: number, dati: z.infer<typeof schemaModificaPromemoria>): Promise<void> {
      const { anzianoId } = await promemoriaDi(id)
      await ruoloPer(anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      await db.transazione(async (tx) => {
        await tx.query(
          `UPDATE promemoria SET ora = COALESCE($2::time, ora), attivo = COALESCE($3, attivo), modificato_il = now() WHERE id = $1`,
          [id, dati.ora ?? null, dati.attivo ?? null],
        )
        // Le notifiche di oggi non ancora arrivate con il vecchio orario non servono più.
        await tx.query(`DELETE FROM occorrenza WHERE promemoria_id = $1 AND stato = 'IN_ATTESA' AND previsto_il > now()`, [id])
      })
    },

    async elimina(id: number, utenteId: number): Promise<void> {
      const { anzianoId } = await promemoriaDi(id)
      await ruoloPer(anzianoId, utenteId, PUO_MODIFICARE_ANZIANO)
      await db.query('DELETE FROM promemoria WHERE id = $1', [id])
    },

    // ---- Dal telefono dell'anziano ----

    /** "Fatto": anche in ritardo. Fino a un'ora prima dell'orario si può confermare in anticipo. */
    async fatto(occorrenzaId: number, anzianoId: number): Promise<void> {
      const [r] = await db.query<{ eraNonConfermato: boolean; momento: Momento; nome: string }>(
        `WITH prima AS (
           SELECT o.id, o.stato FROM occorrenza o JOIN promemoria p ON p.id = o.promemoria_id
           WHERE o.id = $1 AND p.anziano_id = $2 AND o.stato IN ('IN_ATTESA', 'NON_CONFERMATO')
             AND o.previsto_il <= now() + make_interval(mins => $3)
           FOR UPDATE OF o
         )
         UPDATE occorrenza o SET stato = 'FATTO', confermato_il = now(), avvisare_il = NULL
         FROM prima, promemoria p, anziano a
         WHERE o.id = prima.id AND p.id = o.promemoria_id AND a.id = p.anziano_id
         RETURNING prima.stato = 'NON_CONFERMATO' AS "eraNonConfermato", p.momento, a.nome`,
        [occorrenzaId, anzianoId, MINUTI_PRIMA_DI_AVVISARE_LA_FAMIGLIA],
      )
      if (!r) throw new ErroreApplicativo(404, 'MEDICINA_NON_TROVATA', 'Non c’è niente da confermare.')
      // La famiglia era stata avvisata del ritardo: ora diciamo che è tutto a posto.
      if (r.eraNonConfermato) {
        avvisi.familiari(anzianoId, `${r.nome} ha preso ${NOME_MOMENTO[r.momento]}`, ['Ha confermato in ritardo, ma è tutto a posto.'], `/anziano/${anzianoId}/medicine`, `medicine-${occorrenzaId}`)
      }
    },

    /** "Ricordamelo tra 15 minuti". */
    async rimanda(occorrenzaId: number, anzianoId: number): Promise<void> {
      const r = await db.query(
        `UPDATE occorrenza o SET avvisare_il = now() + make_interval(mins => $3), rimandi = o.rimandi + 1
         FROM promemoria p
         WHERE o.id = $1 AND p.id = o.promemoria_id AND p.anziano_id = $2 AND o.stato = 'IN_ATTESA' AND o.previsto_il <= now()
         RETURNING o.id`,
        [occorrenzaId, anzianoId, MINUTI_RIMANDO],
      )
      if (!r.length) throw new ErroreApplicativo(404, 'MEDICINA_NON_TROVATA', 'Non c’è niente da rimandare.')
    },
  }
}

export type ServizioMedicine = ReturnType<typeof creaServizioMedicine>

/**
 * Il "pianificatore" gira ogni minuto (vedi server.ts). Ogni volta:
 * 1. crea le occorrenze di oggi per i promemoria attivi;
 * 2. manda la notifica all'anziano per quelle arrivate all'orario (o al rimando);
 * 3. dopo un'ora senza "Fatto" segna NON_CONFERMATO e avvisa i familiari.
 * "adesso" si può passare a mano: i test lo usano per far passare il tempo.
 */
export function creaPianificatore(db: Database, avvisi: Avvisi) {
  return {
    async giro(adesso: Date = new Date()): Promise<void> {
      const fuso = config.fusoOrario

      // 1. Le occorrenze di oggi. Un orario già passato prima che il promemoria venisse
      //    creato o modificato non conta (niente avvisi per le 8:00 se lo imposti alle 14:00).
      await db.query(
        `INSERT INTO occorrenza (promemoria_id, previsto_il, avvisare_il)
         SELECT p.id, t.previsto, t.previsto
         FROM promemoria p
         CROSS JOIN LATERAL (SELECT ((($1::timestamptz AT TIME ZONE $2)::date + p.ora) AT TIME ZONE $2) AS previsto) t
         WHERE p.attivo AND t.previsto > p.modificato_il
         ON CONFLICT (promemoria_id, previsto_il) DO NOTHING`,
        [adesso, fuso],
      )

      // 2. Notifiche all'anziano.
      const daAvvisare = await db.query<{ id: number; anzianoId: number; momento: Momento; ora: string; rimandi: number }>(
        `UPDATE occorrenza o SET avvisare_il = NULL
         FROM promemoria p
         WHERE p.id = o.promemoria_id AND o.stato = 'IN_ATTESA' AND o.avvisare_il <= $1
         RETURNING o.id, p.anziano_id AS "anzianoId", p.momento, to_char(o.previsto_il AT TIME ZONE $2, 'HH24:MI') AS ora, o.rimandi`,
        [adesso, fuso],
      )
      for (const o of daAvvisare) {
        avvisi.anziano(o.anzianoId, {
          titolo: `È ora: ${TITOLO_MOMENTO[o.momento]}`,
          testo: o.rimandi ? 'Te lo ricordo di nuovo. Tocca qui e poi “Fatto”.' : 'Tocca qui e poi “Fatto” quando le hai prese.',
          url: '/senior',
          tag: `medicine-${o.id}`,
          insistente: true,
        })
      }

      // 3. Un'ora senza risposta: avvisiamo la famiglia.
      const senzaRisposta = await db.query<{ id: number; anzianoId: number; nome: string; momento: Momento; ora: string }>(
        `UPDATE occorrenza o SET stato = 'NON_CONFERMATO', avvisare_il = NULL, famiglia_avvisata_il = $1
         FROM promemoria p, anziano a
         WHERE p.id = o.promemoria_id AND a.id = p.anziano_id
           AND o.stato = 'IN_ATTESA' AND o.previsto_il + make_interval(mins => $3) <= $1
         RETURNING o.id, a.id AS "anzianoId", a.nome, p.momento, to_char(o.previsto_il AT TIME ZONE $2, 'HH24:MI') AS ora`,
        [adesso, fuso, MINUTI_PRIMA_DI_AVVISARE_LA_FAMIGLIA],
      )
      for (const o of senzaRisposta) {
        avvisi.familiari(
          o.anzianoId,
          `${o.nome} non ha confermato ${NOME_MOMENTO[o.momento]}`,
          [`Il promemoria delle ${o.ora} è passato da un’ora senza “Fatto”.`, 'Forse vale la pena fare una telefonata.'],
          `/anziano/${o.anzianoId}/medicine`,
          `medicine-${o.id}`,
        )
      }
    },
  }
}

export type Pianificatore = ReturnType<typeof creaPianificatore>
