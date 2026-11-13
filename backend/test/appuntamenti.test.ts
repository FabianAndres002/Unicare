// Test della settimana 7: calendario degli appuntamenti e messaggi vocali.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import type { Database } from '../src/db/db.ts'
import type { Email } from '../src/notifiche/postino.ts'
import type { MessaggioPush } from '../src/notifiche/push.ts'
import type { Pianificatore } from '../src/medicine/medicine.service.ts'
import { preparaApp, utenteCollegato } from './aiuti.ts'

let db: Database
let app: Express
let posta: () => Promise<Email[]>
let notifiche: () => Promise<{ endpoint: string; messaggio: MessaggioPush }[]>
let pianificatore: Pianificatore

beforeEach(async () => {
  ;({ db, app, posta, notifiche, pianificatore } = await preparaApp())
})
afterEach(async () => {
  await db.chiudi()
})

const ORA = 3_600_000
const GIORNO = 24 * ORA

/** Data e ora italiane tra "ms" millisecondi: { data: 'AAAA-MM-GG', ora: 'HH:MM' }. */
function traRoma(ms: number) {
  const d = new Date(Date.now() + ms)
  return {
    data: d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }),
    ora: d.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

const iscrizione = (nome: string) => ({ endpoint: `https://push.example/${nome}`, keys: { p256dh: 'chiave-' + nome, auth: 'auth-' + nome } })

async function famiglia() {
  const anna = await utenteCollegato(app, 'Anna')
  const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
  const anzianoId = (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id as number
  const entra = async (nome: string, tipo: 'FAMILIARE' | 'BADANTE') => {
    const { token } = (await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: `${nome.toLowerCase()}@example.com`, ruolo: tipo })).body
    const u = await utenteCollegato(app, nome, tipo)
    await u.post(`/api/inviti/token/${token}/accetta`).expect(200)
    await u.post('/api/push/iscrizione').send(iscrizione(nome.toLowerCase())).expect(204)
    return u
  }
  await anna.post('/api/push/iscrizione').send(iscrizione('anna')).expect(204)
  const marco = await entra('Marco', 'FAMILIARE')
  const maria = await entra('Maria', 'BADANTE')
  const { codice } = (await anna.post(`/api/anziani/${anzianoId}/telefono/codice`)).body
  const nonna = request.agent(app)
  await nonna.post('/api/senior/collega').send({ codice }).expect(204)
  await nonna.post('/api/senior/push').send(iscrizione('nonna')).expect(204)
  return { anna, marco, maria, cerchioId, anzianoId, nonna }
}

/** Chi ha ricevuto una notifica con questo titolo. */
async function riceventi(titolo: string | RegExp) {
  return (await notifiche())
    .filter((n) => (typeof titolo === 'string' ? n.messaggio.titolo === titolo : titolo.test(n.messaggio.titolo)))
    .map((n) => n.endpoint.split('/').pop())
    .sort()
}

