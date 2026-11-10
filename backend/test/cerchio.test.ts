// Test di cerchi, scheda dell'anziano, inviti e permessi.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
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

const pina = { nome: 'Giuseppina', cognome: 'Rossi', dataNascita: '1941-03-12', comune: 'Caserta', consensoPrivacy: true }

/** Anna crea il cerchio "Famiglia Rossi" con la nonna Pina. */
async function cerchioDiAnna() {
  const anna = await utenteCollegato(app, 'Anna')
  const c = await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })
  expect(c.status).toBe(201)
  const a = await anna.post(`/api/cerchi/${c.body.id}/anziani`).send(pina)
  expect(a.status).toBe(201)
  return { anna, cerchioId: c.body.id as number, anzianoId: a.body.id as number }
}

/** Anna invita qualcuno; restituisce il token del link. */
async function invita(anna: request.Agent, cerchioId: number, email: string, ruolo: 'FAMILIARE' | 'BADANTE') {
  const r = await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email, ruolo })
  expect(r.status).toBe(201)
  return r.body.token as string
}

describe('cerchio e anziano', () => {
  it('chi crea il cerchio ne è amministratore e vede la scheda dell\'anziano', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const r = await anna.get(`/api/cerchi/${cerchioId}`)
    expect(r.status).toBe(200)
    expect(r.body).toMatchObject({ nome: 'Famiglia Rossi', mioRuolo: 'ADMIN' })
    expect(r.body.membri).toHaveLength(1)
    expect(r.body.anziani[0]).toMatchObject({ nome: 'Giuseppina', dataNascita: '1941-03-12', comune: 'Caserta' })

    const elenco = await anna.get('/api/cerchi')
    expect(elenco.body).toHaveLength(1)
    expect(elenco.body[0]).toMatchObject({ nome: 'Famiglia Rossi', mioRuolo: 'ADMIN', numeroMembri: 1 })
    expect(elenco.body[0].anziani[0].nome).toBe('Giuseppina')
  })

  it('il consenso privacy viene registrato con chi lo ha dato', async () => {
    const { anna, anzianoId } = await cerchioDiAnna()
    const [consenso] = await db.query<{ tipo: string; dato_da: number }>('SELECT tipo, dato_da FROM consenso WHERE anziano_id = $1', [anzianoId])
    expect(consenso).toMatchObject({ tipo: 'PRIVACY', dato_da: anna.id })
  })

  it('senza consenso privacy la scheda non si salva', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const c = await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })
    const r = await anna.post(`/api/cerchi/${c.body.id}/anziani`).send({ ...pina, consensoPrivacy: false })
    expect(r.status).toBe(400)
    expect(r.body.messaggio).toContain('consenso')
  })

  it('data di nascita nel futuro: 400', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const c = await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })
    const r = await anna.post(`/api/cerchi/${c.body.id}/anziani`).send({ ...pina, dataNascita: '2999-01-01' })
    expect(r.status).toBe(400)
  })

  it('campi facoltativi vuoti diventano null', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const c = await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })
    const r = await anna.post(`/api/cerchi/${c.body.id}/anziani`).send({ ...pina, dataNascita: '', comune: '  ' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ dataNascita: null, comune: null })
  })

  it('una badante non può creare un cerchio', async () => {
    const maria = await utenteCollegato(app, 'Maria', 'BADANTE')
    const r = await maria.post('/api/cerchi').send({ nome: 'Il mio' })
    expect(r.status).toBe(403)
    expect(r.body.codice).toBe('SOLO_FAMILIARI')
  })

  it('chi non fa parte del cerchio non lo vede (404, non 403)', async () => {
    const { cerchioId, anzianoId } = await cerchioDiAnna()
    const estraneo = await utenteCollegato(app, 'Luca')
    expect((await estraneo.get(`/api/cerchi/${cerchioId}`)).status).toBe(404)
    expect((await estraneo.put(`/api/anziani/${anzianoId}`).send(pina)).status).toBe(404)
    expect((await estraneo.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: 'x@example.com', ruolo: 'FAMILIARE' })).status).toBe(404)
    expect((await estraneo.get('/api/cerchi')).body).toEqual([])
  })

  it('senza login: 401', async () => {
    expect((await request(app).get('/api/cerchi')).status).toBe(401)
    expect((await request(app).post('/api/cerchi').send({ nome: 'x' })).status).toBe(401)
  })

  it('id non numerico nell\'indirizzo: 400', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    expect((await anna.get('/api/cerchi/abc')).status).toBe(400)
  })
})

