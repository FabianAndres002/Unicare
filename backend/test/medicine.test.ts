// Test della settimana 6: promemoria delle medicine e notifiche push.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import type { Email } from '../src/notifiche/postino.ts'
import type { MessaggioPush } from '../src/notifiche/push.ts'
import type { Pianificatore } from '../src/medicine/medicine.service.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Express
let posta: () => Promise<Email[]>
let notifiche: () => Promise<{ endpoint: string; messaggio: MessaggioPush }[]>
let pianificatore: Pianificatore

beforeEach(async () => {
  ;({ db, app, posta, notifiche, pianificatore } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

const MINUTO = 60_000

/** L'ora italiana tra "minuti" minuti, come "HH:MM". */
const oraRoma = (minuti: number) =>
  new Date(Date.now() + minuti * MINUTO).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false })

const iscrizione = (nome: string) => ({ endpoint: `https://push.example/${nome}`, keys: { p256dh: 'chiave-' + nome, auth: 'auth-' + nome } })

async function famiglia() {
  const anna = await utenteCollegato(app, 'Anna')
  const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
  const anzianoId = (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id as number
  const entra = async (nome: string, tipo: 'FAMILIARE' | 'BADANTE') => {
    const { token } = (await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: `${nome.toLowerCase()}@example.com`, ruolo: tipo })).body
    const u = await utenteCollegato(app, nome, tipo)
    await u.post(`/api/inviti/token/${token}/accetta`).expect(200)
    return u
  }
  const marco = await entra('Marco', 'FAMILIARE')
  const maria = await entra('Maria', 'BADANTE')
  // Il telefono della nonna, collegato e con le notifiche accese.
  const { codice } = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body
  const nonna = request.agent(app)
  await nonna.post('/api/senior/collega').send({ codice }).expect(204)
  await nonna.post('/api/senior/push').send(iscrizione('nonna')).expect(204)
  return { anna, marco, maria, cerchioId, anzianoId, nonna }
}

/** Un promemoria "di ieri": l'orario di oggi conta anche se è già passato. */
async function promemoriaGiaAttivo(anna: request.Agent, anzianoId: number, momento: string, ora: string) {
  await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento, ora, consenso: true }).expect(201)
  await db.query(`UPDATE promemoria SET modificato_il = now() - interval '1 day' WHERE anziano_id = $1 AND momento = $2`, [anzianoId, momento])
  await db.query(`DELETE FROM occorrenza`)
}

describe('impostare i promemoria', () => {
  it('serve il consenso la prima volta; poi la famiglia vede i promemoria', async () => {
    const { anna, maria, anzianoId } = await famiglia()
    const senza = await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'MATTINO', ora: '08:00' })
    expect(senza.body.codice).toBe('CONSENSO_MANCANTE')

    const r = await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'MATTINO', ora: '08:00', consenso: true })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ consenso: true, promemoria: [{ momento: 'MATTINO', ora: '08:00', attivo: true }] })
    // Il consenso resta: il secondo promemoria non lo chiede più.
    await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'SERA', ora: '20:30' }).expect(201)

    const visto = await maria.get(`/api/anziani/${anzianoId}/medicine`)
    expect(visto.body.promemoria.map((p: { ora: string }) => p.ora)).toEqual(['08:00', '20:30'])
    expect(visto.body.puoModificare).toBe(false)
  })

  it('la badante vede ma non modifica; chi è fuori dal cerchio riceve 404', async () => {
    const { maria, anzianoId } = await famiglia()
    expect((await maria.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'MATTINO', ora: '08:00', consenso: true })).status).toBe(403)
    const ugo = await utenteCollegato(app, 'Ugo')
    expect((await ugo.get(`/api/anziani/${anzianoId}/medicine`)).status).toBe(404)
  })

  it('un solo promemoria per momento; si può cambiare orario, spegnere e togliere', async () => {
    const { marco, anzianoId } = await famiglia()
    await marco.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'PRANZO', ora: '12:30', consenso: true }).expect(201)
    expect((await marco.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'PRANZO', ora: '13:00' })).status).toBe(409)
    const [p] = (await marco.get(`/api/anziani/${anzianoId}/medicine`)).body.promemoria
    await marco.patch(`/api/promemoria/${p.id}`).send({ ora: '13:15', attivo: false }).expect(204)
    expect((await marco.get(`/api/anziani/${anzianoId}/medicine`)).body.promemoria[0]).toMatchObject({ ora: '13:15', attivo: false })
    expect((await marco.patch(`/api/promemoria/${p.id}`).send({ ora: '25:00' })).status).toBe(400)
    await marco.delete(`/api/promemoria/${p.id}`).expect(204)
    expect((await marco.get(`/api/anziani/${anzianoId}/medicine`)).body.promemoria).toEqual([])
  })
})

