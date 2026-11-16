// L'interprete: traduce una frase da una lingua all'altra.
//
// La voce NON passa da qui: il telefono trasforma la voce in testo e legge ad alta voce
// la traduzione da solo. Al server arriva solo la frase scritta, che mandiamo al servizio
// di traduzione e NON salviamo (né nel database né nei log).
//
// Servizio di traduzione:
// - DeepL (azienda tedesca, server in UE) se c'è la chiave DEEPL_API_KEY. È quello da usare
//   con persone vere. La chiave gratuita (finisce con ":fx") traduce 500.000 caratteri al mese.
// - Senza chiave, SOLO in sviluppo, MyMemory (servizio gratuito senza registrazione), per provare
//   subito. In produzione senza chiave l'interprete risponde "non disponibile".
//
// Limite: 120 frasi all'ora per persona (o per telefono dell'anziano).

import { z } from 'zod'
import { config } from '../config.ts'
import { ErroreApplicativo } from '../comune/errori.ts'

export const LINGUE = ['it', 'ro', 'uk', 'ru', 'es', 'en', 'pl', 'pt', 'bg', 'fr'] as const
export type Lingua = (typeof LINGUE)[number]

const FRASI_ALL_ORA = 120

export const schemaTraduzione = z
  .object({
    testo: z.string().trim().min(1, 'Non ho sentito niente.').max(500, 'Frase troppo lunga: dividila in due.'),
    da: z.enum(LINGUE),
    a: z.enum(LINGUE),
  })
  .refine((d) => d.da !== d.a, { message: 'Scegli due lingue diverse.', path: ['a'] })

export type Traduttore = {
  nome: string
  traduci(testo: string, da: Lingua, a: Lingua): Promise<string>
}

/** DeepL: https://developers.deepl.com/docs/api-reference/translate */
export function traduttoreDeepL(chiave: string): Traduttore {
  const url = chiave.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate'
  // Per alcune lingue DeepL vuole la variante quando traduce VERSO di esse.
  const verso = (l: Lingua) => ({ en: 'EN-GB', pt: 'PT-PT' })[l as 'en' | 'pt'] ?? l.toUpperCase()
  return {
    nome: 'DeepL',
    async traduci(testo, da, a) {
      const r = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${chiave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: [testo], source_lang: da.toUpperCase(), target_lang: verso(a) }),
        signal: AbortSignal.timeout(10_000),
      })
      if (r.status === 456) throw new Error('quota DeepL esaurita')
      if (!r.ok) throw new Error(`DeepL ha risposto ${r.status}`)
      const dati = (await r.json()) as { translations?: { text: string }[] }
      const tradotto = dati.translations?.[0]?.text
      if (!tradotto) throw new Error('DeepL: risposta vuota')
      return tradotto
    },
  }
}

/** MyMemory, senza chiave: solo per provare in sviluppo. */
export function traduttoreMyMemory(): Traduttore {
  return {
    nome: 'MyMemory (solo prove)',
    async traduci(testo, da, a) {
      const q = new URLSearchParams({ q: testo, langpair: `${da}|${a}` })
      const r = await fetch(`https://api.mymemory.translated.net/get?${q}`, { signal: AbortSignal.timeout(10_000) })
      if (!r.ok) throw new Error(`MyMemory ha risposto ${r.status}`)
      const dati = (await r.json()) as { responseStatus?: number; responseData?: { translatedText?: string } }
      const tradotto = dati.responseData?.translatedText
      if (dati.responseStatus !== 200 || !tradotto) throw new Error('MyMemory: traduzione non riuscita')
      return tradotto
    },
  }
}

export function traduttorePredefinito(): Traduttore | null {
  if (config.deeplChiave) return traduttoreDeepL(config.deeplChiave)
  return config.inProduzione ? null : traduttoreMyMemory()
}

export function creaServizioTraduzione(traduttore: Traduttore | null) {
  // Quante frasi ha chiesto ognuno nell'ultima ora (in memoria: si azzera al riavvio).
  const conti = new Map<string, number[]>()

  function conta(chi: string) {
    const ora = Date.now()
    const recenti = (conti.get(chi) ?? []).filter((t) => t > ora - 3_600_000)
    if (recenti.length >= FRASI_ALL_ORA) {
      throw new ErroreApplicativo(429, 'TROPPE_TRADUZIONI', 'Hai tradotto molte frasi nell’ultima ora. Riprova tra poco.')
    }
    recenti.push(ora)
    conti.set(chi, recenti)
    if (conti.size > 10_000) for (const [k, v] of conti) if (!v.some((t) => t > ora - 3_600_000)) conti.delete(k)
  }

  return {
    disponibile: traduttore !== null,
    servizio: traduttore?.nome ?? null,

    /** chi: "u12" per un utente, "a5" per il telefono di un anziano. */
    async traduci(chi: string, d: z.infer<typeof schemaTraduzione>): Promise<{ traduzione: string }> {
      if (!traduttore) {
        throw new ErroreApplicativo(503, 'TRADUZIONE_NON_DISPONIBILE', 'L’interprete non è ancora attivo su questo server.')
      }
      conta(chi)
      try {
        return { traduzione: await traduttore.traduci(d.testo, d.da, d.a) }
      } catch (e) {
        // Nel log solo il motivo, mai la frase.
        console.warn(`Traduzione non riuscita (${traduttore.nome}): ${e instanceof Error ? e.message : e}`)
        throw new ErroreApplicativo(502, 'TRADUZIONE_FALLITA', 'Non riesco a tradurre adesso. Controlla la connessione e riprova.')
      }
    },
  }
}

export type ServizioTraduzione = ReturnType<typeof creaServizioTraduzione>
