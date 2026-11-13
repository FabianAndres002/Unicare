// "Cerco una badante": la famiglia scrive cosa le serve, le badanti si propongono,
// la famiglia sceglie.
//
// - Un familiare (o l'amministratore) del cerchio pubblica una ricerca: comune, orari, servizi,
//   due righe di descrizione. Le badanti di quella provincia che si propongono ricevono un avviso.
// - Le badanti vedono le ricerche aperte SENZA nomi: niente nome della famiglia, niente nome
//   dell'anziano. Si propongono con un breve messaggio (serve il profilo da badante).
// - La famiglia vede le proposte con il profilo di ognuna e decide:
//     "Scrivile"   si apre la conversazione (la proposta diventa il primo messaggio)
//     "No, grazie" la badante riceve un avviso gentile
// - Quando la famiglia chiude la ricerca, le proposte in attesa diventano "non scelte".
//
// Anti-spam: al massimo 3 ricerche aperte per cerchio, 20 proposte al giorno per badante.

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { testoFacoltativo } from '../comune/validazione.ts'
import { PUO_MODIFICARE_ANZIANO, richiediRuolo } from '../cerchio/permessi.ts'
import type { Avvisi } from '../notifiche/avvisi.ts'
import { DISPONIBILITA, SERVIZI } from './badanti.service.ts'

const RICERCHE_APERTE_PER_CERCHIO = 3
const PROPOSTE_AL_GIORNO = 20
const BADANTI_AVVISATE = 100

export const schemaNuovaRicerca = z.object({
  provincia: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, 'sigla della provincia (es. CE)'),
  comune: z.string().trim().min(2, 'Scrivi il comune.').max(80),
  descrizione: z.string().trim().min(20, 'Racconta in due righe di cosa avete bisogno (almeno 20 caratteri).').max(1000),
  orario: testoFacoltativo(120),
  servizi: z.array(z.enum(SERVIZI)).max(SERVIZI.length).transform((v) => [...new Set(v)]),
  disponibilita: z.array(z.enum(DISPONIBILITA)).max(DISPONIBILITA.length).transform((v) => [...new Set(v)]),
})

export const schemaProposta = z.object({
  messaggio: z.string().trim().min(20, 'Scrivi due righe alla famiglia (almeno 20 caratteri).').max(1000),
})

export const schemaScegli = z.object({ testo: z.string().trim().min(1, 'Scrivi un messaggio.').max(2000) })

export type StatoProposta = 'INVIATA' | 'SCELTA' | 'NON_SCELTA' | 'RITIRATA'

/** Quello che vedono le badanti: nessun nome. */
export type RicercaPubblica = {
  id: number
  provincia: string
  comune: string
  descrizione: string
  orario: string | null
  servizi: string[]
  disponibilita: string[]
  creataIl: string
  chiusa: boolean
  /** La mia proposta, se mi sono già proposta. */
  miaProposta: { id: number; stato: StatoProposta; messaggio: string } | null
}

/** Quello che vede la famiglia nella lista. */
export type RicercaFamiglia = Omit<RicercaPubblica, 'miaProposta'> & {
  creataDa: string | null
  /** Proposte in attesa di una risposta. */
  nuove: number
  /** Tutte le proposte (tranne quelle ritirate). */
  proposte: number
}

export type PropostaPerFamiglia = {
  id: number
  messaggio: string
  stato: StatoProposta
  creataIl: string
  contattoId: number | null
  badante: {
    id: number
    nome: string
    cognome: string
    presentazione: string
    comune: string
    provincia: string
    zone: string | null
    anniEsperienza: number
    lingue: string | null
    servizi: string[]
    disponibilita: string[]
    tariffaOrariaCentesimi: number | null
    automunita: boolean
  }
}

export type MiaProposta = {
  id: number
  messaggio: string
  stato: StatoProposta
  creataIl: string
  contattoId: number | null
  ricerca: Omit<RicercaPubblica, 'miaProposta'>
}

