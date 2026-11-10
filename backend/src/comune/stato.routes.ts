// GET /api/stato  →  {"app":"Unicare","database":"ok","tabelle":7}
// Serve al frontend (e a te) per controllare che backend e database rispondano.

import { Router } from 'express'
import type { Database } from '../db/db.ts'

export function rotteStato(db: Database): Router {
  const router = Router()

  router.get('/stato', async (_req, res) => {
    const [riga] = await db.query<{ tabelle: number }>(`
      SELECT count(*)::int AS tabelle FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name <> 'migrazione_eseguita'`)
    res.json({ app: 'Unicare', database: 'ok', tabelle: riga?.tabelle ?? 0 })
  })

  return router
}