describe('inviti', () => {
  it('un familiare invitato vede l\'anteprima, accetta ed entra nel cerchio', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'Marco@example.com', 'FAMILIARE')

    // L'anteprima si vede anche senza login.
    const anteprima = await request(app).get(`/api/inviti/token/${token}`)
    expect(anteprima.status).toBe(200)
    expect(anteprima.body).toMatchObject({ cerchio: 'Famiglia Rossi', invitatoDa: 'Anna', ruolo: 'FAMILIARE' })

    const marco = await utenteCollegato(app, 'Marco')
    const r = await marco.post(`/api/inviti/token/${token}/accetta`)
    expect(r.status).toBe(200)
    expect(r.body.cerchioId).toBe(cerchioId)

    const dettaglio = await marco.get(`/api/cerchi/${cerchioId}`)
    expect(dettaglio.body.mioRuolo).toBe('FAMILIARE')
    expect(dettaglio.body.membri).toHaveLength(2)
    expect(dettaglio.body.invitiInAttesa).toEqual([]) // solo l'admin li vede
  })

  it('il token non viene salvato nel database, solo il suo hash', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    const righe = await db.query<{ token_hash: string }>('SELECT token_hash FROM invito')
    expect(righe[0]!.token_hash).not.toContain(token)
    expect(righe[0]!.token_hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('un invito si usa una volta sola', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    const marco = await utenteCollegato(app, 'Marco')
    expect((await marco.post(`/api/inviti/token/${token}/accetta`)).status).toBe(200)
    const ancora = await marco.post(`/api/inviti/token/${token}/accetta`)
    expect(ancora.status).toBe(410)
    expect(ancora.body.codice).toBe('INVITO_GIA_USATO')
  })

  it('va accettato con la stessa email a cui è stato mandato', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    const luca = await utenteCollegato(app, 'Luca')
    const r = await luca.post(`/api/inviti/token/${token}/accetta`)
    expect(r.status).toBe(403)
    expect(r.body.codice).toBe('INVITO_ALTRA_EMAIL')
  })

  it('un invito da badante va accettato con un account da badante', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'marco@example.com', 'BADANTE')
    const marco = await utenteCollegato(app, 'Marco', 'FAMILIARE')
    const r = await marco.post(`/api/inviti/token/${token}/accetta`)
    expect(r.status).toBe(403)
    expect(r.body.codice).toBe('TIPO_ACCOUNT_DIVERSO')
  })

  it('invito scaduto: 410', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    await db.query(`UPDATE invito SET scade_il = now() - interval '1 minute'`)
    const r = await request(app).get(`/api/inviti/token/${token}`)
    expect(r.status).toBe(410)
    expect(r.body.codice).toBe('INVITO_SCADUTO')
  })

  it('token inventato: 404', async () => {
    const r = await request(app).get(`/api/inviti/token/${'a'.repeat(43)}`)
    expect(r.status).toBe(404)
    expect((await request(app).get('/api/inviti/token/corto')).status).toBe(404)
  })

  it('un nuovo invito alla stessa email annulla il precedente; l\'admin può annullarlo', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const vecchio = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    const nuovo = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    expect((await request(app).get(`/api/inviti/token/${vecchio}`)).status).toBe(404)
    expect((await request(app).get(`/api/inviti/token/${nuovo}`)).status).toBe(200)

    const inAttesa = (await anna.get(`/api/cerchi/${cerchioId}`)).body.invitiInAttesa
    expect(inAttesa).toHaveLength(1)
    expect((await anna.delete(`/api/inviti/${inAttesa[0].id}`)).status).toBe(204)
    expect((await request(app).get(`/api/inviti/token/${nuovo}`)).status).toBe(404)
  })

  it('non si invita chi è già nel cerchio', async () => {
    const { anna, cerchioId } = await cerchioDiAnna()
    const r = await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: 'ANNA@example.com', ruolo: 'FAMILIARE' })
    expect(r.status).toBe(409)
  })
})

describe('permessi della badante', () => {
  async function conBadante() {
    const base = await cerchioDiAnna()
    const token = await invita(base.anna, base.cerchioId, 'maria@example.com', 'BADANTE')
    const maria = await utenteCollegato(app, 'Maria', 'BADANTE')
    expect((await maria.post(`/api/inviti/token/${token}/accetta`)).status).toBe(200)
    return { ...base, maria }
  }

  it('vede il cerchio e la scheda dell\'anziano', async () => {
    const { maria, cerchioId } = await conBadante()
    const r = await maria.get(`/api/cerchi/${cerchioId}`)
    expect(r.status).toBe(200)
    expect(r.body.mioRuolo).toBe('BADANTE')
    expect(r.body.anziani[0].nome).toBe('Giuseppina')
  })

  it('non modifica la scheda, non invita, non toglie membri', async () => {
    const { maria, anna, cerchioId, anzianoId } = await conBadante()
    expect((await maria.put(`/api/anziani/${anzianoId}`).send({ ...pina, nome: 'X' })).status).toBe(403)
    expect((await maria.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: 'y@example.com', ruolo: 'BADANTE' })).status).toBe(403)
    expect((await maria.delete(`/api/cerchi/${cerchioId}/membri/${anna.id}`)).status).toBe(403)
    expect((await maria.post(`/api/cerchi/${cerchioId}/anziani`).send(pina)).status).toBe(403)
  })

  it('un familiare invitato può modificare la scheda', async () => {
    const { anna, cerchioId, anzianoId } = await cerchioDiAnna()
    const token = await invita(anna, cerchioId, 'marco@example.com', 'FAMILIARE')
    const marco = await utenteCollegato(app, 'Marco')
    await marco.post(`/api/inviti/token/${token}/accetta`)
    const r = await marco.put(`/api/anziani/${anzianoId}`).send({ ...pina, comune: 'Napoli' })
    expect(r.status).toBe(200)
    expect(r.body.comune).toBe('Napoli')
  })

  it('l\'amministratore può togliere la badante dal cerchio', async () => {
    const { maria, anna, cerchioId } = await conBadante()
    expect((await anna.delete(`/api/cerchi/${cerchioId}/membri/${maria.id}`)).status).toBe(204)
    expect((await maria.get(`/api/cerchi/${cerchioId}`)).status).toBe(404)
    expect((await anna.delete(`/api/cerchi/${cerchioId}/membri/${anna.id}`)).status).toBe(400)
  })
})
