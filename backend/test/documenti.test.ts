// Test della settimana 8: documenti sanitari e privacy (limite login, scarica dati, cancellazioni).

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

// File finti con i primi byte giusti.
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 1)])
const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(500, 2)])
const HTML = Buffer.from('<html><script>alert(1)</script></html>          ')

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
  return { anna, marco, maria, cerchioId, anzianoId }
}

const carica = (u: request.Agent, anzianoId: number, file: Buffer, q: Record<string, string>) =>
  u.post(`/api/anziani/${anzianoId}/documenti?${new URLSearchParams(q)}`).set('Content-Type', 'application/octet-stream').send(file)

describe('documenti sanitari', () => {
  it('serve il consenso la prima volta, poi si caricano foto e PDF', async () => {
    const { anna, marco, anzianoId } = await famiglia()
    const base = { categoria: 'ANALISI', titolo: 'Analisi del sangue', data: '2026-10-02', nome: 'analisi.pdf' }
    const senza = await carica(anna, anzianoId, PDF, base).expect(400)
    expect(senza.body.codice).toBe('CONSENSO_MANCANTE')

    await carica(anna, anzianoId, PDF, { ...base, consenso: 'true' }).expect(201)
    // Il consenso è registrato: Marco non deve ridarlo.
    await carica(marco, anzianoId, JPEG, { categoria: 'IMMAGINI', titolo: 'Ecografia addome', data: '2026-09-15', nome: 'eco.jpg', note: 'Tutto nella norma' }).expect(201)

    const a = (await anna.get(`/api/anziani/${anzianoId}/documenti`).expect(200)).body
    expect(a.consenso).toBe(true)
    expect(a.documenti.map((d: { titolo: string }) => d.titolo)).toEqual(['Analisi del sangue', 'Ecografia addome'])
    expect(a.documenti[1]).toMatchObject({ categoria: 'IMMAGINI', tipoFile: 'image/jpeg', nomeFile: 'eco.jpg', note: 'Tutto nella norma', caricatoDa: 'Marco' })

    const f = await anna.get(`/api/documenti/${a.documenti[0].id}/file`).expect(200)
    expect(f.headers['content-type']).toContain('application/pdf')
    expect(f.headers['content-disposition']).toContain('attachment')
    expect(f.headers['content-security-policy']).toContain('sandbox')
  })

  it('accetta solo foto e PDF veri, guardando dentro il file', async () => {
    const { anna, anzianoId } = await famiglia()
    const q = { categoria: 'ALTRO', titolo: 'Prova', data: '2026-11-01', nome: 'finto.pdf', consenso: 'true' }
    expect((await carica(anna, anzianoId, HTML, q).expect(400)).body.codice).toBe('FILE_NON_ACCETTATO')
    expect((await carica(anna, anzianoId, Buffer.alloc(0), q).expect(400)).body.codice).toBe('FILE_MANCANTE')
    await carica(anna, anzianoId, Buffer.concat([PDF, Buffer.alloc(11 * 1024 * 1024)]), q).expect(413)
    await carica(anna, anzianoId, PDF, { ...q, categoria: 'SEGRETO' }).expect(400)
  })

  it('la badante e chi è fuori dal cerchio non vedono i documenti', async () => {
    const { anna, maria, anzianoId } = await famiglia()
    await carica(anna, anzianoId, PDF, { categoria: 'PRESCRIZIONE', titolo: 'Ricetta', data: '2026-11-01', consenso: 'true' }).expect(201)
    const [{ id }] = await db.query<{ id: number }>('SELECT id FROM documento')
    await maria.get(`/api/anziani/${anzianoId}/documenti`).expect(403)
    await maria.get(`/api/documenti/${id}/file`).expect(403)
    const estraneo = await utenteCollegato(app, 'Estraneo')
    await estraneo.get(`/api/anziani/${anzianoId}/documenti`).expect(404)
    await estraneo.get(`/api/documenti/${id}/file`).expect(404)
    await estraneo.delete(`/api/documenti/${id}`).expect(404)
  })

  it('le ricevute sommano le spese mediche dell’anno; si modifica e si toglie', async () => {
    const { anna, anzianoId } = await famiglia()
    const anno = new Date().getFullYear()
    await carica(anna, anzianoId, JPEG, { categoria: 'RICEVUTA', titolo: 'Ticket visita', data: `${anno}-03-01`, importo: '3615', consenso: 'true' }).expect(201)
    await carica(anna, anzianoId, JPEG, { categoria: 'RICEVUTA', titolo: 'Farmacia', data: `${anno}-05-10`, importo: '1250' }).expect(201)
    await carica(anna, anzianoId, JPEG, { categoria: 'RICEVUTA', titolo: 'Anno scorso', data: `${anno - 1}-12-30`, importo: '9900' }).expect(201)
    // L'importo conta solo per le ricevute.
    await carica(anna, anzianoId, PDF, { categoria: 'REFERTO', titolo: 'Referto', data: `${anno}-05-10`, importo: '5000' }).expect(201)

    let a = (await anna.get(`/api/anziani/${anzianoId}/documenti`)).body
    expect(a.speseAnno).toEqual({ anno, centesimi: 4865 })
    const farmacia = a.documenti.find((d: { titolo: string }) => d.titolo === 'Farmacia')

    const cambiato = (await anna.patch(`/api/documenti/${farmacia.id}`).send({ titolo: 'Farmacia (scontrino)', importo: 1300 }).expect(200)).body
    expect(cambiato).toMatchObject({ titolo: 'Farmacia (scontrino)', importoCentesimi: 1300 })
    await anna.delete(`/api/documenti/${farmacia.id}`).expect(204)
    a = (await anna.get(`/api/anziani/${anzianoId}/documenti`)).body
    expect(a.speseAnno.centesimi).toBe(3615)
    expect(a.documenti).toHaveLength(3)
  })
})

