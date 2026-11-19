// Aggiornamenti in diretta (Server-Sent Events): chi deve sapere che una richiesta è cambiata.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { Database } from '../src/db/db.ts'
import { preparaApp } from './aiuti.ts'

let db: Database
let server: Server
let base: string
const aperte: AbortController[] = []

beforeEach(async () => {
  let app
  ;({ db, app } = await preparaApp())
  server = app.listen(0)
  await new Promise((ok) => server.once('listening', ok))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})
afterEach(async () => {
  for (const c of aperte.splice(0)) c.abort()
  server.closeAllConnections()
  await new Promise((ok) => server.close(ok))
  await db.chiudi()
})

/** Un "browser" minimo: ricorda il cookie e parla JSON. */
function browser() {
  let cookie = ''
  return {
    async chiedi(metodo: string, percorso: string, corpo?: unknown) {
      const r = await fetch(base + percorso, {
        method: metodo,
        headers: { 'content-type': 'application/json', cookie },
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      })
      const nuovo = r.headers.get('set-cookie')
      if (nuovo) cookie = nuovo.split(';')[0]!
      return { status: r.status, body: r.status === 204 ? null : await r.json() }
    },
    /** Apre la diretta e raccoglie gli eventi che arrivano. */
    async diretta(percorso = '/api/diretta') {
      const ctrl = new AbortController()
      aperte.push(ctrl)
      const r = await fetch(base + percorso, { headers: { cookie }, signal: ctrl.signal })
      const eventi: { evento: string; dati: unknown }[] = []
      if (r.ok) {
        ;(async () => {
          const dec = new TextDecoder()
          let resto = ''
          try {
            for await (const pezzo of r.body!) {
              resto += dec.decode(pezzo as Uint8Array, { stream: true })
              const blocchi = resto.split('\n\n')
              resto = blocchi.pop()!
              for (const b of blocchi) {
                const evento = /^event: (.*)$/m.exec(b)?.[1]
                const dati = /^data: (.*)$/m.exec(b)?.[1]
                if (evento && dati) eventi.push({ evento, dati: JSON.parse(dati) })
              }
            }
          } catch { /* chiusa dal test */ }
        })()
      }
      return { status: r.status, tipo: r.headers.get('content-type'), eventi, chiudi: () => ctrl.abort() }
    },
  }
}

async function registrato(nome: string) {
  const b = browser()
  const r = await b.chiedi('POST', '/api/auth/registrati', { email: `${nome}@example.com`, password: 'unaPasswordLunga', nome, cognome: 'Prova', tipo: 'FAMILIARE' })
  expect(r.status).toBe(201)
  return b
}

const aspetta = async (condizione: () => boolean) => {
  for (let i = 0; i < 100 && !condizione(); i++) await new Promise((ok) => setTimeout(ok, 20))
}

describe('diretta delle richieste', () => {
  it('chi è nel cerchio e il telefono della nonna lo sanno subito; gli altri no', async () => {
    const anna = await registrato('anna')
    const cerchioId = (await anna.chiedi('POST', '/api/cerchi', { nome: 'Famiglia Rossi' })).body.id
    const anzianoId = (await anna.chiedi('POST', `/api/cerchi/${cerchioId}/anziani`, { nome: 'Pina', cognome: 'Rossi', consensoPrivacy: true })).body.id
    const { codice } = (await anna.chiedi('POST', `/api/anziani/${anzianoId}/telefono/codice`)).body
    const nonna = browser()
    expect((await nonna.chiedi('POST', '/api/senior/collega', { codice })).status).toBe(200)
    const luca = await registrato('luca') // non fa parte del cerchio

    const dirAnna = await anna.diretta()
    const dirNonna = await nonna.diretta('/api/senior/diretta')
    const dirLuca = await luca.diretta()
    expect(dirAnna.status).toBe(200)
    expect(dirAnna.tipo).toContain('text/event-stream')

    // La nonna chiede aiuto dal suo telefono: Anna lo vede.
    const daNonna = (await nonna.chiedi('POST', '/api/senior/richieste', { categoria: 'SPESA' })).body.id
    await aspetta(() => dirAnna.eventi.length > 0)
    expect(dirAnna.eventi).toEqual([{ evento: 'richiesta', dati: { id: daNonna } }])

    // Anna se ne occupa: il telefono della nonna lo sa subito.
    await anna.chiedi('POST', `/api/richieste/${daNonna}/prendi`)
    await aspetta(() => dirNonna.eventi.length > 1)
    expect(dirNonna.eventi.map((e) => e.dati)).toEqual([{ id: daNonna }, { id: daNonna }])

    // Il messaggio non contiene nulla della richiesta, e Luca non riceve niente.
    await new Promise((ok) => setTimeout(ok, 100))
    expect(dirLuca.eventi).toEqual([])
  })

  it('senza login o senza telefono collegato: 401', async () => {
    expect((await browser().diretta()).status).toBe(401)
    expect((await browser().diretta('/api/senior/diretta')).status).toBe(401)
  })

  it('al massimo 5 pagine aperte per persona', async () => {
    const anna = await registrato('anna')
    for (let i = 0; i < 5; i++) expect((await anna.diretta()).status).toBe(200)
    expect((await anna.diretta()).status).toBe(429)
  })
})
