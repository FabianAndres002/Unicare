// Notifiche ed email nella lingua di chi le riceve.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import type { Email } from '../src/notifiche/postino.ts'
import type { MessaggioPush } from '../src/notifiche/push.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'
import { quando, tr } from '../src/comune/testi.ts'

let db: Database
let app: Express
let posta: () => Promise<Email[]>
let notifiche: () => Promise<{ endpoint: string; messaggio: MessaggioPush }[]>

beforeEach(async () => {
  ;({ db, app, posta, notifiche } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

const iscrizione = (nome: string) => ({ endpoint: `https://push.example/${nome}`, keys: { p256dh: 'chiave-' + nome, auth: 'auth-' + nome } })

describe('testi tradotti', () => {
  it('tr traduce anche i pezzi dentro la frase, e lascia l’italiano se manca', () => {
    const f = tr('{0} ha chiesto {1} dal suo telefono.', 'Pina', tr('la spesa'))
    expect(f('it')).toBe('Pina ha chiesto la spesa dal suo telefono.')
    expect(f('en')).toBe('Pina asked for the shopping from their phone.')
    expect(f('ro')).toBe('Pina a cerut cumpărăturile de pe telefonul său.')
    expect(tr('Frase che non esiste')('ro')).toBe('Frase che non esiste')
    expect(quando('2026-11-18T09:30:00Z')('it')).toBe('mercoledì 18 novembre alle 10:30')
    expect(quando('2026-11-18T09:30:00Z')('en')).toBe('Wednesday 18 November at 10:30')
  })
})

describe('avvisi nella lingua di ciascuno', () => {
  it('email e push: Anna in italiano, Elena (badante) in rumeno, il telefono della nonna in spagnolo', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
    const anzianoId = (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id as number
    const { token } = (await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: 'elena@example.com', ruolo: 'BADANTE' })).body
    const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
    await elena.post(`/api/inviti/token/${token}/accetta`).expect(200)
    await elena.patch('/api/auth/io').send({ lingua: 'ro' }).expect(200)
    await anna.post('/api/push/iscrizione').send(iscrizione('anna')).expect(204)
    await elena.post('/api/push/iscrizione').send(iscrizione('elena')).expect(204)

    const { codice } = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body
    const nonna = request.agent(app)
    await nonna.post('/api/senior/collega').send({ codice }).expect(204)
    await nonna.post('/api/senior/push').send(iscrizione('nonna')).expect(204)
    expect((await nonna.get('/api/senior/io')).body.lingua).toBe('it')
    await nonna.put('/api/senior/lingua').send({ lingua: 'xx' }).expect(400)
    await nonna.put('/api/senior/lingua').send({ lingua: 'es' }).expect(204)
    expect((await nonna.get('/api/senior/io')).body.lingua).toBe('es')

    // La nonna chiede la spesa dal telefono: avvisati Anna (it) ed Elena (ro).
    await nonna.post('/api/senior/richieste').send({ categoria: 'SPESA' }).expect(201)
    const email = await posta()
    const perAnna = email.find((e) => e.a === 'anna@example.com')!
    const perElena = email.find((e) => e.a === 'elena@example.com')!
    expect(perAnna.oggetto).toBe('Pina chiede aiuto: la spesa')
    expect(perElena.oggetto).toBe('Pina cere ajutor: cumpărăturile')
    expect(perElena.html).toContain('lang="ro"')
    expect(perElena.html).toContain('Deschide în Unicare')
    expect(perElena.testo).toContain('Bună Elena,')
    const push = await notifiche()
    expect(push.find((n) => n.endpoint.endsWith('/anna'))!.messaggio.titolo).toBe('Pina chiede aiuto: la spesa')
    expect(push.find((n) => n.endpoint.endsWith('/elena'))!.messaggio.titolo).toBe('Pina cere ajutor: cumpărăturile')

    // Elena se ne occupa: la nonna riceve la notifica in spagnolo.
    const id = (await nonna.get('/api/senior/io')).body.richieste[0].id
    await elena.post(`/api/richieste/${id}/prendi`).expect(200)
    await posta()
    const perNonna = (await notifiche()).filter((n) => n.endpoint.endsWith('/nonna'))
    expect(perNonna.at(-1)!.messaggio).toMatchObject({ titolo: 'Elena se encarga', testo: 'Para la compra.' })
  })
})
