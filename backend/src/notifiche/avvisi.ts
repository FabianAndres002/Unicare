// Avvisi via email quando una richiesta di aiuto cambia.
//
//   CREATA      a tutto il cerchio, tranne chi l'ha chiesta
//   PRESA       a chi l'ha chiesta (se è l'anziano: ai familiari), tranne chi l'ha presa
//   RILASCIATA  a tutto il cerchio, tranne chi l'ha lasciata: torna da prendere
//   COMPLETATA  come PRESA
//   ANNULLATA   a chi se ne stava occupando
//
// Gli avvisi partono "in sottofondo": se la posta non funziona, la richiesta va a buon fine
// lo stesso e l'errore finisce solo nel terminale.

import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import type { Postino } from './postino.ts'
import type { AvvisoPush, Push } from './push.ts'
import { comeLingua, rendi, tr, type Testo } from '../comune/testi.ts'
import type { Lingua } from '../traduzione/traduzione.service.ts'

export type EventoRichiesta = 'CREATA' | 'PRESA' | 'RILASCIATA' | 'COMPLETATA' | 'ANNULLATA'

const COSA: Record<string, Testo> = {
  SPESA: tr('la spesa'),
  FARMACIA: tr('un passaggio in farmacia'),
  ACCOMPAGNAMENTO: tr('un accompagnamento'),
  COMPAGNIA: tr('un po’ di compagnia'),
  CASA: tr('una mano in casa'),
  ALTRO: tr('un aiuto'),
}

type Info = {
  id: number
  cerchioId: number
  categoria: string
  testo: string | null
  anziano: string
  creataDa: number | null
  creataDaNome: string | null
  dallAnziano: boolean
  presaDa: number | null
  presaDaNome: string | null
}

type Destinatario = { id: number; email: string; nome: string; emailAvvisi: boolean; lingua: string }

