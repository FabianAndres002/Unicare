// Le badanti si propongono, le famiglie le cercano e le contattano.
//
// - La badante compila il suo profilo professionale (zona, esperienza, servizi, disponibilità)
//   e accende "Mi propongo": da quel momento le famiglie la trovano.
// - Un familiare cerca per provincia, servizio e disponibilità, apre il profilo e scrive.
//   Si parla dentro Unicare: email e telefono NON si vedono. Ognuno decide se e quando dare
//   il proprio numero (doppio consenso).
// - La badante può chiudere una conversazione: quella famiglia non può più scriverle.
// - Dalla conversazione l'amministratore di un cerchio può invitarla nel cerchio.
//
// Anti-spam: una famiglia può aprire al massimo 10 nuove conversazioni al giorno.

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { testoFacoltativo } from '../comune/validazione.ts'
import type { Avvisi } from '../notifiche/avvisi.ts'
import type { ServizioInviti } from '../cerchio/inviti.service.ts'

export const SERVIZI = ['COMPAGNIA', 'IGIENE', 'PASTI', 'PULIZIE', 'SPESA', 'ACCOMPAGNAMENTO', 'FARMACI', 'NOTTE'] as const
export const DISPONIBILITA = ['CONVIVENTE', 'A_ORE', 'NOTTE', 'WEEKEND'] as const
const NUOVI_CONTATTI_AL_GIORNO = 10

export const schemaProfiloBadante = z.object({
  presentazione: z.string().trim().max(1500).default(''),
  provincia: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'sigla della provincia (es. CE)'),
  comune: z.string().trim().min(2).max(80),
  zone: testoFacoltativo(200),
  anniEsperienza: z.number().int().min(0).max(60),
  lingue: testoFacoltativo(200),
  servizi: z.array(z.enum(SERVIZI)).max(SERVIZI.length).transform((v) => [...new Set(v)]),
  disponibilita: z.array(z.enum(DISPONIBILITA)).max(DISPONIBILITA.length).transform((v) => [...new Set(v)]),
  tariffaOrariaCentesimi: z.number().int().min(0).max(100_000).nullable(),
  automunita: z.boolean(),
  visibile: z.boolean(),
})

export const schemaRicerca = z.object({
  provincia: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  servizio: z.enum(SERVIZI).optional(),
  disponibilita: z.enum(DISPONIBILITA).optional(),
})

export const schemaMessaggio = z.object({ testo: z.string().trim().min(1, 'Scrivi un messaggio.').max(2000) })
export const schemaInvitaDaContatto = z.object({ cerchioId: z.number().int().positive() })

export type ProfiloBadante = z.infer<typeof schemaProfiloBadante> & { aggiornatoIl: string }

/** Come la vede una famiglia: nome e iniziale del cognome, niente email. */
export type SchedaBadante = Omit<ProfiloBadante, 'visibile'> & {
  id: number
  nome: string
  /** L'iniziale del cognome: "R." */
  cognome: string
  /** La conversazione già aperta con lei, se c'è. */
  contattoId: number | null
}

export type Conversazione = {
  id: number
  altro: { id: number; nome: string; cognome: string; tipo: 'FAMILIARE' | 'BADANTE' }
  ultimoTesto: string | null
  ultimoIl: string
  nonLetti: number
  bloccato: boolean
}

export type Messaggio = { id: number; mio: boolean; autore: string; testo: string; creatoIl: string; lettoIl: string | null }

