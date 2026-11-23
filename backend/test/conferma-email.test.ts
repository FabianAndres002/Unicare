// Conferma dell'email con un codice e "password dimenticata".

import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { apriDatabaseIntegrato } from '../src/db/db.ts'
import { eseguiMigrazioni } from '../src/db/migrazioni.ts'
import { creaApp } from '../src/app.ts'
import { postinoMemoria } from '../src/notifiche/postino.ts'
import { spingitoreMemoria } from '../src/notifiche/push.ts'

async function prepara(confermaEmail: boolean) {
  const db = await apriDatabaseIntegrato()
  await eseguiMigrazioni(db, () => {})
  const postino = postinoMemoria()
  const app = creaApp(db, { postino, spingitore: spingitoreMemoria(), traduttore: null, confermaEmail })
  /** Il codice nell'ultima email arrivata a questo indirizzo. */
  const codice = (a: string) => {
    const e = postino.posta.filter((m) => m.a === a).at(-1)
    return e?.testo.match(/\b\d{6}\b/)?.[0]
  }
  return { app, postino, codice }
}

const anna = { email: 'anna@example.com', password: 'unaPasswordLunga', nome: 'Anna', cognome: 'Rossi', tipo: 'FAMILIARE' }

describe('conferma dell’email', () => {
  it('dopo la registrazione serve il codice; prima si può solo confermare', async () => {
    const { app, codice } = await prepara(true)
    const a = request.agent(app)
    const r = await a.post('/api/auth/registrati').send(anna).expect(201)
    expect(r.body).toMatchObject({ emailConfermata: false, daConfermare: true })
    const giusto = codice('anna@example.com')
    expect(giusto).toMatch(/^\d{6}$/)

    expect((await a.get('/api/auth/io').expect(200)).body.daConfermare).toBe(true)
    expect((await a.get('/api/cerchi').expect(403)).body.codice).toBe('EMAIL_DA_CONFERMARE')

    const sbagliato = giusto === '000000' ? '000001' : '000000'
    await a.post('/api/auth/conferma-email').send({ codice: sbagliato }).expect(400)
    const ok = await a.post('/api/auth/conferma-email').send({ codice: giusto }).expect(200)
    expect(ok.body).toMatchObject({ emailConfermata: true, daConfermare: false })
    await a.get('/api/cerchi').expect(200)
    // Il codice si usa una volta sola.
    await a.post('/api/auth/conferma-email').send({ codice: giusto }).expect(400)
  })

  it('un codice nuovo sostituisce il vecchio; dopo 5 errori il codice non vale più', async () => {
    const { app, codice } = await prepara(true)
    const a = request.agent(app)
    await a.post('/api/auth/registrati').send(anna).expect(201)
    const primo = codice('anna@example.com')!
    await a.post('/api/auth/conferma-email/reinvia').expect(204)
    const secondo = codice('anna@example.com')!
    if (primo !== secondo) await a.post('/api/auth/conferma-email').send({ codice: primo }).expect(400)
    const sbagliato = secondo === '000000' ? '000001' : '000000'
    for (let i = 0; i < 5; i++) await a.post('/api/auth/conferma-email').send({ codice: sbagliato })
    await a.post('/api/auth/conferma-email').send({ codice: secondo }).expect(400)
  })

  it('spenta (nessuna email vera): si entra subito come prima', async () => {
    const { app, postino } = await prepara(false)
    const a = request.agent(app)
    const r = await a.post('/api/auth/registrati').send(anna).expect(201)
    expect(r.body.daConfermare).toBe(false)
    await a.get('/api/cerchi').expect(200)
    expect(postino.posta).toHaveLength(0)
  })
})

describe('password dimenticata', () => {
  it('codice per email, nuova password, gli accessi vecchi chiusi', async () => {
    const { app, codice } = await prepara(false)
    const vecchio = request.agent(app)
    await vecchio.post('/api/auth/registrati').send(anna).expect(201)

    await request(app).post('/api/auth/password-dimenticata').send({ email: 'ANNA@example.com' }).expect(204)
    // Per un'email che non esiste la risposta è la stessa, ma non parte nulla.
    await request(app).post('/api/auth/password-dimenticata').send({ email: 'nessuno@example.com' }).expect(204)
    await new Promise((r) => setTimeout(r, 50))
    const c = codice('anna@example.com')!
    expect(c).toMatch(/^\d{6}$/)
    expect(codice('nessuno@example.com')).toBeUndefined()

    const nuovo = request.agent(app)
    await nuovo.post('/api/auth/nuova-password').send({ email: 'anna@example.com', codice: c, password: '12345678' }).expect(400)
    const r = await nuovo.post('/api/auth/nuova-password').send({ email: 'anna@example.com', codice: c, password: 'Gatto-Blu-2026' }).expect(200)
    expect(r.body).toMatchObject({ email: 'anna@example.com', emailConfermata: true })
    await nuovo.get('/api/auth/io').expect(200)
    await vecchio.get('/api/auth/io').expect(401)

    await request(app).post('/api/auth/login').send({ email: 'anna@example.com', password: 'unaPasswordLunga' }).expect(401)
    await request(app).post('/api/auth/login').send({ email: 'anna@example.com', password: 'Gatto-Blu-2026' }).expect(200)
    // Lo stesso codice non vale due volte.
    await request(app).post('/api/auth/nuova-password').send({ email: 'anna@example.com', codice: c, password: 'Altra-Password-9' }).expect(400)
  })
})