describe('calendario degli appuntamenti', () => {
  it('un familiare aggiunge un appuntamento: il cerchio viene avvisato e lo vede', async () => {
    const { anna, maria, anzianoId } = await famiglia()
    const domani = traRoma(GIORNO)
    const r = await anna
      .post(`/api/anziani/${anzianoId}/appuntamenti`)
      .send({ titolo: 'Visita dal cardiologo', ...domani, luogo: 'Ospedale San Paolo', note: '' })
      .expect(201)
    expect(r.body.prossimi).toHaveLength(1)
    expect(r.body.prossimi[0]).toMatchObject({ titolo: 'Visita dal cardiologo', luogo: 'Ospedale San Paolo', note: null, accompagna: null, creatoDa: 'Anna' })
    expect(r.body.puoModificare).toBe(true)

    // Marco e Maria ricevono notifica (Anna no: l'ha messo lei). La nonna no: lo vede in app.
    expect(await riceventi(/^Nuovo appuntamento per Pina/)).toEqual(['marco', 'maria'])
    expect((await posta()).map((e) => e.a).sort()).toEqual(['marco@example.com', 'maria@example.com'])

    // La badante lo vede ma non può cambiarlo.
    const visto = (await maria.get(`/api/anziani/${anzianoId}/appuntamenti`).expect(200)).body
    expect(visto.puoModificare).toBe(false)
    await maria.patch(`/api/appuntamenti/${visto.prossimi[0].id}`).send({ titolo: 'Altro' }).expect(403)
    await maria.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'Prova', ...domani }).expect(403)
  })

  it('non si può mettere un appuntamento nel passato e chi è fuori dal cerchio non vede niente', async () => {
    const { anna, anzianoId } = await famiglia()
    const r = await anna.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'Ieri', ...traRoma(-GIORNO) }).expect(400)
    expect(r.body.codice).toBe('APPUNTAMENTO_NEL_PASSATO')
    await anna.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'X', data: '2026-13-01', ora: '10:00' }).expect(400)

    const estraneo = await utenteCollegato(app, 'Estraneo')
    await estraneo.get(`/api/anziani/${anzianoId}/appuntamenti`).expect(404)
  })

  it('"Ci vado io": uno solo per volta, e la nonna viene avvisata', async () => {
    const { anna, marco, maria, anzianoId, nonna } = await famiglia()
    const { prossimi } = (await anna.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'Analisi del sangue', ...traRoma(3 * GIORNO) })).body
    const id = prossimi[0].id

    await maria.post(`/api/appuntamenti/${id}/accompagno`).expect(204)
    expect(await riceventi('Maria ti accompagna')).toEqual(['nonna'])

    const doppio = await marco.post(`/api/appuntamenti/${id}/accompagno`).expect(409)
    expect(doppio.body.messaggio).toBe('Ci va già Maria.')

    const visto = (await maria.get(`/api/anziani/${anzianoId}/appuntamenti`)).body.prossimi[0]
    expect(visto).toMatchObject({ accompagna: 'Maria', accompagnoIo: true })
    expect((await nonna.get('/api/senior/io')).body.appuntamenti[0]).toMatchObject({ titolo: 'Analisi del sangue', accompagna: 'Maria' })

    // Maria non può più: gli altri vengono avvisati e il posto si libera.
    await marco.delete(`/api/appuntamenti/${id}/accompagno`).expect(409)
    await maria.delete(`/api/appuntamenti/${id}/accompagno`).expect(204)
    expect(await riceventi(/^Serve qualcuno che accompagni Pina/)).toEqual(['anna', 'marco'])
    await marco.post(`/api/appuntamenti/${id}/accompagno`).expect(204)
  })

  it('promemoria: la sera prima a tutti, due ore prima alla nonna e a chi ci va', async () => {
    const { anna, marco, anzianoId } = await famiglia()
    // Domani alle 10:30, messo in calendario "ieri".
    const domani = new Date(Date.now() + GIORNO).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
    const { prossimi } = (await anna.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'Dentista', data: domani, ora: '10:30', luogo: 'Via Roma 3' })).body
    const id = prossimi[0].id
    await marco.post(`/api/appuntamenti/${id}/accompagno`).expect(204)
    await db.query(`UPDATE appuntamento SET modificato_il = now() - interval '2 days'`)
    const [{ quando }] = await db.query<{ quando: Date }>('SELECT quando FROM appuntamento WHERE id = $1', [id])
    const prima = (await notifiche()).length

    // Il giorno prima alle 17:59 non parte niente; alle 18:00 sì, una volta sola.
    const sera = new Date(quando.getTime() - 16.5 * ORA) // 10:30 - 16 ore e mezza = 18:00 del giorno prima
    await pianificatore.giro(new Date(sera.getTime() - 60_000))
    expect((await notifiche()).length).toBe(prima)
    await pianificatore.giro(sera)
    await pianificatore.giro(new Date(sera.getTime() + 60_000))
    expect(await riceventi('Domani: Dentista')).toEqual(['nonna'])
    expect(await riceventi('Domani Pina ha: Dentista')).toEqual(['anna', 'marco', 'maria'])
    const perLaNonna = (await notifiche()).find((n) => n.messaggio.titolo === 'Domani: Dentista')!.messaggio
    expect(perLaNonna.testo).toBe('Alle 10:30, Via Roma 3. Ti accompagna Marco.')

    // Due ore prima: la nonna (che deve prepararsi) e Marco.
    await pianificatore.giro(new Date(quando.getTime() - 2 * ORA))
    expect(await riceventi('Tra poco: Dentista')).toEqual(['nonna'])
    expect(await riceventi('Alle 10:30 accompagni Pina: Dentista')).toEqual(['marco'])
    await pianificatore.giro(new Date(quando.getTime() - ORA))
    expect(await riceventi('Tra poco: Dentista')).toEqual(['nonna'])
  })

  it('un appuntamento messo dopo le 18 per domani non manda il promemoria della sera prima', async () => {
    const { anna, anzianoId } = await famiglia()
    const domani = new Date(Date.now() + GIORNO).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' })
    const { prossimi } = (await anna.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'Parrucchiere', data: domani, ora: '23:00' })).body
    const [{ quando }] = await db.query<{ quando: Date }>('SELECT quando FROM appuntamento WHERE id = $1', [prossimi[0].id])
    // "Creato" alle 19 del giorno prima.
    await db.query(`UPDATE appuntamento SET modificato_il = $1`, [new Date(quando.getTime() - 4 * ORA - 0.1 * ORA)])
    await pianificatore.giro(new Date(quando.getTime() - 3 * ORA))
    expect(await riceventi(/^Domani/)).toEqual([])
    await pianificatore.giro(new Date(quando.getTime() - ORA))
    expect(await riceventi('Tra poco: Parrucchiere')).toEqual(['nonna'])
  })

  it('cambiare l’ora fa ripartire i promemoria e avvisa chi ci va; toglierlo lo avvisa anche', async () => {
    const { anna, marco, anzianoId } = await famiglia()
    const { prossimi } = (await anna.post(`/api/anziani/${anzianoId}/appuntamenti`).send({ titolo: 'Fisioterapia', ...traRoma(2 * GIORNO) })).body
    const id = prossimi[0].id
    await marco.post(`/api/appuntamenti/${id}/accompagno`).expect(204)
    await db.query(`UPDATE appuntamento SET avvisato_sera_prima_il = now()`)

    await anna.patch(`/api/appuntamenti/${id}`).send({ ora: '09:15', note: 'Portare le lastre' }).expect(204)
    const [a] = await db.query<{ ora: string; note: string; avvisato: unknown }>(
      `SELECT to_char(quando AT TIME ZONE 'Europe/Rome', 'HH24:MI') AS ora, note, avvisato_sera_prima_il AS avvisato FROM appuntamento`,
    )
    expect(a).toEqual({ ora: '09:15', note: 'Portare le lastre', avvisato: null })
    expect(await riceventi('Cambiato: Fisioterapia')).toEqual(['marco'])

    await anna.delete(`/api/appuntamenti/${id}`).expect(204)
    expect(await riceventi('Annullato: Fisioterapia')).toEqual(['marco'])
    expect((await anna.get(`/api/anziani/${anzianoId}/appuntamenti`)).body.prossimi).toEqual([])
  })
})

