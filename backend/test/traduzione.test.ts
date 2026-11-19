// Test della settimana 11: l'interprete a voce (qui solo la parte del server: la traduzione).

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import { creaApp } from '../src/app.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Express
let traduzioni: { testo: string; da: string; a: string }[]

beforeEach(async () => {
  ;({ db, app, traduzioni } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

describe('interprete', () => {
  it('traduce per familiari e badanti; serve il login', async () => {
    await request(app).post('/api/traduci').send({ testo: 'Buongiorno', da: 'it', a: 'ro' }).expect(401)
    const anna = await utenteCollegato(app, 'Anna')
    const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
    expect((await anna.get('/api/traduci').expect(200)).body).toMatchObject({ disponibile: true, lingue: expect.arrayContaining(['it', 'ro', 'uk']) })
    expect((await anna.post('/api/traduci').send({ testo: '  Hai mangiato? ', da: 'it', a: 'ro' }).expect(200)).body).toEqual({ traduzione: '[ro] Hai mangiato?' })
    expect((await elena.post('/api/traduci').send({ testo: 'Da, am mâncat', da: 'ro', a: 'it' }).expect(200)).body.traduzione).toBe('[it] Da, am mâncat')
    expect(traduzioni).toHaveLength(2)
  })

  it('controlla lingue e lunghezza', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    await anna.post('/api/traduci').send({ testo: 'ciao', da: 'it', a: 'it' }).expect(400)
    await anna.post('/api/traduci').send({ testo: 'ciao', da: 'it', a: 'xx' }).expect(400)
    await anna.post('/api/traduci').send({ testo: '   ', da: 'it', a: 'ro' }).expect(400)
    await anna.post('/api/traduci').send({ testo: 'a'.repeat(501), da: 'it', a: 'ro' }).expect(400)
    expect(traduzioni).toEqual([])
  })

  it('se il servizio non risponde: errore chiaro, la frase non finisce nel log', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const r = await anna.post('/api/traduci').send({ testo: 'errore', da: 'it', a: 'ro' }).expect(502)
    expect(r.body.codice).toBe('TRADUZIONE_FALLITA')
  })

  it('al massimo 120 frasi all’ora a persona', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    for (let i = 0; i < 120; i++) await anna.post('/api/traduci').send({ testo: `frase ${i}`, da: 'it', a: 'ro' }).expect(200)
    expect((await anna.post('/api/traduci').send({ testo: 'ancora', da: 'it', a: 'ro' }).expect(429)).body.codice).toBe('TROPPE_TRADUZIONI')
    // Gli altri non sono bloccati.
    const marco = await utenteCollegato(app, 'Marco')
    await marco.post('/api/traduci').send({ testo: 'ciao', da: 'it', a: 'ro' }).expect(200)
  })

  it('anche dal telefono dell’anziano', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id
    const anzianoId = (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id
    const { codice } = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body
    await request(app).post('/api/senior/traduci').send({ testo: 'Ho freddo', da: 'it', a: 'uk' }).expect(401)
    const nonna = request.agent(app)
    await nonna.post('/api/senior/collega').send({ codice }).expect(200)
    expect((await nonna.post('/api/senior/traduci').send({ testo: 'Ho freddo', da: 'it', a: 'uk' }).expect(200)).body).toEqual({ traduzione: '[uk] Ho freddo' })
  })

  it('senza servizio di traduzione l’interprete risulta spento', async () => {
    const spenta = creaApp(db, { traduttore: null })
    const anna = await utenteCollegato(spenta, 'Anna')
    expect((await anna.get('/api/traduci')).body.disponibile).toBe(false)
    expect((await anna.post('/api/traduci').send({ testo: 'ciao', da: 'it', a: 'ro' }).expect(503)).body.codice).toBe('TRADUZIONE_NON_DISPONIBILE')
  })
})

describe('lingua, telefono e chat tradotta', () => {
  it('ognuno sceglie la lingua dell’app e può lasciare un numero di telefono', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    expect((await anna.get('/api/auth/io')).body).toMatchObject({ lingua: 'it', telefono: null })
    expect((await anna.patch('/api/auth/io').send({ lingua: 'ro', telefono: '+39 333 123 4567' }).expect(200)).body)
      .toMatchObject({ lingua: 'ro', telefono: '+393331234567', emailAvvisi: true })
    await anna.patch('/api/auth/io').send({ lingua: 'xx' }).expect(400)
    await anna.patch('/api/auth/io').send({ telefono: 'chiamami' }).expect(400)
    expect((await anna.patch('/api/auth/io').send({ telefono: '' }).expect(200)).body).toMatchObject({ telefono: null, lingua: 'ro' })
  })

  it('l’anziano vede il numero dei familiari per chiamarli', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    await anna.patch('/api/auth/io').send({ telefono: '3331234567' })
    const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id
    const anzianoId = (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id
    const { codice } = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body
    const nonna = request.agent(app)
    await nonna.post('/api/senior/collega').send({ codice }).expect(200)
    expect((await nonna.get('/api/senior/io').expect(200)).body.famiglia[0]).toMatchObject({ nome: 'Anna', telefono: '3331234567' })
  })

  it('i messaggi della chat si traducono nella lingua di chi legge, una volta sola', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
    await elena.patch('/api/auth/io').send({ lingua: 'ro' })
    const elenaId = (await elena.get('/api/auth/io')).body.id
    await elena.put('/api/badante/profilo').send(({ presentazione: 'Sono una persona paziente, lavoro con anziani da otto anni e mi piace cucinare.', provincia: 'ce', comune: 'Caserta', zone: null, anniEsperienza: 8, lingue: 'Italiano, rumeno', servizi: ['COMPAGNIA'], disponibilita: ['A_ORE'], tariffaOrariaCentesimi: null, automunita: false, visibile: true })).expect(204)
    const { contattoId } = (await anna.post(`/api/badanti/${elenaId}/messaggi`).send({ testo: 'Ciao Elena' }).expect(201)).body
    const msg = (await elena.get(`/api/contatti/${contattoId}`)).body.messaggi[0]
    expect(msg).toMatchObject({ lingua: 'it', traduzione: null })
    expect((await elena.post(`/api/contatti/${contattoId}/messaggi/${msg.id}/traduci`).expect(200)).body).toEqual({ traduzione: '[ro] Ciao Elena' })
    await elena.post(`/api/contatti/${contattoId}/messaggi/${msg.id}/traduci`).expect(200)
    expect(traduzioni).toHaveLength(1)
    expect((await elena.get(`/api/contatti/${contattoId}`)).body.messaggi[0].traduzione).toBe('[ro] Ciao Elena')
    // Stessa lingua: niente da tradurre. Chi non è nella conversazione non può.
    expect((await anna.post(`/api/contatti/${contattoId}/messaggi/${msg.id}/traduci`).expect(200)).body).toEqual({ traduzione: null })
    const marco = await utenteCollegato(app, 'Marco')
    await marco.post(`/api/contatti/${contattoId}/messaggi/${msg.id}/traduci`).expect(404)
  })
})
