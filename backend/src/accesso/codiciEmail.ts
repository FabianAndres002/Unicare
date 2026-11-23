// Codici di 6 numeri mandati per email: per confermare l'indirizzo dopo la registrazione
// e per scegliere una nuova password ("Password dimenticata?").
//
// - Valgono 30 minuti; un codice nuovo sostituisce quello vecchio dello stesso tipo.
// - Nel database c'è solo l'impronta del codice, mai il codice.
// - Dopo 5 tentativi sbagliati il codice non vale più: bisogna chiederne un altro.

import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'
import type { Postino } from '../notifiche/postino.ts'
import { comeLingua, tr } from '../comune/testi.ts'
import type { Lingua } from '../traduzione/traduzione.service.ts'

export type ScopoCodice = 'CONFERMA' | 'PASSWORD'

const MINUTI_VALIDITA = 30
const MAX_TENTATIVI = 5

const impronta = (utenteId: number, scopo: ScopoCodice, codice: string) =>
  createHmac('sha256', config.segretoJwt).update(`email:${scopo}:${utenteId}:${codice}`).digest()

function sicuro(testo: string): string {
  return testo.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function email(lingua: Lingua, nome: string, scopo: ScopoCodice, codice: string) {
  const t = (frase: string, ...valori: string[]) => tr(frase, ...valori)(lingua)
  const oggetto = scopo === 'CONFERMA' ? t('Il tuo codice per Unicare: {0}', codice) : t('Codice per cambiare la password: {0}', codice)
  const spiega = scopo === 'CONFERMA'
    ? t('Per confermare la tua email, scrivi questo codice in Unicare:')
    : t('Per scegliere una nuova password, scrivi questo codice in Unicare:')
  const vale = t('Vale 30 minuti. Se non sei stato tu, ignora questa email: senza il codice nessuno può entrare.')
  const ciao = t('Ciao {0},', nome)
  const html = `<!doctype html><html lang="${lingua}"><body style="margin:0;background:#F8F7FD;font-family:Nunito,Arial,sans-serif;color:#1E1B2E">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
  <p style="font-size:20px;font-weight:800;margin:0 0 20px"><span style="color:#5E22B5">uni</span><span style="color:#F07E1F">Care</span></p>
  <div style="background:#fff;border-radius:20px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,.06)">
    <p style="margin:0 0 8px;color:#67647A">${sicuro(ciao)}</p>
    <p style="margin:0 0 16px;line-height:1.5">${sicuro(spiega)}</p>
    <p style="font-size:36px;font-weight:800;letter-spacing:8px;margin:0 0 16px;color:#5D46EC">${codice}</p>
    <p style="margin:0;line-height:1.5;color:#67647A">${sicuro(vale)}</p>
  </div>
</div></body></html>`
  return { oggetto, testo: `${ciao}\n\n${spiega}\n\n${codice}\n\n${vale}`, html }
}

export function creaCodiciEmail(db: Database, postino: Postino) {
  return {
    /** Crea un codice nuovo e lo manda all'email dell'utente. */
    async manda(utenteId: number, scopo: ScopoCodice): Promise<void> {
      const [u] = await db.query<{ email: string; nome: string; lingua: string }>('SELECT email, nome, lingua FROM utente WHERE id = $1', [utenteId])
      if (!u) return
      const codice = String(randomInt(0, 1_000_000)).padStart(6, '0')
      await db.query(
        `INSERT INTO codice_email (utente_id, scopo, codice_hash, scade_il)
         VALUES ($1, $2, $3, now() + make_interval(mins => $4))
         ON CONFLICT (utente_id, scopo) DO UPDATE SET codice_hash = EXCLUDED.codice_hash, scade_il = EXCLUDED.scade_il, tentativi = 0, creato_il = now()`,
        [utenteId, scopo, impronta(utenteId, scopo, codice).toString('hex'), MINUTI_VALIDITA],
      )
      await postino.invia({ a: u.email, ...email(comeLingua(u.lingua), u.nome, scopo, codice) })
    },

    /** true se il codice è giusto (e da quel momento non vale più). */
    async verifica(utenteId: number, scopo: ScopoCodice, codice: string): Promise<boolean> {
      const [c] = await db.query<{ hash: string }>(
        `SELECT codice_hash AS hash FROM codice_email
         WHERE utente_id = $1 AND scopo = $2 AND scade_il > now() AND tentativi < $3`,
        [utenteId, scopo, MAX_TENTATIVI],
      )
      if (!c) return false
      const giusto = timingSafeEqual(Buffer.from(c.hash, 'hex'), impronta(utenteId, scopo, codice))
      if (giusto) await db.query('DELETE FROM codice_email WHERE utente_id = $1 AND scopo = $2', [utenteId, scopo])
      else await db.query('UPDATE codice_email SET tentativi = tentativi + 1 WHERE utente_id = $1 AND scopo = $2', [utenteId, scopo])
      return giusto
    },
  }
}

export type CodiciEmail = ReturnType<typeof creaCodiciEmail>