// Un finto audio: basta che non sia vuoto.
const AUDIO = Buffer.alloc(2000, 7)

describe('messaggi vocali', () => {
  it('la nonna manda un vocale: arriva a tutto il cerchio e si segna chi l’ha ascoltato', async () => {
    const { marco, maria, anzianoId, nonna } = await famiglia()
    const r = await nonna.post('/api/senior/vocali?durata=12').set('Content-Type', 'audio/webm;codecs=opus').send(AUDIO).expect(201)
    const id = r.body.id as number

    expect(await riceventi('Pina ti ha lasciato un messaggio vocale')).toEqual(['anna', 'marco', 'maria'])

    let elenco = (await maria.get(`/api/anziani/${anzianoId}/vocali`).expect(200)).body
    expect(elenco[0]).toMatchObject({ id, dallAnziano: true, autore: null, durataSecondi: 12, ascoltatoDa: null })

    const audio = await marco.get(`/api/vocali/${id}/audio`).buffer(true).parse((res, cb) => {
      const parti: Buffer[] = []
      res.on('data', (p: Buffer) => parti.push(p))
      res.on('end', () => cb(null, Buffer.concat(parti)))
    }).expect(200)
    expect(audio.headers['content-type']).toContain('audio/webm')
    expect(Buffer.compare(audio.body as Buffer, AUDIO)).toBe(0)

    elenco = (await maria.get(`/api/anziani/${anzianoId}/vocali`)).body
    expect(elenco[0].ascoltatoDa).toBe('Marco')
    // Il primo ascolto resta di Marco.
    await maria.get(`/api/vocali/${id}/audio`).expect(200)
    expect((await maria.get(`/api/anziani/${anzianoId}/vocali`)).body[0].ascoltatoDa).toBe('Marco')
  })

  it('un familiare risponde con un vocale: arriva sul telefono della nonna', async () => {
    const { anna, anzianoId, nonna } = await famiglia()
    const { id } = (await anna.post(`/api/anziani/${anzianoId}/vocali?durata=5`).set('Content-Type', 'audio/mp4').send(AUDIO).expect(201)).body

    expect(await riceventi('Messaggio da Anna')).toEqual(['nonna'])
    const io = (await nonna.get('/api/senior/io')).body
    expect(io.vocali[0]).toMatchObject({ id, dallAnziano: false, autore: 'Anna', ascoltatoIl: null })

    await nonna.get(`/api/senior/vocali/${id}/audio`).expect(200).expect('Content-Type', /audio\/mp4/)
    expect((await anna.get(`/api/anziani/${anzianoId}/vocali`)).body[0].ascoltatoIl).not.toBeNull()
  })

  it('controlli: niente audio vuoto, troppo lungo, di un altro formato o di un altro cerchio', async () => {
    const { anna, anzianoId, nonna } = await famiglia()
    await nonna.post('/api/senior/vocali?durata=10').set('Content-Type', 'audio/webm').send(Buffer.alloc(10)).expect(400)
    await nonna.post('/api/senior/vocali?durata=500').set('Content-Type', 'audio/webm').send(AUDIO).expect(400)
    await nonna.post('/api/senior/vocali?durata=10').set('Content-Type', 'text/plain').send('ciao').expect(400)
    await request(app).post('/api/senior/vocali?durata=10').set('Content-Type', 'audio/webm').send(AUDIO).expect(401)

    const { id } = (await anna.post(`/api/anziani/${anzianoId}/vocali?durata=5`).set('Content-Type', 'audio/webm').send(AUDIO)).body
    const estraneo = await utenteCollegato(app, 'Estraneo')
    await estraneo.get(`/api/vocali/${id}/audio`).expect(404)
    await estraneo.post(`/api/anziani/${anzianoId}/vocali?durata=5`).set('Content-Type', 'audio/webm').send(AUDIO).expect(404)
  })

  it('dopo 30 giorni i messaggi si cancellano da soli', async () => {
    const { anzianoId, nonna, anna } = await famiglia()
    await nonna.post('/api/senior/vocali?durata=3').set('Content-Type', 'audio/webm').send(AUDIO).expect(201)
    await pianificatore.giro(new Date(Date.now() + 29 * GIORNO))
    expect((await anna.get(`/api/anziani/${anzianoId}/vocali`)).body).toHaveLength(1)
    await pianificatore.giro(new Date(Date.now() + 31 * GIORNO))
    expect((await anna.get(`/api/anziani/${anzianoId}/vocali`)).body).toHaveLength(0)
  })
})
