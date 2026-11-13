// Test delle richieste di aiuto: ciclo di vita, permessi, richieste contemporanee.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Express

beforeEach(async () => {
  ;({ db, app } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

/** Anna (admin), Marco (familiare) e Maria (badante) nel cerchio della nonna Pina. */
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
  const nuova = async (chi = marco, categoria = 'SPESA', testo: string | null = 'Latte e pane') => {
    const r = await chi.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria, testo })
    expect(r.status).toBe(201)
    return r.body.id as number
  }
  return { anna, marco, maria, cerchioId, anzianoId, nuova }
}

describe('ciclo di una richiesta', () => {
  it('aperta → presa in carico → completata, con lo storico', async () => {
    const { marco, maria, cerchioId, nuova } = await famiglia()
    const id = await nuova()

    let r = await maria.get(`/api/richieste/${id}`)
    expect(r.body).toMatchObject({ stato: 'APERTA', categoria: 'SPESA', testo: 'Latte e pane', creataDa: { nome: 'Marco' }, anziano: { nome: 'Pina' } })
    expect(r.body.azioni).toEqual(['PRENDI'])

    r = await maria.post(`/api/richieste/${id}/prendi`)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ stato: 'PRESA_IN_CARICO', presaDa: { nome: 'Maria' } })
    expect(r.body.azioni).toEqual(['RILASCIA', 'COMPLETA'])

    r = await maria.post(`/api/richieste/${id}/completa`).send({ nota: 'Fatto alle 11' })
    expect(r.body.stato).toBe('COMPLETATA')
    expect(r.body.chiusaIl).toBeTruthy()
    expect(r.body.azioni).toEqual([])
    expect(r.body.eventi.map((e: { tipo: string }) => e.tipo)).toEqual(['CREATA', 'PRESA', 'COMPLETATA'])
    expect(r.body.eventi[2]).toMatchObject({ utente: 'Maria', nota: 'Fatto alle 11' })

    const attive = await marco.get(`/api/cerchi/${cerchioId}/richieste`)
    expect(attive.body).toEqual([])
    const concluse = await marco.get(`/api/cerchi/${cerchioId}/richieste?vista=concluse`)
    expect(concluse.body.map((x: { id: number }) => x.id)).toEqual([id])
  })

  it('chi l\'ha presa può rilasciarla: torna aperta per tutti', async () => {
    const { maria, marco, nuova } = await famiglia()
    const id = await nuova()
    await maria.post(`/api/richieste/${id}/prendi`).expect(200)
    const r = await maria.post(`/api/richieste/${id}/rilascia`)
    expect(r.body).toMatchObject({ stato: 'APERTA', presaDa: null })
    expect((await marco.post(`/api/richieste/${id}/prendi`)).status).toBe(200)
  })

  it('elenco attive: prima le aperte, poi quelle in corso', async () => {
    const { maria, cerchioId, nuova } = await famiglia()
    const prima = await nuova()
    const seconda = await nuova(undefined, 'FARMACIA', null)
    await maria.post(`/api/richieste/${prima}/prendi`).expect(200)
    const r = await maria.get(`/api/cerchi/${cerchioId}/richieste?vista=attive`)
    expect(r.body.map((x: { id: number }) => x.id)).toEqual([seconda, prima])
  })

  it('la badante può creare richieste per l\'anziano', async () => {
    const { maria, nuova } = await famiglia()
    await nuova(maria, 'CASA', 'Lampadina del bagno')
  })
})

describe('regole', () => {
  it('se due persone la prendono insieme, solo la prima ce la fa', async () => {
    const { marco, maria, nuova } = await famiglia()
    const id = await nuova()
    const [a, b] = await Promise.all([marco.post(`/api/richieste/${id}/prendi`), maria.post(`/api/richieste/${id}/prendi`)])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    const perdente = a.status === 409 ? a : b
    expect(perdente.body.codice).toBe('STATO_CAMBIATO')
    expect(perdente.body.messaggio).toMatch(/Se ne sta già occupando (Marco|Maria)/)
  })

  it('solo chi l\'ha presa (o l\'amministratore) la completa', async () => {
    const { anna, marco, maria, nuova } = await famiglia()
    const id = await nuova()
    await maria.post(`/api/richieste/${id}/prendi`).expect(200)
    expect((await marco.post(`/api/richieste/${id}/completa`)).status).toBe(403)
    expect((await marco.post(`/api/richieste/${id}/rilascia`)).status).toBe(403)
    expect((await anna.post(`/api/richieste/${id}/completa`)).status).toBe(200)
  })

  it('annulla: chi l\'ha creata o l\'amministratore, non gli altri', async () => {
    const { anna, marco, maria, nuova } = await famiglia()
    const id = await nuova(marco)
    expect((await maria.post(`/api/richieste/${id}/annulla`)).status).toBe(403)
    expect((await marco.post(`/api/richieste/${id}/annulla`)).body.stato).toBe('ANNULLATA')
    const altra = await nuova(marco)
    expect((await anna.post(`/api/richieste/${altra}/annulla`)).status).toBe(200)
  })

  it('una richiesta conclusa non cambia più', async () => {
    const { marco, maria, nuova } = await famiglia()
    const id = await nuova()
    await marco.post(`/api/richieste/${id}/annulla`).expect(200)
    const r = await maria.post(`/api/richieste/${id}/prendi`)
    expect(r.status).toBe(409)
    expect(r.body.messaggio).toContain('annullata')
  })

  it('"Altro" richiede una descrizione', async () => {
    const { marco, cerchioId, anzianoId } = await famiglia()
    const r = await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'ALTRO', testo: '' })
    expect(r.status).toBe(400)
  })

  it('non si crea una richiesta per un anziano di un altro cerchio', async () => {
    const { marco, cerchioId } = await famiglia()
    const luca = await utenteCollegato(app, 'Luca')
    const altro = (await luca.post('/api/cerchi').send({ nome: 'Altri' })).body.id
    const nonna = (await luca.post(`/api/cerchi/${altro}/anziani`).send({ nome: 'Ada', cognome: 'B', consensoPrivacy: true })).body.id
    const r = await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId: nonna, categoria: 'SPESA' })
    expect(r.status).toBe(400)
    expect(r.body.codice).toBe('ANZIANO_NON_VALIDO')
  })

  it('chi non è nel cerchio non vede e non tocca le richieste (404)', async () => {
    const { cerchioId, nuova } = await famiglia()
    const id = await nuova()
    const luca = await utenteCollegato(app, 'Luca')
    expect((await luca.get(`/api/richieste/${id}`)).status).toBe(404)
    expect((await luca.post(`/api/richieste/${id}/prendi`)).status).toBe(404)
    expect((await luca.get(`/api/cerchi/${cerchioId}/richieste`)).status).toBe(404)
  })

  it('azione sconosciuta: 404', async () => {
    const { marco, nuova } = await famiglia()
    const id = await nuova()
    expect((await marco.post(`/api/richieste/${id}/vola`)).status).toBe(404)
  })
})
