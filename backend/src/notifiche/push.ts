// Notifiche push: arrivano sul telefono anche con l'app chiusa (come quelle di WhatsApp).
//
// Come funziona:
// 1. Il telefono accetta le notifiche e il browser ci dà una "iscrizione" (un indirizzo
//    segreto del servizio push di Google, Apple o Mozilla, più due chiavi).
// 2. Noi la salviamo nella tabella iscrizione_push, legata a un utente o al telefono dell'anziano.
// 3. Per mandare una notifica, il server firma il messaggio con le sue chiavi "VAPID"
//    e lo consegna a quell'indirizzo. Il telefono la mostra.
//
// Sull'iPhone funziona solo se l'app è stata aggiunta alla schermata Home (iOS 16.4 o più recente).

import { generateVAPIDKeys, sendNotification, WebPushError } from 'web-push'
import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { config } from '../config.ts'

export const schemaIscrizione = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
})
export type Iscrizione = z.infer<typeof schemaIscrizione>

export type MessaggioPush = {
  titolo: string
  testo: string
  /** La pagina da aprire quando si tocca la notifica. */
  url: string
  /** Notifiche con lo stesso tag si sostituiscono invece di accumularsi. */
  tag?: string
  /** Resta sullo schermo finché non la si tocca (per le medicine). */
  insistente?: boolean
}

type Chiavi = { pubblica: string; privata: string }

/** Chi consegna davvero le notifiche. I test ne usano uno finto. */
export interface Spingitore {
  /** 'scaduta' = il telefono non accetta più notifiche: l'iscrizione va cancellata. */
  invia(chiavi: Chiavi, a: { endpoint: string; p256dh: string; auth: string }, messaggio: MessaggioPush): Promise<'ok' | 'scaduta'>
}

export function spingitoreWebPush(): Spingitore {
  return {
    async invia(chiavi, a, messaggio) {
      try {
        await sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, JSON.stringify(messaggio), {
          vapidDetails: { subject: config.push.contatto, publicKey: chiavi.pubblica, privateKey: chiavi.privata },
          TTL: 60 * 60, // se il telefono è spento, prova a consegnarla per un'ora
        })
        return 'ok'
      } catch (e) {
        if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) return 'scaduta'
        throw e
      }
    },
  }
}

export function spingitoreMemoria(): Spingitore & { inviate: { endpoint: string; messaggio: MessaggioPush }[] } {
  const inviate: { endpoint: string; messaggio: MessaggioPush }[] = []
  return {
    inviate,
    async invia(_chiavi, a, messaggio) {
      if (a.endpoint.includes('scaduta')) return 'scaduta'
      inviate.push({ endpoint: a.endpoint, messaggio })
      return 'ok'
    },
  }
}

type RigaIscrizione = { id: number; endpoint: string; p256dh: string; auth: string }

export function creaPush(db: Database, spingitore: Spingitore) {
  let chiavi: Promise<Chiavi> | undefined

  /** Le chiavi VAPID: dalle impostazioni, oppure create una volta e salvate nel database. */
  function leChiavi(): Promise<Chiavi> {
    chiavi ??= (async () => {
      if (config.push.chiavePubblica && config.push.chiavePrivata) {
        return { pubblica: config.push.chiavePubblica, privata: config.push.chiavePrivata }
      }
      const [salvate] = await db.query<{ valore: string }>(`SELECT valore FROM impostazione WHERE chiave = 'vapid'`)
      if (salvate) return JSON.parse(salvate.valore) as Chiavi
      const nuove = generateVAPIDKeys()
      const c = { pubblica: nuove.publicKey, privata: nuove.privateKey }
      await db.query(`INSERT INTO impostazione (chiave, valore) VALUES ('vapid', $1) ON CONFLICT (chiave) DO NOTHING`, [JSON.stringify(c)])
      const [vincente] = await db.query<{ valore: string }>(`SELECT valore FROM impostazione WHERE chiave = 'vapid'`)
      return JSON.parse(vincente!.valore) as Chiavi
    })()
    return chiavi
  }

  async function consegna(iscrizioni: RigaIscrizione[], messaggio: MessaggioPush) {
    if (!iscrizioni.length) return
    const c = await leChiavi()
    for (const i of iscrizioni) {
      try {
        if ((await spingitore.invia(c, i, messaggio)) === 'scaduta') {
          await db.query('DELETE FROM iscrizione_push WHERE id = $1', [i.id])
        }
      } catch (e) {
        console.error('Notifica push non consegnata:', e instanceof Error ? e.message : e)
      }
    }
  }

  async function salva(chi: { utenteId: number } | { dispositivoId: number }, s: Iscrizione) {
    // Lo stesso browser può passare da un utente all'altro: l'iscrizione segue l'ultimo.
    const utente = 'utenteId' in chi ? chi.utenteId : null
    const dispositivo = 'dispositivoId' in chi ? chi.dispositivoId : null
    await db.query(
      `INSERT INTO iscrizione_push (utente_id, dispositivo_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET utente_id = $1, dispositivo_id = $2, p256dh = $4, auth = $5, creata_il = now()`,
      [utente, dispositivo, s.endpoint, s.keys.p256dh, s.keys.auth],
    )
  }

  return {
    chiavePubblica: async () => (await leChiavi()).pubblica,
    iscriviUtente: (utenteId: number, s: Iscrizione) => salva({ utenteId }, s),
    iscriviTelefono: (dispositivoId: number, s: Iscrizione) => salva({ dispositivoId }, s),
    async cancellaUtente(endpoint: string, utenteId: number) {
      await db.query('DELETE FROM iscrizione_push WHERE endpoint = $1 AND utente_id = $2', [endpoint, utenteId])
    },

    async aUtenti(utenti: number[], messaggio: MessaggioPush) {
      if (!utenti.length) return
      await consegna(await db.query<RigaIscrizione>('SELECT id, endpoint, p256dh, auth FROM iscrizione_push WHERE utente_id = ANY($1)', [utenti]), messaggio)
    },

    /** A tutti i telefoni collegati (e non scollegati) di questo anziano. */
    async aAnziano(anzianoId: number, messaggio: MessaggioPush) {
      await consegna(
        await db.query<RigaIscrizione>(
          `SELECT i.id, i.endpoint, i.p256dh, i.auth FROM iscrizione_push i
           JOIN dispositivo_anziano d ON d.id = i.dispositivo_id
           WHERE d.anziano_id = $1 AND d.revocato_il IS NULL`,
          [anzianoId],
        ),
        messaggio,
      )
    },
  }
}

export type Push = ReturnType<typeof creaPush>
