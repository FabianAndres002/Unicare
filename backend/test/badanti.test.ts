// Test della settimana 9: le badanti si propongono, le famiglie le cercano e scrivono.

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
  provincia: 'ce',
  comune: 'Caserta',
  zone: 'Caserta e dintorni',
  anniEsperienza: 8,
  lingue: 'Italiano, rumeno',
  servizi: ['COMPAGNIA', 'PASTI', 'IGIENE', 'PASTI'],
  disponibilita: ['A_ORE', 'NOTTE'],
  tariffaOrariaCentesimi: 1000,
  automunita: true,
  visibile: true,
  ...extra,
})

async function scena() {
  const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
  const sara = await utenteCollegato(app, 'Sara', 'BADANTE')
  const anna = await utenteCollegato(app, 'Anna')
  await elena.post('/api/push/iscrizione').send({ endpoint: 'https://push.example/elena', keys: { p256dh: 'p', auth: 'a' } }).expect(204)
  await anna.post('/api/push/iscrizione').send({ endpoint: 'https://push.example/anna', keys: { p256dh: 'p', auth: 'a' } }).expect(204)
  await elena.put('/api/badante/profilo').send(profilo()).expect(204)
  await sara.put('/api/badante/profilo').send(profilo({ provincia: 'NA', comune: 'Napoli', servizi: ['PULIZIE'], disponibilita: ['CONVIVENTE'] })).expect(204)
  return { elena, sara, anna }
}

describe('profilo della badante', () => {
  it('la badante salva il profilo; per proporsi serve una presentazione', async () => {
    const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
    expect((await elena.get('/api/badante/profilo').expect(200)).body).toEqual({ profilo: null, nome: 'Elena', cognome: 'P.' })
    const corta = await elena.put('/api/badante/profilo').send(profilo({ presentazione: 'Ciao' })).expect(400)
    expect(corta.body.codice).toBe('PRESENTAZIONE_CORTA')
    await elena.put('/api/badante/profilo').send(profilo({ presentazione: 'Ciao', visibile: false })).expect(204)
    await elena.put('/api/badante/profilo').send(profilo()).expect(204)
    const { profilo: p } = (await elena.get('/api/badante/profilo')).body
    expect(p).toMatchObject({ provincia: 'CE', servizi: ['COMPAGNIA', 'PASTI', 'IGIENE'], visibile: true, tariffaOrariaCentesimi: 1000 })
  })

  it('i familiari non hanno un profilo da badante, e le badanti non cercano badanti', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const elena = await utenteCollegato(app, 'Elena', 'BADANTE')
    await anna.put('/api/badante/profilo').send(profilo()).expect(403)
    await elena.get('/api/badanti').expect(403)
  })
})

describe('le famiglie cercano', () => {
  it('trova solo chi si propone, con i filtri; niente email né cognome intero', async () => {
    const { elena, anna } = await scena()
    let r = (await anna.get('/api/badanti').expect(200)).body
    expect(r.map((b: { nome: string }) => b.nome).sort()).toEqual(['Elena', 'Sara'])
    r = (await anna.get('/api/badanti?provincia=ce&servizio=IGIENE&disponibilita=').expect(200)).body
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ nome: 'Elena', cognome: 'P.', comune: 'Caserta', contattoId: null })
    expect(JSON.stringify(r)).not.toContain('@')

    // Elena smette di proporsi: sparisce.
    await elena.put('/api/badante/profilo').send(profilo({ visibile: false })).expect(204)
    expect((await anna.get('/api/badanti?provincia=CE')).body).toEqual([])
    await anna.get(`/api/badanti/${elena.id}`).expect(404)
  })
})