describe('il promemoria scatta', () => {
  it('all\'orario la nonna riceve la notifica, una volta sola; "Fatto" chiude', async () => {
    const { anna, nonna, anzianoId } = await famiglia()
    await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'MATTINO', ora: oraRoma(3), consenso: true }).expect(201)

    let io = (await nonna.get('/api/senior/io')).body
    expect(io.medicine).toHaveLength(1)
    expect(io.medicine[0]).toMatchObject({ momento: 'MATTINO', stato: 'IN_ATTESA' })
    const previsto = new Date(io.medicine[0].previstoIl)

    await pianificatore.giro(new Date(previsto.getTime() - MINUTO))
    expect(await notifiche()).toEqual([]) // non ancora

    await pianificatore.giro(new Date(previsto.getTime() + 30_000))
    await pianificatore.giro(new Date(previsto.getTime() + 40_000))
    const arrivate = await notifiche()
    expect(arrivate).toHaveLength(1)
    expect(arrivate[0]).toMatchObject({ endpoint: 'https://push.example/nonna', messaggio: { titolo: 'È ora: medicine del mattino', url: '/senior', insistente: true } })

    await nonna.post(`/api/senior/medicine/${io.medicine[0].id}/fatto`).expect(204)
    io = (await nonna.get('/api/senior/io')).body
    expect(io.medicine[0].stato).toBe('FATTO')
    // Già fatto: dopo un'ora nessun avviso alla famiglia.
    await pianificatore.giro(new Date(previsto.getTime() + 61 * MINUTO))
    expect(await posta()).toEqual([])
  })

  it('cambiare orario dopo il "Fatto" non crea una seconda medicina per oggi', async () => {
    const { anna, nonna, anzianoId } = await famiglia()
    await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'PRANZO', ora: oraRoma(3), consenso: true }).expect(201)
    let io = (await nonna.get('/api/senior/io')).body
    await nonna.post(`/api/senior/medicine/${io.medicine[0].id}/fatto`).expect(204)
    const { promemoria } = (await anna.get(`/api/anziani/${anzianoId}/medicine`)).body
    await anna.patch(`/api/promemoria/${promemoria[0].id}`).send({ ora: oraRoma(10) }).expect(204)
    await pianificatore.giro()
    io = (await nonna.get('/api/senior/io')).body
    expect(io.medicine).toHaveLength(1)
    expect(io.medicine[0].stato).toBe('FATTO')
  })

  it('dopo un\'ora senza "Fatto" avvisa i familiari (non la badante); un "Fatto" in ritardo li rassicura', async () => {
    const { anna, marco, nonna, anzianoId } = await famiglia()
    await anna.post('/api/push/iscrizione').send(iscrizione('anna')).expect(204)
    await marco.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'SERA', ora: oraRoma(3), consenso: true }).expect(201)
    const [occ] = (await nonna.get('/api/senior/io')).body.medicine
    const previsto = new Date(occ.previstoIl).getTime()

    await pianificatore.giro(new Date(previsto + 59 * MINUTO))
    expect(await posta()).toEqual([])
    await pianificatore.giro(new Date(previsto + 61 * MINUTO))
    const email = await posta()
    expect(email.map((e) => e.a).sort()).toEqual(['anna@example.com', 'marco@example.com'])
    expect(email[0]!.oggetto).toBe('Pina non ha confermato le medicine della sera')
    expect((await notifiche()).filter((n) => n.endpoint.endsWith('/anna')).map((n) => n.messaggio.titolo)).toEqual([
      'Pina non ha confermato le medicine della sera',
    ])
    expect((await anna.get(`/api/anziani/${anzianoId}/medicine`)).body.oggi[0].stato).toBe('NON_CONFERMATO')

    await nonna.post(`/api/senior/medicine/${occ.id}/fatto`).expect(204)
    expect((await posta()).at(-1)!.oggetto).toBe('Pina ha preso le medicine della sera')
  })

  it('"Ricordamelo tra 15 minuti" rimanda la notifica', async () => {
    const { anna, nonna, anzianoId } = await famiglia()
    await promemoriaGiaAttivo(anna, anzianoId, 'PRANZO', oraRoma(-5))
    const adesso = Date.now()
    await pianificatore.giro(new Date(adesso))
    expect(await notifiche()).toHaveLength(1)

    const [occ] = (await nonna.get('/api/senior/io')).body.medicine
    await nonna.post(`/api/senior/medicine/${occ.id}/rimanda`).expect(204)
    await pianificatore.giro(new Date(adesso + 10 * MINUTO))
    expect(await notifiche()).toHaveLength(1)
    await pianificatore.giro(new Date(adesso + 16 * MINUTO))
    const arrivate = await notifiche()
    expect(arrivate).toHaveLength(2)
    expect(arrivate[1]!.messaggio.testo).toContain('di nuovo')
  })

  it('un orario già passato quando lo imposti non fa scattare nulla oggi', async () => {
    const { anna, anzianoId } = await famiglia()
    await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'MATTINO', ora: oraRoma(-30), consenso: true }).expect(201)
    await pianificatore.giro(new Date(Date.now() + 2 * 60 * MINUTO))
    expect((await anna.get(`/api/anziani/${anzianoId}/medicine`)).body.oggi).toEqual([])
    expect(await posta()).toEqual([])
  })

  it('la nonna non può confermare le medicine di un altro anziano', async () => {
    const { anna, nonna, anzianoId } = await famiglia()
    await anna.post(`/api/anziani/${anzianoId}/promemoria`).send({ momento: 'MATTINO', ora: oraRoma(3), consenso: true }).expect(201)
    const [occ] = (await anna.get(`/api/anziani/${anzianoId}/medicine`)).body.oggi
    const altra = await utenteCollegato(app, 'Lia')
    const c2 = (await altra.post('/api/cerchi').send({ nome: 'Famiglia Bianchi' })).body.id
    const a2 = (await altra.post(`/api/cerchi/${c2}/anziani`).send({ nome: 'Ada', cognome: 'Bianchi', consensoPrivacy: true })).body.id
    const { codice } = (await altra.post(`/api/anziani/${a2}/telefono/codice`)).body
    const ada = request.agent(app)
    await ada.post('/api/senior/collega').send({ codice }).expect(204)
    expect((await ada.post(`/api/senior/medicine/${occ.id}/fatto`)).status).toBe(404)
    expect((await nonna.post(`/api/senior/medicine/${occ.id}/fatto`)).status).toBe(204)
  })
})

