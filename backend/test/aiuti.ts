// Funzioni comuni ai test: database in memoria nuovo e utenti già registrati.

import request from 'supertest'
import type { Express } from 'express'
import { apriDatabaseIntegrato, type Database } from '../src/db/db.ts'
import { eseguiMigrazioni } from '../src/db/migrazioni.ts'
import { creaApp } from '../src/app.ts'

export async function preparaApp(): Promise<{ db: Database; app: Express }> {
  const db = await apriDatabaseIntegrato()
  await eseguiMigrazioni(db, () => {})
  return { db, app: creaApp(db) }
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
