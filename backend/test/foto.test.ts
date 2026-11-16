// Foto profilo: la mia, quella della persona assistita, chi la vede.

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

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300, 7)])
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(300, 3)])
const HTML = Buffer.from('<html><script>alert(1)</script></html>')

const carica = (u: request.Agent, percorso: string, file: Buffer) => u.put(percorso).set('Content-Type', 'image/jpeg').send(file)

async function famiglia() {
  const anna = await utenteCollegato(app, 'Anna')
  const cerchioId = (await anna.post('/api/cerchi').send({ nome: 'Famiglia Rossi' })).body.id as number
  const anzianoId = (await anna.post(`/api/cerchi/${cerchioId}/anziani`).send({ nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id as number
  const { token } = (await anna.post(`/api/cerchi/${cerchioId}/inviti`).send({ email: 'maria@example.com', ruolo: 'BADANTE' })).body
  const maria = await utenteCollegato(app, 'Maria', 'BADANTE')
  await maria.post(`/api/inviti/token/${token}/accetta`).expect(200)
  return { anna, maria, cerchioId, anzianoId }
}

describe('foto profilo', () => {
  it('la mia foto: si carica, si vede nel profilo e nel cerchio, si cambia, si toglie', async () => {
    const { anna, maria, cerchioId } = await famiglia()
    expect((await anna.get('/api/auth/io')).body.foto).toBeNull()

    const r = await carica(anna, '/api/auth/io/foto', JPEG).expect(200)
    expect(r.body.foto).toMatch(/^\/api\/foto\/[\w-]+$/)
    expect((await anna.get('/api/auth/io')).body.foto).toBe(r.body.foto)

    // Maria, nello stesso cerchio, riceve l'indirizzo e vede la foto.
    const membri = (await maria.get(`/api/cerchi/${cerchioId}`)).body.membri as { id: number; foto: string | null }[]
    expect(membri.find((m) => m.id === anna.id)!.foto).toBe(r.body.foto)
    const img = await request(app).get(r.body.foto).expect(200)
    expect(img.headers['content-type']).toBe('image/jpeg')
    expect(img.headers['content-security-policy']).toContain("default-src 'none'")
    expect(Buffer.compare(img.body as Buffer, JPEG)).toBe(0)

    // Una foto nuova cambia l'indirizzo; quella vecchia non c'è più.
    const r2 = await carica(anna, '/api/auth/io/foto', PNG).expect(200)
    expect(r2.body.foto).not.toBe(r.body.foto)
    await request(app).get(r.body.foto).expect(404)
    expect((await request(app).get(r2.body.foto).expect(200)).headers['content-type']).toBe('image/png')

    await anna.delete('/api/auth/io/foto').expect(204)
    expect((await anna.get('/api/auth/io')).body.foto).toBeNull()
    await request(app).get(r2.body.foto).expect(404)
  })

  it('accetta solo immagini vere e non troppo grandi', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    expect((await carica(anna, '/api/auth/io/foto', HTML).expect(400)).body.codice).toBe('FOTO_NON_VALIDA')
    await carica(anna, '/api/auth/io/foto', Buffer.alloc(0)).expect(400)
    const enorme = Buffer.concat([JPEG, Buffer.alloc(1024 * 1024)])
    await carica(anna, '/api/auth/io/foto', enorme).expect(413)
    await request(app).put('/api/auth/io/foto').set('Content-Type', 'image/jpeg').send(JPEG).expect(401)
    await request(app).get('/api/foto/../../etc').expect(404)
  })

  it('foto della persona assistita: la mette un familiare, la badante la vede ma non la cambia', async () => {
    const { anna, maria, cerchioId, anzianoId } = await famiglia()
    const { foto } = (await carica(anna, `/api/anziani/${anzianoId}/foto`, JPEG).expect(200)).body
    const visto = (await maria.get(`/api/cerchi/${cerchioId}`)).body.anziani[0]
    expect(visto.foto).toBe(foto)
    expect((await maria.get('/api/cerchi')).body[0].anziani[0].foto).toBe(foto)

    await carica(maria, `/api/anziani/${anzianoId}/foto`, PNG).expect(403)
    await maria.delete(`/api/anziani/${anzianoId}/foto`).expect(403)
    const estraneo = await utenteCollegato(app, 'Ugo')
    await carica(estraneo, `/api/anziani/${anzianoId}/foto`, PNG).expect(404)

    await anna.delete(`/api/anziani/${anzianoId}/foto`).expect(204)
    expect((await anna.get(`/api/cerchi/${cerchioId}`)).body.anziani[0].foto).toBeNull()
  })

  it('cancellando l\'account sparisce anche la foto', async () => {
    const anna = await utenteCollegato(app, 'Anna')
    const { foto } = (await carica(anna, '/api/auth/io/foto', JPEG)).body
    await anna.delete('/api/auth/io').send({ password: 'unaPasswordLunga' }).expect(204)
    await request(app).get(foto).expect(404)
  })

  it('al posto della foto si può scegliere un disegno (o l\'una o l\'altro)', async () => {
    const { anna, maria, cerchioId, anzianoId } = await famiglia()
    await carica(anna, '/api/auth/io/foto', JPEG).expect(200)
    const r = await anna.put('/api/auth/io/disegno').send({ disegno: 'gatto' }).expect(200)
    expect(r.body.foto).toBe('/avatar/gatto.webp')
    expect((await anna.get('/api/auth/io')).body.foto).toBe('/avatar/gatto.webp')
    // Una nuova foto prende il posto del disegno.
    const { foto } = (await carica(anna, '/api/auth/io/foto', PNG)).body
    expect((await anna.get('/api/auth/io')).body.foto).toBe(foto)
    // Togli: niente foto e niente disegno.
    await anna.put('/api/auth/io/disegno').send({ disegno: 'cane' }).expect(200)
    await anna.delete('/api/auth/io/foto').expect(204)
    expect((await anna.get('/api/auth/io')).body.foto).toBeNull()
    // Solo disegni dell'elenco.
    await anna.put('/api/auth/io/disegno').send({ disegno: '../../segreto' }).expect(400)

    await anna.put(`/api/anziani/${anzianoId}/disegno`).send({ disegno: 'nonna' }).expect(200)
    expect((await maria.get(`/api/cerchi/${cerchioId}`)).body.anziani[0].foto).toBe('/avatar/nonna.webp')
    await maria.put(`/api/anziani/${anzianoId}/disegno`).send({ disegno: 'cane' }).expect(403)
  })
})