describe('conversazioni', () => {
  it('la famiglia scrive, la badante riceve una notifica e risponde', async () => {
    const { elena, anna } = await scena()
    const { contattoId } = (await anna.post(`/api/badanti/${elena.id}/messaggi`).send({ testo: 'Buongiorno Elena, cerchiamo aiuto per mia madre a Caserta, mattina.' }).expect(201)).body
    const perElena = (await notifiche()).filter((n) => n.endpoint.endsWith('/elena'))
    expect(perElena[0]!.messaggio).toMatchObject({ titolo: 'Nuovo messaggio da Anna', url: `/contatti/${contattoId}` })

    let lista = (await elena.get('/api/contatti').expect(200)).body
    expect(lista[0]).toMatchObject({ id: contattoId, altro: { nome: 'Anna', cognome: 'P.', tipo: 'FAMILIARE' }, nonLetti: 1, bloccato: false })
    const conv = (await elena.get(`/api/contatti/${contattoId}`).expect(200)).body
    expect(conv.messaggi).toHaveLength(1)
    expect(conv.messaggi[0]).toMatchObject({ mio: false, autore: 'Anna' })
    expect(conv.puoInvitare).toEqual([])
    lista = (await elena.get('/api/contatti')).body
    expect(lista[0].nonLetti).toBe(0)

    await elena.post(`/api/contatti/${contattoId}/messaggi`).send({ testo: 'Buongiorno! Sono disponibile, il mio numero è 333 0000000.' }).expect(204)
    expect((await notifiche()).some((n) => n.endpoint.endsWith('/anna') && n.messaggio.titolo === 'Nuovo messaggio da Elena')).toBe(true)
    // Il secondo "primo messaggio" usa la stessa conversazione.
    expect((await anna.post(`/api/badanti/${elena.id}/messaggi`).send({ testo: 'Perfetto, grazie!' }).expect(201)).body.contattoId).toBe(contattoId)
    expect((await anna.get(`/api/badanti/${elena.id}`)).body.contattoId).toBe(contattoId)
  })

  it('chi non fa parte della conversazione non la vede; la badante può chiuderla', async () => {
    const { elena, sara, anna } = await scena()
    const { contattoId } = (await anna.post(`/api/badanti/${elena.id}/messaggi`).send({ testo: 'Salve' }).expect(201)).body
    await sara.get(`/api/contatti/${contattoId}`).expect(404)
    await sara.post(`/api/contatti/${contattoId}/messaggi`).send({ testo: 'intrusa' }).expect(404)
    await anna.post(`/api/contatti/${contattoId}/chiudi`).send({ chiusa: true }).expect(403)

    await elena.post(`/api/contatti/${contattoId}/chiudi`).send({ chiusa: true }).expect(204)
    expect((await anna.post(`/api/contatti/${contattoId}/messaggi`).send({ testo: 'Ci sei?' }).expect(403)).body.codice).toBe('CONVERSAZIONE_CHIUSA')
    await elena.post(`/api/contatti/${contattoId}/chiudi`).send({ chiusa: false }).expect(204)
    await anna.post(`/api/contatti/${contattoId}/messaggi`).send({ testo: 'Ci sei?' }).expect(204)
  })

  it('una famiglia non può scrivere a più di 10 badanti nuove al giorno', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    for (let i = 0; i < 11; i++) {
      const b = await utenteCollegato(app, `Badante${i}`, 'BADANTE')
      await b.put('/api/badante/profilo').send(profilo()).expect(204)
      await anna.post(`/api/badanti/${b.id}/messaggi`).send({ testo: 'Salve' }).expect(i < 10 ? 201 : 429)
    }
  })

  it('dalla conversazione la famiglia invita la badante nel cerchio', async () => {
    const { elena, anna } = await scena()
    const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
    const { contattoId } = (await anna.post(`/api/badanti/${elena.id}/messaggi`).send({ testo: 'Salve' }).expect(201)).body
    const conv = (await anna.get(`/api/contatti/${contattoId}`)).body
    expect(conv.puoInvitare).toEqual([{ id: cerchioId, nome: 'Famiglia Rossi' }])

    await anna.post(`/api/contatti/${contattoId}/invita`).send({ cerchioId }).expect(204)
    const ultimo = (await elena.get(`/api/contatti/${contattoId}`)).body.messaggi.at(-1)
    const token = ultimo.testo.match(/\/invito\/([A-Za-z0-9_-]+)/)[1]
    await elena.post(`/api/inviti/token/${token}/accetta`).expect(200)
    const cerchi = (await elena.get('/api/cerchi')).body
    expect(cerchi[0]).toMatchObject({ nome: 'Famiglia Rossi', mioRuolo: 'BADANTE' })
    expect((await anna.get(`/api/contatti/${contattoId}`)).body.puoInvitare).toEqual([])
  })
})
