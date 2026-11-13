// Funzioni comuni ai test: database in memoria nuovo e utenti già registrati.

import request from 'supertest'
import type { Express } from 'express'
import { apriDatabaseIntegrato, type Database } from '../src/db/db.ts'
import { eseguiMigrazioni } from '../src/db/migrazioni.ts'
import { creaApp } from '../src/app.ts'
import { postinoMemoria } from '../src/notifiche/postino.ts'
import { spingitoreMemoria } from '../src/notifiche/push.ts'

/** App con database in memoria e un postino finto: le email finiscono in "posta". */
export async function preparaApp() {
  const db: Database = await apriDatabaseIntegrato()
  await eseguiMigrazioni(db, () => {})
  const postino = postinoMemoria()
  const spingitore = spingitoreMemoria()
  const app = creaApp(db, { postino, spingitore })
  /** Le email spedite finora (aspetta quelle ancora in viaggio). */
  async function posta() {
    await app.avvisi.attendi()
    return postino.posta
  }
  /** Le notifiche push consegnate finora. */
  async function notifiche() {
    await app.avvisi.attendi()
    return spingitore.inviate
  }
  return { db, app: app as Express, posta, postino, notifiche, pianificatore: app.pianificatore }
}

/** Registra un utente e restituisce un "browser" già collegato (ricorda il cookie). */
export async function utenteCollegato(app: Express, nome: string, tipo: 'FAMILIARE' | 'BADANTE' = 'FAMILIARE') {
  const agente = request.agent(app)
  const r = await agente.post('/api/auth/registrati').send({
    email: `${nome.toLowerCase()}@example.com`,
    password: 'unaPasswordLunga',
    nome,
    cognome: 'Prova',
    tipo,
  })
  if (r.status !== 201) throw new Error(`registrazione fallita: ${JSON.stringify(r.body)}`)
  return Object.assign(agente, { id: r.body.id as number, email: r.body.email as string })
}