/** Rende sicuro un testo scritto dagli utenti prima di metterlo in una pagina HTML. */
function sicuro(testo: string): string {
  return testo.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function pagina(lingua: Lingua, nome: string, titolo: string, righe: string[], link: string): string {
  const t = (frase: string, ...valori: Testo[]) => sicuro(tr(frase, ...valori)(lingua))
  return `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#F8F7FD;font-family:Nunito,Arial,sans-serif;color:#1E1B2E">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
  <p style="font-size:20px;font-weight:800;margin:0 0 20px"><span style="color:#5E22B5">uni</span><span style="color:#F07E1F">Care</span></p>
  <div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <p style="margin:0 0 8px;color:#67647A">${t('Ciao {0},', nome)}</p>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px">${sicuro(titolo)}</h1>
    ${righe.map((r) => `<p style="margin:0 0 8px;line-height:1.5">${sicuro(r)}</p>`).join('')}
    <a href="${link}" style="display:inline-block;margin-top:16px;background:#5D46EC;color:#fff;text-decoration:none;
       font-weight:700;padding:14px 22px;border-radius:14px">${t('Apri in Unicare')}</a>
  </div>
  <p style="font-size:12px;color:#8A879A;margin:20px 4px 0">${t('Ricevi questa email perché fai parte di un cerchio su Unicare. Puoi spegnere gli avvisi via email dal tuo profilo.')}</p>
</div></body></html>`
}

function contenuto(evento: EventoRichiesta, r: Info, autore: string): { oggetto: Testo; righe: Testo[] } {
  const cosa: Testo = r.categoria === 'ALTRO' && r.testo ? `“${r.testo}”` : COSA[r.categoria]!
  const dettaglio = r.testo && r.categoria !== 'ALTRO' ? [tr('Nota: {0}', r.testo)] : []
  switch (evento) {
    case 'CREATA':
      return r.dallAnziano
        ? { oggetto: tr('{0} chiede aiuto: {1}', r.anziano, cosa), righe: [tr('{0} ha chiesto {1} dal suo telefono.', r.anziano, cosa), ...dettaglio, tr('Chi può occuparsene?')] }
        : { oggetto: tr('Nuova richiesta per {0}: {1}', r.anziano, cosa), righe: [tr('{0} ha chiesto {1} per {2}.', autore, cosa, r.anziano), ...dettaglio, tr('Chi può occuparsene?')] }
    case 'PRESA':
      return { oggetto: tr('{0} se ne occupa: {1} per {2}', autore, cosa, r.anziano), righe: [tr('{0} ha detto “Me ne occupo io”.', autore)] }
    case 'RILASCIATA':
      return { oggetto: tr('Di nuovo da prendere: {0} per {1}', cosa, r.anziano), righe: [tr('{0} non riesce più a occuparsene.', autore), tr('Qualcun altro può farlo?')] }
    case 'COMPLETATA':
      return { oggetto: tr('Fatto: {0} per {1}', cosa, r.anziano), righe: [tr('{0} ha segnato la richiesta come fatta.', autore)] }
    case 'ANNULLATA':
      return { oggetto: tr('Non serve più: {0} per {1}', cosa, r.anziano), righe: [tr('{0} ha annullato la richiesta: non c’è più bisogno.', autore)] }
  }
}

export function creaAvvisi(db: Database, postino: Postino, push: Push) {
  const inCorso = new Set<Promise<void>>()

  async function destinatari(evento: EventoRichiesta, r: Info, autoreId: number | null): Promise<Destinatario[]> {
    const tutti = await db.query<Destinatario & { ruolo: string }>(
      `SELECT u.id, u.email, u.nome, u.email_avvisi AS "emailAvvisi", u.lingua, m.ruolo FROM membro_cerchio m JOIN utente u ON u.id = m.utente_id
       WHERE m.cerchio_id = $1 ORDER BY u.id`,
      [r.cerchioId],
    )
    const altri = tutti.filter((u) => u.id !== autoreId)
    switch (evento) {
      case 'CREATA':
      case 'RILASCIATA':
        return altri
      case 'PRESA':
      case 'COMPLETATA':
        return r.dallAnziano ? altri.filter((u) => u.ruolo !== 'BADANTE') : altri.filter((u) => u.id === r.creataDa)
      case 'ANNULLATA':
        return altri.filter((u) => u.id === r.presaDa)
    }
  }

  async function lavora(evento: EventoRichiesta, richiestaId: number, autoreId: number | null) {
    const [r] = await db.query<Info>(
      `SELECT r.id, r.cerchio_id AS "cerchioId", r.categoria, r.testo, a.nome AS anziano,
              r.creata_da AS "creataDa", c.nome AS "creataDaNome", r.creata_dall_anziano AS "dallAnziano",
              r.presa_da AS "presaDa", p.nome AS "presaDaNome"
       FROM richiesta r JOIN anziano a ON a.id = r.anziano_id
       LEFT JOIN utente c ON c.id = r.creata_da LEFT JOIN utente p ON p.id = r.presa_da
       WHERE r.id = $1`,
      [richiestaId],
    )
    if (!r) return
    const [autore] = autoreId ? await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [autoreId]) : []
    const { oggetto, righe } = contenuto(evento, r, autore?.nome ?? r.anziano)
    await manda(await destinatari(evento, r, autoreId), oggetto, righe, `/richieste/${r.id}`, `richiesta-${r.id}`)

    // All'anziano che l'ha chiesta dal telefono: "Maria se ne occupa", "Fatto".
    if (r.dallAnziano && (evento === 'PRESA' || evento === 'COMPLETATA')) {
      const [a] = await db.query<{ id: number }>('SELECT anziano_id AS id FROM richiesta WHERE id = $1', [r.id])
      const cosa: Testo = r.categoria === 'ALTRO' && r.testo ? r.testo : COSA[r.categoria]!
      await push.aAnziano(a!.id, {
        titolo: evento === 'PRESA' ? tr('{0} se ne occupa', autore?.nome ?? tr('Qualcuno')) : tr('Fatto!'),
        testo: evento === 'PRESA' ? tr('Per {0}.', cosa) : tr('{0} ha finito: {1}.', autore?.nome ?? tr('La tua famiglia'), cosa),
        url: '/senior',
        tag: `richiesta-${r.id}`,
      })
    }
  }

  /** Email (a chi le vuole) e notifica push a ogni destinatario. */
  async function manda(chi: Destinatario[], oggetto: Testo, righe: Testo[], percorso: string, tag: string) {
    const link = `${config.urlApp}${percorso}`
    for (const d of chi.filter((d) => d.emailAvvisi)) {
      const lingua = comeLingua(d.lingua)
      const titolo = rendi(oggetto, lingua)
      const testi = righe.map((r) => rendi(r, lingua))
      await postino.invia({
        a: d.email,
        oggetto: titolo,
        testo: `${tr('Ciao {0},', d.nome)(lingua)}\n\n${testi.join('\n')}\n\n${tr('Apri in Unicare')(lingua)}: ${link}`,
        html: pagina(lingua, d.nome, titolo, testi, link),
      })
    }
    await push.aUtenti(chi.map((d) => d.id), { titolo: oggetto, testo: (l) => righe.map((r) => rendi(r, l)).join(' '), url: percorso, tag })
  }

  function inSottofondo(lavoro: Promise<unknown>) {
    const p: Promise<void> = lavoro
      .then(() => {})
      .catch((errore) => console.error('Avviso non inviato:', errore))
      .finally(() => inCorso.delete(p))
    inCorso.add(p)
  }

  return {
    /** Manda gli avvisi senza far aspettare chi ha fatto l'azione. */
    richiesta(evento: EventoRichiesta, richiestaId: number, autoreId: number | null): void {
      inSottofondo(lavora(evento, richiestaId, autoreId))
    },

    /** Ai familiari e all'amministratore dell'anziano (non alla badante): email e push. */
    familiari(anzianoId: number, oggetto: Testo, righe: Testo[], percorso: string, tag: string): void {
      inSottofondo(
        (async () => {
          const chi = await db.query<Destinatario>(
            `SELECT u.id, u.email, u.nome, u.email_avvisi AS "emailAvvisi", u.lingua
             FROM anziano a JOIN membro_cerchio m ON m.cerchio_id = a.cerchio_id JOIN utente u ON u.id = m.utente_id
             WHERE a.id = $1 AND m.ruolo IN ('ADMIN', 'FAMILIARE') ORDER BY u.id`,
            [anzianoId],
          )
          await manda(chi, oggetto, righe, percorso, tag)
        })(),
      )
    },

    /**
     * A chi fa parte del cerchio dell'anziano: email (a chi le vuole) e push.
     * tranne: chi ha fatto l'azione; solo: limita a questi utenti (per esempio chi accompagna).
     */
    cerchio(anzianoId: number, oggetto: Testo, righe: Testo[], percorso: string, tag: string, opzioni: { tranne?: number | null; solo?: number[] } = {}): void {
      inSottofondo(
        (async () => {
          const chi = await db.query<Destinatario>(
            `SELECT u.id, u.email, u.nome, u.email_avvisi AS "emailAvvisi", u.lingua
             FROM anziano a JOIN membro_cerchio m ON m.cerchio_id = a.cerchio_id JOIN utente u ON u.id = m.utente_id
             WHERE a.id = $1 ORDER BY u.id`,
            [anzianoId],
          )
          await manda(
            chi.filter((d) => d.id !== opzioni.tranne && (!opzioni.solo || opzioni.solo.includes(d.id))),
            oggetto,
            righe,
            percorso,
            tag,
          )
        })(),
      )
    },

    /** A una sola persona: email (se le vuole) e push. */
    utente(utenteId: number, oggetto: Testo, righe: Testo[], percorso: string, tag: string): void {
      inSottofondo(
        (async () => {
          const chi = await db.query<Destinatario>(
            `SELECT id, email, nome, email_avvisi AS "emailAvvisi", lingua FROM utente WHERE id = $1`,
            [utenteId],
          )
          await manda(chi, oggetto, righe, percorso, tag)
        })(),
      )
    },

    /** Notifica push al telefono dell'anziano. */
    anziano(anzianoId: number, messaggio: AvvisoPush): void {
      inSottofondo(push.aAnziano(anzianoId, messaggio))
    },

    /** Per i test: aspetta che tutti gli avvisi partiti siano stati consegnati. */
    async attendi(): Promise<void> {
      await Promise.all([...inCorso])
    },
  }
}

export type Avvisi = ReturnType<typeof creaAvvisi>
