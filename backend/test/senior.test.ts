// Test della settimana 5: avvisi via email e telefono dell'anziano (Senior App).

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import type { Email } from '../src/notifiche/postino.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Express
let posta: () => Promise<Email[]>

beforeEach(async () => {
  ;({ db, app, posta } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

/** Anna (admin), Marco (familiare) e Maria (badante) nel cerchio della nonna Pina. */
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

/** Collega un telefono "nuovo" per la nonna e restituisce quel telefono (ricorda il cookie). */
async function telefonoDellaNonna(chi: request.Agent, anzianoId: number) {
  const { codice } = (await chi.post(`/api/anziani/${anzianoId}/telefono/codice`).expect(201)).body
  const telefono = request.agent(app)
  await telefono.post('/api/senior/collega').send({ codice }).expect(204)
  return telefono
}

const destinatari = (email: Email[]) => email.map((e) => e.a).sort()

describe('avvisi via email', () => {
  it('nuova richiesta: avvisa tutto il cerchio tranne chi l\'ha chiesta', async () => {
    const { marco, cerchioId, anzianoId } = await famiglia()
    await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'SPESA', testo: '<b>Latte</b>' }).expect(201)
    const email = await posta()
    expect(destinatari(email)).toEqual(['anna@example.com', 'maria@example.com'])
    expect(email[0]!.oggetto).toBe('Nuova richiesta per Pina: la spesa')
    expect(email[0]!.testo).toContain('Marco ha chiesto la spesa per Pina')
    // Il testo scritto dagli utenti non può inserire codice nella email.
    expect(email[0]!.html).toContain('&lt;b&gt;Latte&lt;/b&gt;')
    expect(email[0]!.html).toMatch(/href="http:\/\/localhost:5173\/richieste\/\d+"/)
  })

  it('presa in carico e completata: avvisa chi l\'aveva chiesta', async () => {
    const { marco, maria, cerchioId, anzianoId } = await famiglia()
    const id = (await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'FARMACIA' })).body.id
    const prima = (await posta()).length
    await maria.post(`/api/richieste/${id}/prendi`).expect(200)
    await maria.post(`/api/richieste/${id}/completa`).expect(200)
    const nuove = (await posta()).slice(prima)
    expect(nuove.map((e) => [e.a, e.oggetto])).toEqual([
      ['marco@example.com', 'Maria se ne occupa: un passaggio in farmacia per Pina'],
      ['marco@example.com', 'Fatto: un passaggio in farmacia per Pina'],
    ])
  })

  it('chi spegne gli avvisi non riceve email', async () => {
    const { anna, marco, cerchioId, anzianoId } = await famiglia()
    const r = await anna.patch('/api/auth/io').send({ emailAvvisi: false })
    expect(r.body).toMatchObject({ nome: 'Anna', emailAvvisi: false })
    await marco.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'CASA' }).expect(201)
    expect(destinatari(await posta())).toEqual(['maria@example.com'])
  })
})

describe('collegare il telefono dell\'anziano', () => {
  it('codice a 6 cifre, usabile una volta sola', async () => {
    const { anna, anzianoId } = await famiglia()
    const r = await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)
    expect(r.status).toBe(201)
    expect(r.body.codice).toMatch(/^\d{6}$/)
    expect((await anna.get(`/api/anziani/${anzianoId}/telefono`)).body).toMatchObject({ collegati: [], codiceScadeIl: r.body.scadeIl })

    const telefono = request.agent(app)
    await telefono.post('/api/senior/collega').send({ codice: r.body.codice }).expect(204)
    const io = await telefono.get('/api/senior/io')
    expect(io.status).toBe(200)
    expect(io.body).toMatchObject({ anziano: { nome: 'Pina' }, cerchio: 'Famiglia Rossi', richieste: [] })
    expect(io.body.famiglia.map((f: { nome: string }) => f.nome)).toEqual(['Anna', 'Marco', 'Maria'])

    // Lo stesso codice non funziona una seconda volta.
    const altro = await request(app).post('/api/senior/collega').send({ codice: r.body.codice })
    expect(altro.body.codice).toBe('CODICE_NON_VALIDO')
    expect((await anna.get(`/api/anziani/${anzianoId}/telefono`)).body.collegati).toHaveLength(1)
  })

  it('un nuovo codice annulla quello vecchio', async () => {
    const { anna, anzianoId } = await famiglia()
    const vecchio = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body.codice
    const nuovo = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body.codice
    if (vecchio !== nuovo) expect((await request(app).post('/api/senior/collega').send({ codice: vecchio })).status).toBe(400)
    expect((await request(app).post('/api/senior/collega').send({ codice: nuovo })).status).toBe(204)
  })

  it('dopo 5 codici sbagliati bisogna aspettare', async () => {
    await famiglia()
    for (let i = 0; i < 5; i++) {
      expect((await request(app).post('/api/senior/collega').send({ codice: '000000' })).status).toBe(400)
    }
    const r = await request(app).post('/api/senior/collega').send({ codice: '000000' })
    expect(r.status).toBe(429)
    expect(r.body.codice).toBe('TROPPI_TENTATIVI')
  })

  it('solo familiari e amministratore gestiscono il telefono; chi è fuori riceve 404', async () => {
    const { maria, anzianoId } = await famiglia()
    expect((await maria.post(`/api/anziani/${anzianoId}/telefono/codice`)).status).toBe(403)
    const estraneo = await utenteCollegato(app, 'Ugo')
    expect((await estraneo.get(`/api/anziani/${anzianoId}/telefono`)).status).toBe(404)
  })

  it('"Scollega": il telefono perde l\'accesso subito', async () => {
    const { marco, anzianoId } = await famiglia()
    const telefono = await telefonoDellaNonna(marco, anzianoId)
    const [collegato] = (await marco.get(`/api/anziani/${anzianoId}/telefono`)).body.collegati
    await marco.delete(`/api/anziani/${anzianoId}/telefono/${collegato.id}`).expect(204)
    const r = await telefono.get('/api/senior/io')
    expect(r.status).toBe(401)
    expect(r.body.codice).toBe('TELEFONO_NON_COLLEGATO')
  })

  it('senza telefono collegato la Senior App risponde 401', async () => {
    expect((await request(app).get('/api/senior/io')).status).toBe(401)
  })
})