const ISO = (colonna: string) => `to_char(${colonna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

const CAMPI_PROFILO = `
  p.presentazione, p.provincia, p.comune, p.zone, p.anni_esperienza AS "anniEsperienza", p.lingue,
  p.servizi, p.disponibilita, p.tariffa_oraria_centesimi AS "tariffaOrariaCentesimi", p.automunita,
  ${ISO('p.aggiornato_il')} AS "aggiornatoIl"`

export function creaServizioBadanti(db: Database, avvisi: Avvisi, inviti: ServizioInviti) {
  async function tipoDi(utenteId: number): Promise<{ tipo: 'FAMILIARE' | 'BADANTE'; nome: string; email: string }> {
    const [u] = await db.query<{ tipo: 'FAMILIARE' | 'BADANTE'; nome: string; email: string }>('SELECT tipo, nome, email FROM utente WHERE id = $1', [utenteId])
    if (!u) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    return u
  }

  async function soloBadante(utenteId: number) {
    const u = await tipoDi(utenteId)
    if (u.tipo !== 'BADANTE') throw new ErroreApplicativo(403, 'SOLO_BADANTI', 'Questa sezione è per le badanti.')
    return u
  }

  async function soloFamiliare(utenteId: number) {
    const u = await tipoDi(utenteId)
    if (u.tipo !== 'FAMILIARE') throw new ErroreApplicativo(403, 'SOLO_FAMILIARI', 'Questa sezione è per le famiglie.')
    return u
  }

  /** La conversazione, solo se l'utente ne fa parte. */
  async function contattoPer(contattoId: number, utenteId: number) {
    const [c] = await db.query<{ id: number; badanteId: number; familiareId: number; bloccato: boolean }>(
      `SELECT id, badante_id AS "badanteId", familiare_id AS "familiareId", bloccato_il IS NOT NULL AS bloccato
       FROM contatto WHERE id = $1 AND (badante_id = $2 OR familiare_id = $2)`,
      [contattoId, utenteId],
    )
    if (!c) throw new ErroreApplicativo(404, 'CONVERSAZIONE_NON_TROVATA', 'Conversazione non trovata.')
    return c
  }

  async function aggiungiMessaggio(contattoId: number, autoreId: number, destinatarioId: number, testo: string) {
    await db.query('INSERT INTO messaggio_contatto (contatto_id, autore_id, testo) VALUES ($1, $2, $3)', [contattoId, autoreId, testo])
    await db.query('UPDATE contatto SET ultimo_messaggio_il = now() WHERE id = $1', [contattoId])
    const [autore] = await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [autoreId])
    avvisi.utente(
      destinatarioId,
      `Nuovo messaggio da ${autore!.nome}`,
      [testo.length > 140 ? `${testo.slice(0, 140)}…` : testo],
      `/contatti/${contattoId}`,
      `contatto-${contattoId}`,
    )
  }

  return {
    // ---- Lato badante ----

    async mioProfilo(utenteId: number): Promise<{ profilo: ProfiloBadante & { visibile: boolean } | null; nome: string; cognome: string }> {
      await soloBadante(utenteId)
      const [io] = await db.query<{ nome: string; cognome: string }>(`SELECT nome, left(cognome, 1) || '.' AS cognome FROM utente WHERE id = $1`, [utenteId])
      const [p] = await db.query<ProfiloBadante & { visibile: boolean }>(
        `SELECT ${CAMPI_PROFILO}, p.visibile FROM profilo_badante p WHERE p.utente_id = $1`,
        [utenteId],
      )
      return { profilo: p ?? null, nome: io!.nome, cognome: io!.cognome }
    },

    async salvaProfilo(utenteId: number, d: z.infer<typeof schemaProfiloBadante>): Promise<void> {
      await soloBadante(utenteId)
      if (d.visibile && d.presentazione.length < 30) {
        throw new ErroreApplicativo(400, 'PRESENTAZIONE_CORTA', 'Per proporti scrivi almeno due righe su di te (30 caratteri).')
      }
      await db.query(
        `INSERT INTO profilo_badante (utente_id, presentazione, provincia, comune, zone, anni_esperienza, lingue, servizi, disponibilita,
                                      tariffa_oraria_centesimi, automunita, visibile)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (utente_id) DO UPDATE SET
           presentazione = EXCLUDED.presentazione, provincia = EXCLUDED.provincia, comune = EXCLUDED.comune, zone = EXCLUDED.zone,
           anni_esperienza = EXCLUDED.anni_esperienza, lingue = EXCLUDED.lingue, servizi = EXCLUDED.servizi,
           disponibilita = EXCLUDED.disponibilita, tariffa_oraria_centesimi = EXCLUDED.tariffa_oraria_centesimi,
           automunita = EXCLUDED.automunita, visibile = EXCLUDED.visibile, aggiornato_il = now()`,
        [utenteId, d.presentazione, d.provincia, d.comune, d.zone, d.anniEsperienza, d.lingue, d.servizi, d.disponibilita,
          d.tariffaOrariaCentesimi, d.automunita, d.visibile],
      )
    },

    // ---- Lato famiglia ----

    async cerca(utenteId: number, filtri: z.infer<typeof schemaRicerca>): Promise<SchedaBadante[]> {
      await soloFamiliare(utenteId)
      return db.query<SchedaBadante>(
        `SELECT u.id, u.nome, left(u.cognome, 1) || '.' AS cognome, ${CAMPI_PROFILO}, c.id AS "contattoId"
         FROM profilo_badante p JOIN utente u ON u.id = p.utente_id
         LEFT JOIN contatto c ON c.badante_id = u.id AND c.familiare_id = $1
         WHERE p.visibile
           AND ($2::text IS NULL OR p.provincia = $2)
           AND ($3::text IS NULL OR $3 = ANY(p.servizi))
           AND ($4::text IS NULL OR $4 = ANY(p.disponibilita))
         ORDER BY p.aggiornato_il DESC
         LIMIT 100`,
        [utenteId, filtri.provincia ?? null, filtri.servizio ?? null, filtri.disponibilita ?? null],
      )
    },

    async scheda(badanteId: number, utenteId: number): Promise<SchedaBadante> {
      await soloFamiliare(utenteId)
      const [s] = await db.query<SchedaBadante>(
        `SELECT u.id, u.nome, left(u.cognome, 1) || '.' AS cognome, ${CAMPI_PROFILO}, c.id AS "contattoId"
         FROM profilo_badante p JOIN utente u ON u.id = p.utente_id
         LEFT JOIN contatto c ON c.badante_id = u.id AND c.familiare_id = $2
         WHERE u.id = $1 AND (p.visibile OR c.id IS NOT NULL)`,
        [badanteId, utenteId],
      )
      if (!s) throw new ErroreApplicativo(404, 'BADANTE_NON_TROVATA', 'Profilo non trovato o non più visibile.')
      return s
    },

    /** Il primo messaggio di una famiglia a una badante: apre la conversazione. */
    async scrivi(badanteId: number, utenteId: number, testo: string): Promise<{ contattoId: number }> {
      await soloFamiliare(utenteId)
      const [esistente] = await db.query<{ id: number }>('SELECT id FROM contatto WHERE badante_id = $1 AND familiare_id = $2', [badanteId, utenteId])
      if (esistente) {
        await this.rispondi(esistente.id, utenteId, testo)
        return { contattoId: esistente.id }
      }
      const [visibile] = await db.query('SELECT 1 FROM profilo_badante WHERE utente_id = $1 AND visibile', [badanteId])
      if (!visibile) throw new ErroreApplicativo(404, 'BADANTE_NON_TROVATA', 'Profilo non trovato o non più visibile.')
      const [{ oggi }] = (await db.query<{ oggi: number }>(
        `SELECT count(*)::int AS oggi FROM contatto WHERE familiare_id = $1 AND creato_il > now() - interval '1 day'`,
        [utenteId],
      )) as [{ oggi: number }]
      if (oggi >= NUOVI_CONTATTI_AL_GIORNO) {
        throw new ErroreApplicativo(429, 'TROPPI_CONTATTI', 'Hai già scritto a molte badanti oggi. Riprova domani.')
      }
      const [c] = await db.query<{ id: number }>('INSERT INTO contatto (badante_id, familiare_id) VALUES ($1, $2) RETURNING id', [badanteId, utenteId])
      await aggiungiMessaggio(c!.id, utenteId, badanteId, testo)
      return { contattoId: c!.id }
    },

    // ---- Per tutti e due ----

    async conversazioni(utenteId: number): Promise<Conversazione[]> {
      return db.query<Conversazione>(
        `SELECT c.id,
                json_build_object('id', o.id, 'nome', o.nome, 'cognome', left(o.cognome, 1) || '.', 'tipo', o.tipo) AS altro,
                (SELECT testo FROM messaggio_contatto WHERE contatto_id = c.id ORDER BY creato_il DESC, id DESC LIMIT 1) AS "ultimoTesto",
                ${ISO('c.ultimo_messaggio_il')} AS "ultimoIl",
                (SELECT count(*)::int FROM messaggio_contatto WHERE contatto_id = c.id AND autore_id <> $1 AND letto_il IS NULL) AS "nonLetti",
                c.bloccato_il IS NOT NULL AS bloccato
         FROM contatto c JOIN utente o ON o.id = CASE WHEN c.badante_id = $1 THEN c.familiare_id ELSE c.badante_id END
         WHERE c.badante_id = $1 OR c.familiare_id = $1
         ORDER BY c.ultimo_messaggio_il DESC`,
        [utenteId],
      )
    },

    /** I messaggi; quelli dell'altro diventano "letti". */
    async messaggi(contattoId: number, utenteId: number): Promise<{ conversazione: Conversazione; messaggi: Messaggio[]; puoInvitare: { id: number; nome: string }[] }> {
      const c = await contattoPer(contattoId, utenteId)
      await db.query('UPDATE messaggio_contatto SET letto_il = now() WHERE contatto_id = $1 AND autore_id <> $2 AND letto_il IS NULL', [contattoId, utenteId])
      const messaggi = await db.query<Messaggio>(
        `SELECT m.id, m.autore_id = $2 AS mio, u.nome AS autore, m.testo, ${ISO('m.creato_il')} AS "creatoIl", ${ISO('m.letto_il')} AS "lettoIl"
         FROM messaggio_contatto m JOIN utente u ON u.id = m.autore_id
         WHERE m.contatto_id = $1 ORDER BY m.creato_il, m.id`,
        [contattoId, utenteId],
      )
      const conversazione = (await this.conversazioni(utenteId)).find((x) => x.id === contattoId)!
      // La famiglia può invitarla nei cerchi che amministra (dove non c'è già).
      const puoInvitare = c.familiareId === utenteId
        ? await db.query<{ id: number; nome: string }>(
          `SELECT ce.id, ce.nome FROM membro_cerchio m JOIN cerchio ce ON ce.id = m.cerchio_id
           WHERE m.utente_id = $1 AND m.ruolo = 'ADMIN'
             AND NOT EXISTS (SELECT 1 FROM membro_cerchio x WHERE x.cerchio_id = ce.id AND x.utente_id = $2)
           ORDER BY ce.nome`,
          [utenteId, c.badanteId],
        )
        : []
      return { conversazione, messaggi, puoInvitare }
    },

    async rispondi(contattoId: number, utenteId: number, testo: string): Promise<void> {
      const c = await contattoPer(contattoId, utenteId)
      if (c.bloccato) throw new ErroreApplicativo(403, 'CONVERSAZIONE_CHIUSA', 'Questa conversazione è stata chiusa.')
      await aggiungiMessaggio(contattoId, utenteId, c.badanteId === utenteId ? c.familiareId : c.badanteId, testo)
    },

    /** Solo la badante: chiude (o riapre) la conversazione. */
    async blocca(contattoId: number, utenteId: number, chiudi: boolean): Promise<void> {
      const c = await contattoPer(contattoId, utenteId)
      if (c.badanteId !== utenteId) throw new ErroreApplicativo(403, 'PERMESSO_NEGATO', 'Solo la badante può chiudere la conversazione.')
      await db.query(`UPDATE contatto SET bloccato_il = CASE WHEN $2 THEN now() END WHERE id = $1`, [contattoId, chiudi])
    },

    /** Dalla conversazione: l'amministratore invita la badante nel suo cerchio. Il link arriva nella chat. */
    async invita(contattoId: number, utenteId: number, cerchioId: number): Promise<void> {
      const c = await contattoPer(contattoId, utenteId)
      if (c.familiareId !== utenteId) throw new ErroreApplicativo(403, 'PERMESSO_NEGATO', 'Solo la famiglia può invitare.')
      if (c.bloccato) throw new ErroreApplicativo(403, 'CONVERSAZIONE_CHIUSA', 'Questa conversazione è stata chiusa.')
      const badante = await tipoDi(c.badanteId)
      const { token } = await inviti.crea(cerchioId, utenteId, { email: badante.email, ruolo: 'BADANTE' })
      const [cerchio] = await db.query<{ nome: string }>('SELECT nome FROM cerchio WHERE id = $1', [cerchioId])
      await aggiungiMessaggio(
        contattoId,
        utenteId,
        c.badanteId,
        `Ti invito nel cerchio “${cerchio!.nome}” su Unicare, per organizzarci insieme. Entra da qui: ${config.urlApp}/invito/${token}`,
      )
    },
  }
}

export type ServizioBadanti = ReturnType<typeof creaServizioBadanti>