describe('privacy', () => {
  it('dopo 10 password sbagliate il login si blocca per 15 minuti', async () => {
    await utenteCollegato(app, 'Anna')
    const prova = (password: string) => request(app).post('/api/auth/login').send({ email: 'anna@example.com', password })
    for (let i = 0; i < 10; i++) await prova('sbagliata').expect(401)
    const bloccato = await prova('unaPasswordLunga').expect(429)
    expect(bloccato.body.messaggio).toMatch(/Riprova tra 15 minuti/)
  })

  it('"Scarica i miei dati" contiene il profilo e cosa ho fatto, mai la password', async () => {
    const { marco, cerchioId, anzianoId } = await famiglia()
    await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'SPESA' }).expect(201)
    const r = await marco.get('/api/auth/io/dati').expect(200)
    expect(r.headers['content-disposition']).toContain('unicare-i-miei-dati.json')
    expect(r.body.profilo).toMatchObject({ email: 'marco@example.com', nome: 'Marco' })
    expect(r.body.cerchi).toEqual([expect.objectContaining({ nome: 'Famiglia Rossi', ruolo: 'FAMILIARE' })])
    expect(r.body.richiesteCreate).toHaveLength(1)
    expect(JSON.stringify(r.body)).not.toMatch(/password|\$2[aby]\$/)
  })

  it('cancellare l’account: serve la password; se amministravo, il ruolo passa a un familiare', async () => {
    const { anna, marco, cerchioId } = await famiglia()
    await anna.delete('/api/auth/io').send({ password: 'sbagliata' }).expect(403)
    await anna.delete('/api/auth/io').send({ password: 'unaPasswordLunga' }).expect(204)
    await anna.get('/api/auth/io').expect(401)
    await request(app).post('/api/auth/login').send({ email: 'anna@example.com', password: 'unaPasswordLunga' }).expect(401)

    const c = (await marco.get(`/api/cerchi/${cerchioId}`).expect(200)).body
    expect(c.mioRuolo).toBe('ADMIN')
    expect(c.anziani).toHaveLength(1)
    expect(c.membri.map((m: { nome: string }) => m.nome).sort()).toEqual(['Marco', 'Maria'])
  })

  it('se non resta nessun familiare, il cerchio si cancella con tutti i dati', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Solo Anna' })).body.id as number
    await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true }).expect(201)
    await anna.delete('/api/auth/io').send({ password: 'unaPasswordLunga' }).expect(204)
    expect(await db.query('SELECT 1 FROM cerchio')).toHaveLength(0)
    expect(await db.query('SELECT 1 FROM anziano')).toHaveLength(0)
    expect(await db.query('SELECT 1 FROM consenso')).toHaveLength(0)
  })

  it('l’amministratore cancella la scheda dell’anziano e tutto quello che la riguarda', async () => {
    const { anna, marco, anzianoId } = await famiglia()
    await carica(anna, anzianoId, PDF, { categoria: 'REFERTO', titolo: 'Referto', data: '2026-11-01', consenso: 'true' }).expect(201)
    await marco.delete(`/api/anziani/${anzianoId}`).expect(403)
    await anna.delete(`/api/anziani/${anzianoId}`).expect(204)
    expect(await db.query('SELECT 1 FROM documento')).toHaveLength(0)
    expect(await db.query('SELECT 1 FROM anziano')).toHaveLength(0)
  })
})