describe('Senior App: chiedere aiuto', () => {
  it('l\'anziano chiede la spesa: la famiglia la vede e riceve l\'avviso', async () => {
    const { anna, maria, cerchioId, anzianoId } = await famiglia()
    const telefono = await telefonoDellaNonna(anna, anzianoId)
    const r = await telefono.post('/api/senior/richieste').send({ categoria: 'SPESA' })
    expect(r.status).toBe(201)
    expect(r.body).toMatchObject({ stato: 'APERTA', creataDa: null, creataDallAnziano: true, azioni: ['ANNULLA'] })

    const email = await posta()
    expect(destinatari(email)).toEqual(['anna@example.com', 'marco@example.com', 'maria@example.com'])
    expect(email[0]!.oggetto).toBe('Pina chiede aiuto: la spesa')

    const elenco = (await maria.get(`/api/cerchi/${cerchioId}/richieste`)).body
    expect(elenco).toHaveLength(1)
    expect(elenco[0]).toMatchObject({ creataDallAnziano: true, azioni: ['PRENDI'] })

    // Maria se ne occupa: la nonna lo vede sul telefono, i familiari ricevono l'avviso.
    const prima = (await posta()).length
    await maria.post(`/api/richieste/${r.body.id}/prendi`).expect(200)
    const io = (await telefono.get('/api/senior/io')).body
    expect(io.richieste[0]).toMatchObject({ stato: 'PRESA_IN_CARICO', presaDa: { nome: 'Maria' } })
    expect(destinatari((await posta()).slice(prima))).toEqual(['anna@example.com', 'marco@example.com'])

    const dettaglio = (await anna.get(`/api/richieste/${r.body.id}`)).body
    expect(dettaglio.eventi[0]).toMatchObject({ tipo: 'CREATA', utente: 'Pina', dallAnziano: true })
  })

  it('due tocchi sullo stesso pulsante non creano due richieste', async () => {
    const { anna, anzianoId } = await famiglia()
    const telefono = await telefonoDellaNonna(anna, anzianoId)
    const prima = await telefono.post('/api/senior/richieste').send({ categoria: 'FARMACIA' })
    const seconda = await telefono.post('/api/senior/richieste').send({ categoria: 'FARMACIA' })
    expect(seconda.status).toBe(200)
    expect(seconda.body.id).toBe(prima.body.id)
  })

  it('l\'anziano può annullare solo quello che ha chiesto lui', async () => {
    const { anna, cerchioId, anzianoId } = await famiglia()
    const telefono = await telefonoDellaNonna(anna, anzianoId)
    const sua = (await telefono.post('/api/senior/richieste').send({ categoria: 'COMPAGNIA' })).body.id
    const diAnna = (await anna.post(`/api/cerchi/${cerchioId}/richieste`).send({ anzianoId, categoria: 'CASA' })).body.id
    await telefono.post(`/api/senior/richieste/${sua}/annulla`).expect(204)
    expect((await telefono.post(`/api/senior/richieste/${diAnna}/annulla`)).status).toBe(404)
    expect((await anna.get(`/api/richieste/${sua}`)).body.stato).toBe('ANNULLATA')
  })

  it('"Altro" non si può scegliere dal telefono (serve la voce, settimana 6)', async () => {
    const { anna, anzianoId } = await famiglia()
    const telefono = await telefonoDellaNonna(anna, anzianoId)
    expect((await telefono.post('/api/senior/richieste').send({ categoria: 'ALTRO' })).status).toBe(400)
  })
})
