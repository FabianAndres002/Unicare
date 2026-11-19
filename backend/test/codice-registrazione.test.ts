// Codice segreto per registrarsi (CODICE_REGISTRAZIONE), per la prova in famiglia via tunnel.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Database } from '../src/db/db.ts'
import { config } from '../src/config.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Awaited<ReturnType<typeof preparaApp>>['app']

beforeEach(async () => {
  ;({ db, app } = await preparaApp())
})
afterEach(async () => {
  config.codiceRegistrazione = ''
  await db.chiudi()
})

const dati = (email: string, extra: object = {}) => ({ email, password: 'unaPasswordLunga', nome: 'Zia', cognome: 'Rosa', tipo: 'FAMILIARE', ...extra })

describe('codice per registrarsi', () => {
  it('senza codice nel .env la registrazione è libera', async () => {
    expect((await request(app).get('/api/auth/registrazione')).body).toEqual({ serveCodice: false })
    await request(app).post('/api/auth/registrati').send(dati('a@example.com')).expect(201)
  })

  it('con il codice: serve quello giusto (maiuscole indifferenti)', async () => {
    config.codiceRegistrazione = 'Nonna2026'
    expect((await request(app).get('/api/auth/registrazione')).body).toEqual({ serveCodice: true })
    const senza = await request(app).post('/api/auth/registrati').send(dati('a@example.com')).expect(403)
    expect(senza.body.codice).toBe('CODICE_REGISTRAZIONE')
    await request(app).post('/api/auth/registrati').send(dati('a@example.com', { codice: 'sbagliato' })).expect(403)
    await request(app).post('/api/auth/registrati').send(dati('a@example.com', { codice: ' nonna2026 ' })).expect(201)
  })

  it('chi arriva da un invito non ha bisogno del codice, ma solo con la sua email', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    config.codiceRegistrazione = 'nonna2026'
    const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia' })).body.id
    const { token } = (await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: 'zia@example.com', ruolo: 'FAMILIARE' })).body
    await request(app).post('/api/auth/registrati').send(dati('altra@example.com', { invito: token })).expect(403)
    await request(app).post('/api/auth/registrati').send(dati('zia@example.com', { invito: 'non-esiste' })).expect(403)
    await request(app).post('/api/auth/registrati').send(dati('zia@example.com', { invito: token })).expect(201)
  })
})
