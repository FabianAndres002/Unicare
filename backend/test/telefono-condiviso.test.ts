// Due nonni sullo stesso telefono: un collegamento per persona nello stesso cookie.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Database } from '../src/db/db.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Awaited<ReturnType<typeof preparaApp>>['app']
let notifiche: Awaited<ReturnType<typeof preparaApp>>['notifiche']

beforeEach(async () => {
  ;({ db, app, notifiche } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

async function nonni() {
  const anna = await utenteCollegato(app, 'Anna')
  const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
  const nuovo = async (nome: string) =>
    (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome, cognome: 'Rossi', consensoPrivacy: true })).body.id as number
  const pina = await nuovo('Pina')
  const peppe = await nuovo('Peppe')
  const codice = async (id: number) => (await anna.post(`/api/anziani/${id}/telefono/codice`).expect(201)).body.codice as string
  return { anna, cerchioId, pina, peppe, codice }
}

describe('un telefono per due nonni', () => {
  it('aggiunge la seconda persona e sceglie per chi è ogni chiamata', async () => {
    const { pina, peppe, codice } = await nonni()
    const tel = request.agent(app)
    expect((await tel.post('/api/senior/collega').send({ codice: await codice(pina) }).expect(200)).body).toEqual({ anzianoId: pina })
    await tel.post('/api/senior/collega').send({ codice: await codice(peppe) }).expect(200)

    const io = (await tel.get('/api/senior/io').expect(200)).body
    expect(io.anziano.nome).toBe('Pina')
    expect(io.persone.map((p: { nome: string }) => p.nome)).toEqual(['Pina', 'Peppe'])
    expect((await tel.get(`/api/senior/io?persona=${peppe}`).expect(200)).body.anziano.nome).toBe('Peppe')
    // Una persona che non è su questo telefono non si può scegliere: vale la prima.
    expect((await tel.get('/api/senior/io?persona=999').expect(200)).body.anziano.nome).toBe('Pina')

    // La richiesta va alla persona scelta.
    await tel.post(`/api/senior/richieste?persona=${peppe}`).send({ categoria: 'SPESA' }).expect(201)
    expect((await tel.get(`/api/senior/io?persona=${peppe}`)).body.richieste).toHaveLength(1)
    expect((await tel.get(`/api/senior/io?persona=${pina}`)).body.richieste).toHaveLength(0)
  })

  it('le notifiche arrivano per tutti e due, con il nome di chi riguarda', async () => {
    const { anna, pina, peppe, codice } = await nonni()
    const tel = request.agent(app)
    await tel.post('/api/senior/collega').send({ codice: await codice(pina) }).expect(200)
    await tel.post('/api/senior/push').send({ endpoint: 'https://push.example/casa', keys: { p256dh: 'k', auth: 'a' } }).expect(204)
    // Peppe viene aggiunto dopo: le notifiche già accese valgono anche per lui.
    await tel.post('/api/senior/collega').send({ codice: await codice(peppe) }).expect(200)

    const r = (await tel.post(`/api/senior/richieste?persona=${peppe}`).send({ categoria: 'FARMACIA' }).expect(201)).body
    await anna.post(`/api/richieste/${r.id}/prendi`).expect(200)
    const arrivate = (await notifiche()).filter((n) => n.endpoint === 'https://push.example/casa')
    expect(arrivate).toHaveLength(1)
    expect(arrivate[0]!.messaggio.titolo).toBe('Peppe: Anna se ne occupa')
    expect(arrivate[0]!.messaggio.url).toBe(`/senior?persona=${peppe}`)
  })

  it('"Esci" scollega solo la persona scelta', async () => {
    const { pina, peppe, codice } = await nonni()
    const tel = request.agent(app)
    await tel.post('/api/senior/collega').send({ codice: await codice(pina) }).expect(200)
    await tel.post('/api/senior/collega').send({ codice: await codice(peppe) }).expect(200)
    await tel.post(`/api/senior/esci?persona=${pina}`).expect(204)
    const io = (await tel.get('/api/senior/io').expect(200)).body
    expect(io.anziano.nome).toBe('Peppe')
    expect(io.persone).toHaveLength(1)
    await tel.post('/api/senior/esci').expect(204)
    await tel.get('/api/senior/io').expect(401)
  })

  it('se la famiglia scollega una persona, l\'altra resta sul telefono', async () => {
    const { anna, pina, peppe, codice } = await nonni()
    const tel = request.agent(app)
    await tel.post('/api/senior/collega').send({ codice: await codice(pina) }).expect(200)
    await tel.post('/api/senior/collega').send({ codice: await codice(peppe) }).expect(200)
    const dispositivo = (await anna.get(`/api/anziani/${pina}/telefono`)).body.collegati[0].id
    await anna.delete(`/api/anziani/${pina}/telefono/${dispositivo}`).expect(204)
    const io = (await tel.get(`/api/senior/io?persona=${pina}`).expect(200)).body
    expect(io.anziano.nome).toBe('Peppe')
    expect(io.persone).toHaveLength(1)
  })
})

describe('notifica di prova', () => {
  it('arriva ai telefoni dell\'utente e dice quanti sono', async () => {
    const { anna } = await nonni()
    expect((await anna.post('/api/push/prova').expect(200)).body).toEqual({ telefoni: 0, consegnate: 0, scadute: 0, errori: [] })
    await anna.post('/api/push/iscrizione').send({ endpoint: 'https://push.example/anna', keys: { p256dh: 'k', auth: 'a' } }).expect(204)
    expect((await anna.post('/api/push/prova').expect(200)).body).toMatchObject({ telefoni: 1, consegnate: 1 })
    const n = (await notifiche()).at(-1)!
    expect(n.messaggio.titolo).toBe('Notifica di prova')
  })
})
