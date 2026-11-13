// Messaggi vocali tra l'anziano e il suo cerchio.
//
// L'anziano tocca "Registra un messaggio", parla e lo manda: arriva a tutto il cerchio
// (notifica ed email). I familiari possono rispondere con un vocale: arriva sul telefono
// dell'anziano, che lo ascolta con un pulsante grande.
//
// Durata massima 2 minuti. I messaggi si cancellano da soli dopo 30 giorni.
//
// Chi può fare cosa: tutti i membri del cerchio (badante compresa) ascoltano e mandano.

import { z } from 'zod'
import type { Database } from '../db/db.ts'
import { ErroreApplicativo } from '../comune/errori.ts'
import { ruoloPerAnziano } from '../cerchio/permessi.ts'
import type { Avvisi } from '../notifiche/avvisi.ts'

export const GIORNI_CONSERVAZIONE = 30
export const DURATA_MASSIMA_SECONDI = 120
export const DIMENSIONE_MASSIMA = '3mb'

export const schemaDurata = z.coerce.number().int().min(1, 'Messaggio troppo corto.').max(DURATA_MASSIMA_SECONDI, 'Al massimo 2 minuti.')
/** Il formato dell'audio, come lo dà il browser: audio/webm;codecs=opus, audio/mp4... */
export const schemaTipoAudio = z.string().max(80).regex(/^audio\/[a-z0-9.+-]+(;[ a-z0-9=.,"-]*)?$/i, 'Formato audio non valido.')

export type Vocale = {
  id: number
  dallAnziano: boolean
  /** Chi l'ha mandato (null = l'anziano). */
  autore: string | null
  durataSecondi: number
  creatoIl: string
  /** Primo ascolto: il familiare che l'ha ascoltato (messaggi dell'anziano). */
  ascoltatoDa: string | null
  ascoltatoIl: string | null
}

const ISO = (colonna: string) => `to_char(${colonna} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`

const SELECT = `
  SELECT v.id, v.dall_anziano AS "dallAnziano", au.nome AS autore, v.durata_secondi AS "durataSecondi",
         ${ISO('v.creato_il')} AS "creatoIl", asc_.nome AS "ascoltatoDa", ${ISO('v.ascoltato_il')} AS "ascoltatoIl"
  FROM messaggio_vocale v
  LEFT JOIN utente au ON au.id = v.autore_id
  LEFT JOIN utente asc_ ON asc_.id = v.ascoltato_da`

type Audio = { audio: Buffer; tipo: string }

function controllaAudio(audio: unknown): Buffer {
  if (!Buffer.isBuffer(audio) || audio.length < 100) throw new ErroreApplicativo(400, 'AUDIO_MANCANTE', 'Il messaggio è vuoto: riprova.')
  return audio
}

export function creaServizioVocali(db: Database, avvisi: Avvisi) {
  async function leggiAudio(id: number, condizione: string, parametri: unknown[]): Promise<(Audio & { anzianoId: number; dallAnziano: boolean; ascoltato: boolean }) | undefined> {
    const [r] = await db.query<{ audio: Uint8Array; tipo: string; anzianoId: number; dallAnziano: boolean; ascoltato: boolean }>(
      `SELECT audio, tipo_audio AS tipo, anziano_id AS "anzianoId", dall_anziano AS "dallAnziano", ascoltato_il IS NOT NULL AS ascoltato
       FROM messaggio_vocale WHERE id = $1 ${condizione}`,
      [id, ...parametri],
    )
    return r && { ...r, audio: Buffer.from(r.audio) }
  }

  const nonTrovato = () => new ErroreApplicativo(404, 'MESSAGGIO_NON_TROVATO', 'Messaggio non trovato.')

  return {
    async elenco(anzianoId: number, utenteId: number): Promise<Vocale[]> {
      await ruoloPerAnziano(db, anzianoId, utenteId)
      return db.query<Vocale>(`${SELECT} WHERE v.anziano_id = $1 ORDER BY v.creato_il DESC LIMIT 50`, [anzianoId])
    },

    /** Per la Senior App: gli ultimi messaggi, mandati e ricevuti. */
    elencoAnziano(anzianoId: number): Promise<Vocale[]> {
      return db.query<Vocale>(`${SELECT} WHERE v.anziano_id = $1 ORDER BY v.creato_il DESC LIMIT 10`, [anzianoId])
    },

    /** Da un familiare (o dalla badante) all'anziano. */
    async daFamiglia(anzianoId: number, utenteId: number, audio: unknown, tipo: string, durata: number): Promise<number> {
      await ruoloPerAnziano(db, anzianoId, utenteId)
      const [r] = await db.query<{ id: number }>(
        `INSERT INTO messaggio_vocale (anziano_id, autore_id, dall_anziano, audio, tipo_audio, durata_secondi)
         VALUES ($1, $2, false, $3, $4, $5) RETURNING id`,
        [anzianoId, utenteId, controllaAudio(audio), tipo, durata],
      )
      const [autore] = await db.query<{ nome: string }>('SELECT nome FROM utente WHERE id = $1', [utenteId])
      avvisi.anziano(anzianoId, {
        titolo: `Messaggio da ${autore!.nome}`,
        testo: 'Tocca qui per ascoltarlo.',
        url: '/senior',
        tag: `vocale-${r!.id}`,
      })
      return r!.id
    },

    /** Dal telefono dell'anziano a tutto il cerchio. */
    async dallAnziano(anzianoId: number, audio: unknown, tipo: string, durata: number): Promise<number> {
      const [r] = await db.query<{ id: number }>(
        `INSERT INTO messaggio_vocale (anziano_id, autore_id, dall_anziano, audio, tipo_audio, durata_secondi)
         VALUES ($1, NULL, true, $2, $3, $4) RETURNING id`,
        [anzianoId, controllaAudio(audio), tipo, durata],
      )
      const [a] = await db.query<{ nome: string }>('SELECT nome FROM anziano WHERE id = $1', [anzianoId])
      avvisi.cerchio(
        anzianoId,
        `${a!.nome} ti ha lasciato un messaggio vocale`,
        [`Dura ${durata < 60 ? `${durata} secondi` : 'più di un minuto'}. Aprilo in Unicare per ascoltarlo.`],
        `/anziano/${anzianoId}/messaggi`,
        `vocale-${r!.id}`,
      )
      return r!.id
    },

    /** L'audio, per un membro del cerchio. Il primo che ascolta un messaggio dell'anziano viene segnato. */
    async audioPerFamiglia(id: number, utenteId: number): Promise<Audio> {
      const v = await leggiAudio(id, '', [])
      if (!v) throw nonTrovato()
      try {
        await ruoloPerAnziano(db, v.anzianoId, utenteId)
      } catch {
        throw nonTrovato()
      }
      if (v.dallAnziano && !v.ascoltato) {
        await db.query('UPDATE messaggio_vocale SET ascoltato_da = $2, ascoltato_il = now() WHERE id = $1 AND ascoltato_il IS NULL', [id, utenteId])
      }
      return v
    },

    /** L'audio, per il telefono dell'anziano: solo i suoi messaggi. */
    async audioPerAnziano(id: number, anzianoId: number): Promise<Audio> {
      const v = await leggiAudio(id, 'AND anziano_id = $2', [anzianoId])
      if (!v) throw nonTrovato()
      if (!v.dallAnziano && !v.ascoltato) {
        await db.query('UPDATE messaggio_vocale SET ascoltato_il = now() WHERE id = $1 AND ascoltato_il IS NULL', [id])
      }
      return v
    },

    /** Toglie i messaggi più vecchi di 30 giorni (lo chiama il pianificatore). */
    async pulizia(adesso: Date = new Date()): Promise<void> {
      await db.query(`DELETE FROM messaggio_vocale WHERE creato_il < $1::timestamptz - make_interval(days => $2)`, [adesso, GIORNI_CONSERVAZIONE])
    },
  }
}

export type ServizioVocali = ReturnType<typeof creaServizioVocali>
