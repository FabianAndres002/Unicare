// Test della settimana 10: "cerco una badante", le badanti si propongono, la famiglia sceglie.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import type { MessaggioPush } from '../src/notifiche/push.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Express
let notifiche: () => Promise<{ endpoint: string; messaggio: MessaggioPush }[]>

beforeEach(async () => {
  ;({ db, app, notifiche } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

const profilo = (extra: Record<string, unknown> = {}) => ({
  presentazione: 'Sono una persona paziente, lavoro con anziani da otto anni e mi piace cucinare.',
  provincia: 'CE', comune: 'Caserta', zone: null, anniEsperienza: 8, lingue: 'Italiano',
  servizi: ['COMPAGNIA', 'PASTI'], disponibilita: ['A_ORE'], tariffaOrariaCentesimi: 1000, automunita: true, visibile: true,
  ...extra,
})

const ricerca = (extra: Record<string, unknown> = {}) => ({
  provincia: 'ce', comune: 'Caserta',
  descrizione: 'Cerchiamo una persona per tenere compagnia a mia madre e prepararle il pranzo.',
  orario: 'dal lunedì al venerdì, 9-13', servizi: ['COMPAGNIA', 'PASTI'], disponibilita: ['A_ORE'],
  ...extra,
})

const iscrivi = (u: Awaited<ReturnType<typeof utenteCollegato>>, nome: string) =>
  u.post('/api/push/iscrizione').send({ endpoint: `https://push.example/${nome}`, keys: { p256dh: 'p', auth: 'a' } }).expect(204)

async function scena() {
  const anna = await utenteCollegato(app, 'Anna')
  const marco = await utenteCollegato(app, 'Marco')
  const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
  const sara = await utenteCollegato(app, 'Sara', 'BADANTE')
  const lucia = await utenteCollegato(app, 'Lucia', 'BADANTE')
  for (const [u, n] of [[anna, 'anna'], [elena, 'elena'], [sara, 'sara'], [lucia, 'lucia']] as const) await iscrivi(u, n)
  const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
  await elena.put('/api/badante/profilo').send(profilo()).expect(204)
  // Sara ha il profilo ma non si propone in vetrina; Lucia è a Napoli.
  await sara.put('/api/badante/profilo').send(profilo({ visibile: false })).expect(204)
  await lucia.put('/api/badante/profilo').send(profilo({ provincia: 'NA', comune: 'Napoli' })).expect(204)
  return { anna, marco, elena, sara, lucia, cerchioId }
}

describe('la famiglia pubblica cosa cerca', () => {
  it('solo i familiari del cerchio; avvisa le badanti della provincia che si propongono', async () => {
    const { anna, marco, elena, cerchioId } = await scena()
    await marco.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(404)
    await elena.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(404)
    const corta = await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca({ descrizione: 'aiuto' })).expect(400)
    expect(corta.body.codice).toBe('DATI_NON_VALIDI')
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body

    const arrivate = await notifiche()
    expect(arrivate.map((n) => n.endpoint)).toEqual(['https://push.example/elena'])
    expect(arrivate[0]!.messaggio).toMatchObject({ titolo: 'Una famiglia cerca una badante a Caserta', url: `/lavoro/ricerche/${id}` })

    const lista = (await anna.get(`/api/cerchi/${cerchioId}/ricerche-badante`).expect(200)).body
    expect(lista).toEqual([expect.objectContaining({ id, comune: 'Caserta', provincia: 'CE', creataDa: 'Anna', nuove: 0, proposte: 0, chiusa: false })])
  })

  it('al massimo 3 ricerche aperte per cerchio', async () => {
    const { anna, cerchioId } = await scena()
    for (let i = 0; i < 3; i++) await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)
    const r = await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(429)
    expect(r.body.codice).toBe('TROPPE_RICERCHE')
  })
})

describe('le badanti vedono chi cerca e si propongono', () => {
  it('senza nomi della famiglia; nella propria provincia', async () => {
    const { anna, elena, lucia, cerchioId } = await scena()
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body
    const perElena = (await elena.get('/api/lavoro/ricerche').expect(200)).body
    expect(perElena.provincia).toBe('CE')
    expect(perElena.ricerche).toEqual([expect.objectContaining({ id, comune: 'Caserta', miaProposta: null })])
    const testo = JSON.stringify(perElena)
    expect(testo).not.toContain('Rossi')
    expect(testo).not.toContain('Anna')
    expect((await lucia.get('/api/lavoro/ricerche').expect(200)).body.ricerche).toEqual([])
    expect((await lucia.get('/api/lavoro/ricerche?provincia=ce').expect(200)).body.ricerche).toHaveLength(1)
    await anna.get('/api/lavoro/ricerche').expect(403)
  })

  it('si propone, la famiglia riceve l\'avviso e vede il profilo', async () => {
    const { anna, elena, sara, cerchioId } = await scena()
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body
    const senzaProfilo = await utenteCollegato(app, 'Nina', 'BADANTE')
    expect((await senzaProfilo.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, sono disponibile la mattina.' }).expect(400)).body.codice).toBe('PROFILO_MANCANTE')

    await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, abito a Caserta e la mattina sono libera.' }).expect(201)
    expect((await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, abito a Caserta e la mattina sono libera.' }).expect(409)).body.codice).toBe('GIA_PROPOSTA')
    // Sara non è in vetrina, ma può proporsi: la famiglia vede comunque il suo profilo.
    await sara.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Salve, ho esperienza con persone anziane e cucino volentieri.' }).expect(201)

    const perAnna = (await notifiche()).filter((n) => n.endpoint.endsWith('/anna'))
    expect(perAnna.map((n) => n.messaggio.titolo)).toEqual(['Elena si propone come badante', 'Sara si propone come badante'])
    expect(perAnna[0]!.messaggio.url).toBe(`/cerco-badante/${id}`)

    const d = (await anna.get(`/api/ricerche-badante/${id}`).expect(200)).body
    expect(d.ricerca).toMatchObject({ id, nuove: 2, proposte: 2 })
    expect(d.proposte).toHaveLength(2)
    expect(d.proposte[0]).toMatchObject({ stato: 'INVIATA', badante: { id: elena.id, nome: 'Elena', cognome: 'P.', anniEsperienza: 8 } })
    expect(JSON.stringify(d)).not.toContain('@')

    const mie = (await elena.get('/api/lavoro/proposte').expect(200)).body
    expect(mie).toEqual([expect.objectContaining({ stato: 'INVIATA', ricerca: expect.objectContaining({ id, comune: 'Caserta' }) })])
    expect((await elena.get('/api/lavoro/ricerche')).body.ricerche[0].miaProposta).toMatchObject({ stato: 'INVIATA' })
  })

  it('la badante può ritirare la proposta finché la famiglia non ha risposto', async () => {
    const { anna, elena, cerchioId } = await scena()
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body
    const p = (await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, abito a Caserta e la mattina sono libera.' }).expect(201)).body
    await elena.post(`/api/lavoro/proposte/${p.id}/ritira`).expect(204)
    expect((await anna.get(`/api/ricerche-badante/${id}`)).body.proposte).toEqual([])
    expect((await elena.get('/api/lavoro/proposte')).body).toEqual([])
    // Ci ripensa di nuovo: può riproporsi.
    await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Scusate, sono di nuovo disponibile la mattina.' }).expect(201)
    expect((await anna.get(`/api/ricerche-badante/${id}`)).body.proposte).toHaveLength(1)
  })
})

describe('la famiglia sceglie', () => {
  it('"Scrivile" apre la conversazione con la proposta come primo messaggio', async () => {
    const { anna, elena, cerchioId } = await scena()
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body
    const p = (await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, abito a Caserta e la mattina sono libera.' }).expect(201)).body
    const { contattoId } = (await anna.post(`/api/proposte/${p.id}/scegli`).send({ testo: 'Grazie Elena! Possiamo sentirci domani?' }).expect(201)).body

    const perElena = (await notifiche()).filter((n) => n.endpoint.endsWith('/elena')).at(-1)!
    expect(perElena.messaggio).toMatchObject({ titolo: 'Anna ha risposto alla tua proposta', url: `/contatti/${contattoId}` })

    const conv = (await elena.get(`/api/contatti/${contattoId}`).expect(200)).body
    expect(conv.messaggi.map((m: { mio: boolean; testo: string }) => [m.mio, m.testo])).toEqual([
      [true, 'La mia proposta per Caserta: Buongiorno, abito a Caserta e la mattina sono libera.'],
      [false, 'Grazie Elena! Possiamo sentirci domani?'],
    ])
    expect((await elena.get('/api/lavoro/proposte')).body[0]).toMatchObject({ stato: 'SCELTA', contattoId })
    expect((await elena.post(`/api/lavoro/proposte/${p.id}/ritira`).expect(409)).body.codice).toBe('PROPOSTA_GIA_DECISA')
    // Scrivere di nuovo non duplica la proposta nella chat.
    await anna.post(`/api/proposte/${p.id}/scegli`).send({ testo: 'Ci sei?' }).expect(201)
    expect((await elena.get(`/api/contatti/${contattoId}`)).body.messaggi).toHaveLength(3)
  })

  it('"No, grazie" e la chiusura avvisano con gentilezza', async () => {
    const { anna, elena, sara, lucia, cerchioId } = await scena()
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body
    const pe = (await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, abito a Caserta e la mattina sono libera.' })).body
    await sara.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Salve, ho esperienza con persone anziane e cucino volentieri.' }).expect(201)
    await anna.post(`/api/proposte/${pe.id}/rifiuta`).expect(204)
    expect((await elena.get('/api/lavoro/proposte')).body[0].stato).toBe('NON_SCELTA')

    await anna.post(`/api/ricerche-badante/${id}/chiudi`).expect(204)
    const titoli = (await notifiche()).map((n) => `${n.endpoint.split('/').at(-1)}: ${n.messaggio.titolo}`)
    expect(titoli).toContain('elena: La famiglia di Caserta ha scelto un’altra persona')
    expect(titoli).toContain('sara: La famiglia di Caserta non cerca più')

    // Chiusa: non si vede più e non si accettano proposte.
    expect((await elena.get('/api/lavoro/ricerche')).body.ricerche).toEqual([])
    await lucia.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, sono disponibile anche a Caserta.' }).expect(404)
    expect((await anna.get(`/api/cerchi/${cerchioId}/ricerche-badante`)).body[0]).toMatchObject({ chiusa: true, nuove: 0 })
  })

  it('chi non è della famiglia non vede né decide', async () => {
    const { anna, marco, elena, cerchioId } = await scena()
    const { id } = (await anna.post(`/api/cerchi/${cerchioId}/ricerche-badante`).send(ricerca()).expect(201)).body
    const p = (await elena.post(`/api/lavoro/ricerche/${id}/proposte`).send({ messaggio: 'Buongiorno, abito a Caserta e la mattina sono libera.' })).body
    await marco.get(`/api/ricerche-badante/${id}`).expect(404)
    await elena.get(`/api/ricerche-badante/${id}`).expect(404)
    await marco.post(`/api/proposte/${p.id}/scegli`).send({ testo: 'ciao' }).expect(404)
    await elena.post(`/api/proposte/${p.id}/rifiuta`).expect(404)
    await marco.post(`/api/ricerche-badante/${id}/chiudi`).expect(404)
  })
})