const ISO = (colonna: string) => `to_char(${colonna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

const CAMPI_RICERCA = `
  r.id, r.provincia, r.comune, r.descrizione, r.orario, r.servizi, r.disponibilita,
  ${ISO('r.creata_il')} AS "creataIl", r.chiusa_il IS NOT NULL AS chiusa`

const breve = (t: string, n = 140) => (t.length > n ? `${t.slice(0, n)}…` : t)

export function creaServizioRicerche(db: Database, avvisi: Avvisi) {
  async function tipoDi(utenteId: number): Promise<'FAMILIARE' | 'BADANTE'> {
    const [u] = await db.query<{ tipo: 'FAMILIARE' | 'BADANTE' }>('SELECT tipo FROM utente WHERE id = $1', [utenteId])
    if (!u) throw new ErroreApplicativo(401, 'NON_AUTENTICATO', 'Devi accedere per continuare.')
    return u.tipo
  }

  async function soloBadante(utenteId: number) {
    if ((await tipoDi(utenteId)) !== 'BADANTE') throw new ErroreApplicativo(403, 'SOLO_BADANTI', 'Questa sezione è per le badanti.')
  }

  const ricercaNonTrovata = () => new ErroreApplicativo(404, 'RICERCA_NON_TROVATA', 'Ricerca non trovata.')

  /** La ricerca, solo se l'utente è familiare o amministratore del suo cerchio. */
  async function ricercaPerFamiglia(ricercaId: number, utenteId: number) {
    const [r] = await db.query<{ id: number; cerchioId: number; comune: string; chiusa: boolean }>(
      `SELECT id, cerchio_id AS "cerchioId", comune, chiusa_il IS NOT NULL AS chiusa FROM ricerca_badante WHERE id = $1`,
      [ricercaId],
    )
    if (!r) throw ricercaNonTrovata()
    await richiediRuolo(db, r.cerchioId, utenteId, PUO_MODIFICARE_ANZIANO).catch((e) => {
      throw e instanceof ErroreApplicativo && e.stato === 404 ? ricercaNonTrovata() : e
    })
    return r
  }

  /** La proposta, solo se l'utente può gestire la ricerca a cui appartiene. */
  async function propostaPerFamiglia(propostaId: number, utenteId: number) {
    const [p] = await db.query<{ id: number; ricercaId: number; badanteId: number; messaggio: string; stato: StatoProposta; contattoId: number | null }>(
      `SELECT id, ricerca_id AS "ricercaId", badante_id AS "badanteId", messaggio, stato, contatto_id AS "contattoId" FROM proposta WHERE id = $1`,
      [propostaId],
    )
    if (!p) throw new ErroreApplicativo(404, 'PROPOSTA_NON_TROVATA', 'Proposta non trovata.')
    const r = await ricercaPerFamiglia(p.ricercaId, utenteId).catch((e) => {
      throw e instanceof ErroreApplicativo && e.stato === 404 ? new ErroreApplicativo(404, 'PROPOSTA_NON_TROVATA', 'Proposta non trovata.') : e
    })
    return { ...p, ricerca: r }
  }

  async function messaggioInChat(contattoId: number, autoreId: number, testo: string) {
    await db.query('INSERT INTO messaggio_contatto (contatto_id, autore_id, testo) VALUES ($1, $2, $3)', [contattoId, autoreId, testo])
    await db.query('UPDATE contatto SET ultimo_messaggio_il = now() WHERE id = $1', [contattoId])
  }

  return {
    // ---- Lato famiglia ----

    async pubblica(cerchioId: number, utenteId: number, d: z.infer<typeof schemaNuovaRicerca>): Promise<{ id: number }> {
      await richiediRuolo(db, cerchioId, utenteId, PUO_MODIFICARE_ANZIANO)
      const [{ aperte }] = (await db.query<{ aperte: number }>(
        'SELECT count(*)::int AS aperte FROM ricerca_badante WHERE cerchio_id = $1 AND chiusa_il IS NULL',
        [cerchioId],
      )) as [{ aperte: number }]
      if (aperte >= RICERCHE_APERTE_PER_CERCHIO) {
        throw new ErroreApplicativo(429, 'TROPPE_RICERCHE', 'Avete già 3 ricerche aperte. Chiudetene una prima di pubblicarne un’altra.')
      }
      const [r] = await db.query<{ id: number }>(
        `INSERT INTO ricerca_badante (cerchio_id, creata_da, provincia, comune, descrizione, orario, servizi, disponibilita)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [cerchioId, utenteId, d.provincia, d.comune, d.descrizione, d.orario, d.servizi, d.disponibilita],
      )
      // Avvisiamo le badanti della provincia che si propongono.
      const badanti = await db.query<{ id: number }>(
        'SELECT utente_id AS id FROM profilo_badante WHERE visibile AND provincia = $1 ORDER BY aggiornato_il DESC LIMIT $2',
        [d.provincia, BADANTI_AVVISATE],
      )
      for (const b of badanti) {
        avvisi.utente(b.id, `Una famiglia cerca una badante a ${d.comune}`, [breve(d.descrizione)], `/lavoro/ricerche/${r!.id}`, `ricerca-${r!.id}`)
      }
      return { id: r!.id }
    },

    async ricercheDelCerchio(cerchioId: number, utenteId: number): Promise<RicercaFamiglia[]> {
      await richiediRuolo(db, cerchioId, utenteId, PUO_MODIFICARE_ANZIANO)
      return db.query<RicercaFamiglia>(
        `SELECT ${CAMPI_RICERCA}, u.nome AS "creataDa",
                (SELECT count(*)::int FROM proposta p WHERE p.ricerca_id = r.id AND p.stato = 'INVIATA') AS nuove,
                (SELECT count(*)::int FROM proposta p WHERE p.ricerca_id = r.id AND p.stato <> 'RITIRATA') AS proposte
         FROM ricerca_badante r LEFT JOIN utente u ON u.id = r.creata_da
         WHERE r.cerchio_id = $1
         ORDER BY r.chiusa_il IS NOT NULL, r.creata_il DESC`,
        [cerchioId],
      )
    },

    async dettaglioPerFamiglia(ricercaId: number, utenteId: number): Promise<{ ricerca: RicercaFamiglia; proposte: PropostaPerFamiglia[] }> {
      await ricercaPerFamiglia(ricercaId, utenteId)
      const [ricerca] = await db.query<RicercaFamiglia>(
        `SELECT ${CAMPI_RICERCA}, u.nome AS "creataDa",
                (SELECT count(*)::int FROM proposta p WHERE p.ricerca_id = r.id AND p.stato = 'INVIATA') AS nuove,
                (SELECT count(*)::int FROM proposta p WHERE p.ricerca_id = r.id AND p.stato <> 'RITIRATA') AS proposte
         FROM ricerca_badante r LEFT JOIN utente u ON u.id = r.creata_da WHERE r.id = $1`,
        [ricercaId],
      )
      // Il profilo di chi si propone si vede anche se non ha acceso "Mi propongo": si è proposta lei.
      const proposte = await db.query<PropostaPerFamiglia>(
        `SELECT p.id, p.messaggio, p.stato, ${ISO('p.creata_il')} AS "creataIl", p.contatto_id AS "contattoId",
                json_build_object(
                  'id', u.id, 'nome', u.nome, 'cognome', left(u.cognome, 1) || '.',
                  'presentazione', pb.presentazione, 'comune', pb.comune, 'provincia', pb.provincia, 'zone', pb.zone,
                  'anniEsperienza', pb.anni_esperienza, 'lingue', pb.lingue, 'servizi', pb.servizi, 'disponibilita', pb.disponibilita,
                  'tariffaOrariaCentesimi', pb.tariffa_oraria_centesimi, 'automunita', pb.automunita
                ) AS badante
         FROM proposta p JOIN utente u ON u.id = p.badante_id JOIN profilo_badante pb ON pb.utente_id = u.id
         WHERE p.ricerca_id = $1 AND p.stato <> 'RITIRATA'
         ORDER BY p.stato = 'NON_SCELTA', p.creata_il`,
        [ricercaId],
      )
      return { ricerca: ricerca!, proposte }
    },

    /** "Scrivile": si apre (o riprende) la conversazione con lei. */
    async scegli(propostaId: number, utenteId: number, testo: string): Promise<{ contattoId: number }> {
      const p = await propostaPerFamiglia(propostaId, utenteId)
      if (p.stato === 'RITIRATA') throw new ErroreApplicativo(409, 'PROPOSTA_RITIRATA', 'La badante ha ritirato la proposta.')
      const [esistente] = await db.query<{ id: number; bloccato: boolean }>(
        'SELECT id, bloccato_il IS NOT NULL AS bloccato FROM contatto WHERE badante_id = $1 AND familiare_id = $2',
        [p.badanteId, utenteId],
      )
      if (esistente?.bloccato) throw new ErroreApplicativo(403, 'CONVERSAZIONE_CHIUSA', 'Questa conversazione è stata chiusa.')
      const contattoId = esistente
        ? esistente.id
        : (await db.query<{ id: number }>('INSERT INTO contatto (badante_id, familiare_id) VALUES ($1, $2) RETURNING id', [p.badanteId, utenteId]))[0]!.id
      // La sua proposta diventa il primo messaggio, così la conversazione parte da lì.
      if (p.stato === 'INVIATA') {
        await messaggioInChat(contattoId, p.badanteId, `La mia proposta per ${p.ricerca.comune}: ${p.messaggio}`)
      }
      await messaggioInChat(contattoId, utenteId, testo)
      await db.query(`UPDATE proposta SET stato = 'SCELTA', contatto_id = $2 WHERE id = $1`, [propostaId, contattoId])
      const [io] = await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [utenteId])
      avvisi.utente(
        p.badanteId,
        `${io!.nome} ha risposto alla tua proposta`,
        [breve(testo)],
        `/contatti/${contattoId}`,
        `contatto-${contattoId}`,
      )
      return { contattoId }
    },

    /** "No, grazie". */
    async rifiuta(propostaId: number, utenteId: number): Promise<void> {
      const p = await propostaPerFamiglia(propostaId, utenteId)
      if (p.stato !== 'INVIATA') return
      await db.query(`UPDATE proposta SET stato = 'NON_SCELTA' WHERE id = $1`, [propostaId])
      avvisi.utente(
        p.badanteId,
        `La famiglia di ${p.ricerca.comune} ha scelto un’altra persona`,
        ['Grazie per la tua proposta. Nella sezione Lavoro trovi altre famiglie che cercano.'],
        '/lavoro',
        `proposta-${propostaId}`,
      )
    },

    /** La famiglia ha trovato (o non cerca più): le proposte in attesa diventano "non scelte". */
    async chiudi(ricercaId: number, utenteId: number): Promise<void> {
      const r = await ricercaPerFamiglia(ricercaId, utenteId)
      if (r.chiusa) return
      await db.query('UPDATE ricerca_badante SET chiusa_il = now() WHERE id = $1', [ricercaId])
      const inAttesa = await db.query<{ id: number; badanteId: number }>(
        `UPDATE proposta SET stato = 'NON_SCELTA' WHERE ricerca_id = $1 AND stato = 'INVIATA' RETURNING id, badante_id AS "badanteId"`,
        [ricercaId],
      )
      for (const p of inAttesa) {
        avvisi.utente(
          p.badanteId,
          `La famiglia di ${r.comune} non cerca più`,
          ['Grazie per la tua proposta. Nella sezione Lavoro trovi altre famiglie che cercano.'],
          '/lavoro',
          `proposta-${p.id}`,
        )
      }
    },

    // ---- Lato badante ----

    /** Le ricerche aperte (della provincia scelta, o della mia). Nessun nome. */
    async aperte(utenteId: number, provincia?: string): Promise<{ provincia: string | null; ricerche: RicercaPubblica[] }> {
      await soloBadante(utenteId)
      let prov = provincia ?? null
      if (!prov) {
        const [p] = await db.query<{ provincia: string }>('SELECT provincia FROM profilo_badante WHERE utente_id = $1', [utenteId])
        prov = p?.provincia ?? null
      }
      const ricerche = await db.query<RicercaPubblica>(
        `SELECT ${CAMPI_RICERCA},
                (SELECT json_build_object('id', p.id, 'stato', p.stato, 'messaggio', p.messaggio)
                 FROM proposta p WHERE p.ricerca_id = r.id AND p.badante_id = $1) AS "miaProposta"
         FROM ricerca_badante r
         WHERE r.chiusa_il IS NULL AND ($2::text IS NULL OR r.provincia = $2)
         ORDER BY r.creata_il DESC
         LIMIT 100`,
        [utenteId, prov],
      )
      return { provincia: prov, ricerche }
    },

    async ricercaPerBadante(ricercaId: number, utenteId: number): Promise<RicercaPubblica> {
      await soloBadante(utenteId)
      const [r] = await db.query<RicercaPubblica>(
        `SELECT ${CAMPI_RICERCA},
                (SELECT json_build_object('id', p.id, 'stato', p.stato, 'messaggio', p.messaggio)
                 FROM proposta p WHERE p.ricerca_id = r.id AND p.badante_id = $2) AS "miaProposta"
         FROM ricerca_badante r
         WHERE r.id = $1 AND (r.chiusa_il IS NULL OR EXISTS (SELECT 1 FROM proposta p WHERE p.ricerca_id = r.id AND p.badante_id = $2))`,
        [ricercaId, utenteId],
      )
      if (!r) throw ricercaNonTrovata()
      return r
    },

    async proponiti(ricercaId: number, utenteId: number, messaggio: string): Promise<{ id: number }> {
      await soloBadante(utenteId)
      const [profilo] = await db.query('SELECT 1 FROM profilo_badante WHERE utente_id = $1', [utenteId])
      if (!profilo) throw new ErroreApplicativo(400, 'PROFILO_MANCANTE', 'Prima compila il tuo profilo: la famiglia lo vedrà insieme alla proposta.')
      const [r] = await db.query<{ id: number; cerchioId: number; creataDa: number | null; comune: string }>(
        `SELECT id, cerchio_id AS "cerchioId", creata_da AS "creataDa", comune FROM ricerca_badante WHERE id = $1 AND chiusa_il IS NULL`,
        [ricercaId],
      )
      if (!r) throw new ErroreApplicativo(404, 'RICERCA_NON_TROVATA', 'Questa famiglia non cerca più.')
      const [gia] = await db.query<{ id: number; stato: StatoProposta }>('SELECT id, stato FROM proposta WHERE ricerca_id = $1 AND badante_id = $2', [ricercaId, utenteId])
      if (gia && gia.stato !== 'RITIRATA') throw new ErroreApplicativo(409, 'GIA_PROPOSTA', 'Hai già inviato una proposta per questa ricerca.')
      const [{ oggi }] = (await db.query<{ oggi: number }>(
        `SELECT count(*)::int AS oggi FROM proposta WHERE badante_id = $1 AND creata_il > now() - interval '1 day'`,
        [utenteId],
      )) as [{ oggi: number }]
      if (oggi >= PROPOSTE_AL_GIORNO) throw new ErroreApplicativo(429, 'TROPPE_PROPOSTE', 'Oggi hai già inviato molte proposte. Riprova domani.')

      const [p] = gia
        ? await db.query<{ id: number }>(`UPDATE proposta SET stato = 'INVIATA', messaggio = $2, creata_il = now() WHERE id = $1 RETURNING id`, [gia.id, messaggio])
        : await db.query<{ id: number }>('INSERT INTO proposta (ricerca_id, badante_id, messaggio) VALUES ($1, $2, $3) RETURNING id', [ricercaId, utenteId, messaggio])

      // Avvisiamo la famiglia: chi ha pubblicato, o tutti i familiari se non c'è più.
      const [io] = await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [utenteId])
      const destinatari = r.creataDa
        ? [r.creataDa]
        : (await db.query<{ id: number }>(`SELECT utente_id AS id FROM membro_cerchio WHERE cerchio_id = $1 AND ruolo IN ('ADMIN', 'FAMILIARE')`, [r.cerchioId])).map((x) => x.id)
      for (const id of destinatari) {
        avvisi.utente(id, `${io!.nome} si propone come badante`, [breve(messaggio)], `/cerco-badante/${ricercaId}`, `ricerca-${ricercaId}`)
      }
      return { id: p!.id }
    },

    async mieProposte(utenteId: number): Promise<MiaProposta[]> {
      await soloBadante(utenteId)
      return db.query<MiaProposta>(
        `SELECT p.id, p.messaggio, p.stato, ${ISO('p.creata_il')} AS "creataIl", p.contatto_id AS "contattoId",
                (SELECT row_to_json(x) FROM (SELECT ${CAMPI_RICERCA} FROM ricerca_badante r WHERE r.id = p.ricerca_id) x) AS ricerca
         FROM proposta p WHERE p.badante_id = $1 AND p.stato <> 'RITIRATA'
         ORDER BY p.creata_il DESC`,
        [utenteId],
      )
    },

    async ritira(propostaId: number, utenteId: number): Promise<void> {
      await soloBadante(utenteId)
      const [p] = await db.query<{ stato: StatoProposta }>('SELECT stato FROM proposta WHERE id = $1 AND badante_id = $2', [propostaId, utenteId])
      if (!p) throw new ErroreApplicativo(404, 'PROPOSTA_NON_TROVATA', 'Proposta non trovata.')
      if (p.stato !== 'INVIATA') throw new ErroreApplicativo(409, 'PROPOSTA_GIA_DECISA', 'La famiglia ha già risposto a questa proposta.')
      await db.query(`UPDATE proposta SET stato = 'RITIRATA' WHERE id = $1`, [propostaId])
    },
  }
}

export type ServizioRicerche = ReturnType<typeof creaServizioRicerche>
