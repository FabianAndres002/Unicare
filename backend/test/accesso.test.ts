// Test automatici di registrazione e login. Ogni test usa un database nuovo, solo in memoria.
// Avvio: npm test

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import { preparaApp } from './aiuti.ts'

let db: Database
let app: Express

beforeEach(async () => {
  ;({ db, app } = await preparaApp())
})

afterEach(async () => {
  await db.chiudi()
})

const mario = {
  email: 'mario.rossi@example.com',
  password: 'unaPasswordLunga',
  nome: 'Mario',
  cognome: 'Rossi',
  tipo: 'FAMILIARE',
}

describe('stato', () => {
  it('risponde con le 13 tabelle create dalle migrazioni', async () => {
    const r = await request(app).get('/api/stato')
    expect(r.status).toBe(200)
    expect(r.body).toEqual({ app: 'Unicare', database: 'ok', tabelle: 13 })
  })

  it('indirizzo sconosciuto: 404 in JSON', async () => {
    const r = await request(app).get('/api/non-esiste')
    expect(r.status).toBe(404)
    expect(r.body.codice).toBe('NON_TROVATO')
  })
})

describe('accesso', () => {
  it('registrazione: crea l\'account e fa entrare subito', async () => {
    const agente = request.agent(app) // ricorda i cookie, come un browser
    const r = await agente.post('/api/auth/registrati').send(mario)
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ email: mario.email, nome: 'Mario', tipo: 'FAMILIARE' })
    expect(r.body.password).toBeUndefined()
    expect(r.headers['set-cookie']?.[0]).toMatch(/unicare_accesso=.*HttpOnly/)

    const io = await agente.get('/api/auth/io')
    expect(io.status).toBe(200)
    expect(io.body.email).toBe(mario.email)
  })

  it('la password è salvata solo come hash bcrypt', async () => {
    await request(app).post('/api/auth/registrati').send(mario)
    const [riga] = await db.query<{ password_hash: string }>('SELECT password_hash FROM utente')
    expect(riga!.password_hash).toMatch(/^\$2/)
    expect(riga!.password_hash).not.toContain(mario.password)
  })

  it('email già usata (anche con maiuscole diverse): 409', async () => {
    await request(app).post('/api/auth/registrati').send(mario)
    const r = await request(app)
      .post('/api/auth/registrati')
      .send({ ...mario, email: 'MARIO.Rossi@example.com' })
    expect(r.status).toBe(409)
    expect(r.body.codice).toBe('EMAIL_GIA_USATA')
  })

  it('password troppo corta: 400 con il campo indicato', async () => {
    const r = await request(app).post('/api/auth/registrati').send({ ...mario, password: 'corta' })
    expect(r.status).toBe(400)
    expect(r.body.codice).toBe('DATI_NON_VALIDI')
    expect(r.body.messaggio).toContain('password')
  })

  it('login corretto', async () => {
    await request(app).post('/api/auth/registrati').send(mario)
    const agente = request.agent(app)
    const r = await agente.post('/api/auth/login').send({ email: 'Mario.Rossi@example.com', password: mario.password })
    expect(r.status).toBe(200)
    expect(r.body.email).toBe(mario.email)
    expect((await agente.get('/api/auth/io')).status).toBe(200)
  })

  it('password sbagliata ed email inesistente danno lo stesso errore', async () => {
    await request(app).post('/api/auth/registrati').send(mario)
    const sbagliata = await request(app).post('/api/auth/login').send({ email: mario.email, password: 'sbagliata!' })
    const inesistente = await request(app).post('/api/auth/login').send({ email: 'nessuno@example.com', password: 'sbagliata!' })
    expect(sbagliata.status).toBe(401)
    expect(inesistente.status).toBe(401)
    expect(sbagliata.body).toEqual(inesistente.body)
    expect(sbagliata.body.codice).toBe('CREDENZIALI_ERRATE')
  })

  it('senza login "chi sono" risponde 401', async () => {
    const r = await request(app).get('/api/auth/io')
    expect(r.status).toBe(401)
    expect(r.body.codice).toBe('NON_AUTENTICATO')
  })

  it('cookie manomesso: 401', async () => {
    const r = await request(app).get('/api/auth/io').set('Cookie', 'unicare_accesso=finto.token.manomesso')
    expect(r.status).toBe(401)
  })

  it('logout: dopo non si è più collegati', async () => {
    const agente = request.agent(app)
    await agente.post('/api/auth/registrati').send(mario)
    expect((await agente.post('/api/auth/logout')).status).toBe(204)
    expect((await agente.get('/api/auth/io')).status).toBe(401)
  })

  it('JSON malformato: 400 leggibile', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{rotto')
    expect(r.status).toBe(400)
    expect(r.body.codice).toBe('RICHIESTA_ILLEGGIBILE')
  })

  it('un form di un altro sito (non JSON) viene rifiutato', async () => {
    const r = await request(app).post('/api/auth/login').type('form').send({ email: mario.email, password: mario.password })
    expect(r.status).toBe(400)
  })
})
