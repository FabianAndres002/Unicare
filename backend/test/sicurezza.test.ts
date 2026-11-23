// Difese contro gli attacchi più comuni: chi tempesta il server, chi crea account in massa,
// chi prova password o codici da tanti indirizzi diversi, password troppo facili.

import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { apriDatabaseIntegrato } from '../src/db/db.ts'
import { eseguiMigrazioni } from '../src/db/migrazioni.ts'
import { creaApp } from '../src/app.ts'
import { postinoMemoria } from '../src/notifiche/postino.ts'
import { spingitoreMemoria } from '../src/notifiche/push.ts'
import { creaServizioTelefono } from '../src/senior/telefono.service.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

async function appConLimiti(limiti: { richiesteMinuto?: number; registrazioniOra?: number }) {
  const db = await apriDatabaseIntegrato()
  await eseguiMigrazioni(db, () => {})
  const app = creaApp(db, { postino: postinoMemoria(), spingitore: spingitoreMemoria(), traduttore: null, limiti })
  // Come online dietro il proxy: l'indirizzo vero arriva in X-Forwarded-For.
  app.set('trust proxy', true)
  return app
}

const nuovoUtente = (n: number, password = 'unaPasswordLunga') => ({
  email: `persona${n}@example.com`, password, nome: 'Persona', cognome: String(n), tipo: 'FAMILIARE',
})

describe('sicurezza', () => {
  it('troppe chiamate dallo stesso indirizzo: 429, gli altri continuano', async () => {
    const app = await appConLimiti({ richiesteMinuto: 5 })
    for (let i = 0; i < 5; i++) await request(app).get('/api/stato').set('X-Forwarded-For', '1.1.1.1').expect(200)
    const r = await request(app).get('/api/stato').set('X-Forwarded-For', '1.1.1.1').expect(429)
    expect(r.body.codice).toBe('TROPPE_RICHIESTE')
    await request(app).get('/api/stato').set('X-Forwarded-For', '2.2.2.2').expect(200)
  })

  it('non si creano account in massa dalla stessa rete', async () => {
    const app = await appConLimiti({ registrazioniOra: 2 })
    for (let i = 0; i < 2; i++) await request(app).post('/api/auth/registrati').set('X-Forwarded-For', '3.3.3.3').send(nuovoUtente(i)).expect(201)
    const r = await request(app).post('/api/auth/registrati').set('X-Forwarded-For', '3.3.3.3').send(nuovoUtente(9)).expect(429)
    expect(r.body.codice).toBe('TROPPE_REGISTRAZIONI')
    await request(app).post('/api/auth/registrati').set('X-Forwarded-For', '4.4.4.4').send(nuovoUtente(10)).expect(201)
  })

  it('password troppo facili rifiutate', async () => {
    const { app } = await preparaApp()
    for (const p of ['12345678', 'Password', 'aaaaaaaaa', 'qwertyuiop', 'abcdefgh']) {
      const r = await request(app).post('/api/auth/registrati').send(nuovoUtente(1, p)).expect(400)
      expect(r.body.messaggio).toContain('troppo facile')
    }
    await request(app).post('/api/auth/registrati').send(nuovoUtente(1, 'Gatto-Blu-2026')).expect(201)
  })

  it('password provate su un account da tanti indirizzi: blocco per quell’account', async () => {
    const app = await appConLimiti({})
    await request(app).post('/api/auth/registrati').send(nuovoUtente(1)).expect(201)
    for (let i = 0; i < 10; i++) {
      await request(app).post('/api/auth/login').set('X-Forwarded-For', `10.0.0.${i}`)
        .send({ email: 'persona1@example.com', password: 'sbagliata!' }).expect(401)
    }
    // Anche con la password giusta, da un indirizzo nuovo, per ora no.
    await request(app).post('/api/auth/login').set('X-Forwarded-For', '10.0.1.1')
      .send({ email: 'PERSONA1@example.com', password: 'unaPasswordLunga' }).expect(429)
    // Un altro account non è toccato.
    await request(app).post('/api/auth/registrati').send(nuovoUtente(2)).expect(201)
    await request(app).post('/api/auth/login').set('X-Forwarded-For', '10.0.1.1')
      .send({ email: 'persona2@example.com', password: 'unaPasswordLunga' }).expect(200)
  })

  it('codici del telefono provati da tanti indirizzi: pausa per tutti', async () => {
    const { db, app } = await preparaApp()
    const anna = await utenteCollegato(app, 'Anna')
    const cerchio = await anna.post('/api/cerchi').send({ nome: 'Famiglia' }).expect(201)
    const anziano = await anna.post(`/api/cerchi/${cerchio.body.id}/anziani`).send({ nome: 'Luigi', cognome: 'Rossi', consensoPrivacy: true })
    expect(anziano.status).toBeLessThan(300)
    const { codice } = (await anna.post(`/api/anziani/${anziano.body.id}/telefono/codice`)).body
    const telefono = creaServizioTelefono(db)
    const sbagliato = codice === '000000' ? '000001' : '000000'
    for (let i = 0; i < 30; i++) await expect(telefono.collega(sbagliato, `ip${i}`)).rejects.toMatchObject({ stato: 400 })
    // Ora nemmeno il codice giusto passa, da nessun indirizzo: chi attacca non può continuare.
    await expect(telefono.collega(codice, 'ip-nuovo')).rejects.toMatchObject({ stato: 429, codice: 'TROPPI_TENTATIVI_TOTALI' })
  })

  it('un cookie firmato con un altro metodo non vale', async () => {
    const { app } = await preparaApp()
    const finto = Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') + '.' + Buffer.from('{"sub":"1"}').toString('base64url') + '.'
    await request(app).get('/api/auth/io').set('Cookie', `unicare_accesso=${finto}`).expect(401)
  })

  it('"Esci dagli altri telefoni": il telefono rubato perde accesso e notifiche, questo resta dentro', async () => {
    const { db, app } = await preparaApp()
    await request(app).post('/api/auth/registrati').send(nuovoUtente(1)).expect(201)
    const entra = async () => {
      const a = request.agent(app)
      await a.post('/api/auth/login').send({ email: 'persona1@example.com', password: 'unaPasswordLunga' }).expect(200)
      return a
    }
    const mio = await entra()
    const rubato = await entra()
    const chiavi = { p256dh: 'x', auth: 'y' }
    await mio.post('/api/push/iscrizione').send({ endpoint: 'https://push.example.com/mio', keys: chiavi }).expect(204)
    await rubato.post('/api/push/iscrizione').send({ endpoint: 'https://push.example.com/rubato', keys: chiavi }).expect(204)

    await mio.post('/api/auth/esci-ovunque').send({ endpoint: 'https://push.example.com/mio' }).expect(204)

    await mio.get('/api/auth/io').expect(200)
    await rubato.get('/api/auth/io').expect(401)
    const iscrizioni = await db.query<{ endpoint: string }>('SELECT endpoint FROM iscrizione_push')
    expect(iscrizioni.map((i) => i.endpoint)).toEqual(['https://push.example.com/mio'])
    // Rientrando con la password si torna dentro normalmente.
    const dinuovo = await entra()
    await dinuovo.get('/api/auth/io').expect(200)
  })
})