describe('notifiche push', () => {
  it('chiave pubblica disponibile e sempre la stessa', async () => {
    const a = (await request(app).get('/api/push/chiave')).body.chiave
    const b = (await request(app).get('/api/push/chiave')).body.chiave
    expect(a).toMatch(/^[A-Za-z0-9_-]{80,}$/)
    expect(b).toBe(a)
  })

  it('le richieste arrivano anche come notifica; la nonna sa chi se ne occupa', async () => {
    const { anna, maria, nonna, cerchioId, anzianoId } = await famiglia()
    await anna.post('/api/push/iscrizione').send(iscrizione('anna')).expect(204)
    await anna.patch('/api/auth/io').send({ emailAvvisi: false }).expect(200)
    await maria.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'SPESA' }).expect(201)
    let n = await notifiche()
    expect(n.map((x) => [x.endpoint, x.messaggio.titolo])).toEqual([['https://push.example/anna', 'Nuova richiesta per Pina: la spesa']])
    // Anna ha spento le email, ma la notifica sul telefono le arriva lo stesso.
    expect((await posta()).map((e) => e.a)).toEqual(['marco@example.com'])

    const id = (await nonna.post('/api/senior/richieste').send({ categoria: 'FARMACIA' })).body.id
    await maria.post(`/api/richieste/${id}/prendi`).expect(200)
    n = await notifiche()
    expect(n.filter((x) => x.endpoint.endsWith('/nonna')).map((x) => x.messaggio.titolo)).toEqual(['Maria se ne occupa'])
  })

  it('un telefono che non accetta più notifiche viene dimenticato', async () => {
    const { anna, marco, cerchioId, anzianoId } = await famiglia()
    await anna.post('/api/push/iscrizione').send(iscrizione('scaduta')).expect(204)
    await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'CASA' }).expect(201)
    await notifiche()
    expect(await db.query(`SELECT 1 FROM iscrizione_push WHERE endpoint LIKE '%scaduta%'`)).toEqual([])
  })
})
