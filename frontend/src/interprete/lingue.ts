// Le lingue dell'interprete: nome nella lingua stessa, codice per la voce del telefono,
// e le due parole che servono sul pulsante ("Parla", "Ti ascolto…").

export type Lingua = 'it' | 'ro' | 'uk' | 'ru' | 'es' | 'en' | 'pl' | 'pt' | 'bg' | 'fr'

export const LINGUE: Record<Lingua, { italiano: string; nome: string; voce: string; parla: string; ascolto: string }> = {
  it: { italiano: 'Italiano', nome: 'Italiano', voce: 'it-IT', parla: 'Parla', ascolto: 'Ti ascolto…' },
  ro: { italiano: 'Rumeno', nome: 'Română', voce: 'ro-RO', parla: 'Vorbește', ascolto: 'Te ascult…' },
  uk: { italiano: 'Ucraino', nome: 'Українська', voce: 'uk-UA', parla: 'Говоріть', ascolto: 'Слухаю…' },
  ru: { italiano: 'Russo', nome: 'Русский', voce: 'ru-RU', parla: 'Говорите', ascolto: 'Слушаю…' },
  es: { italiano: 'Spagnolo', nome: 'Español', voce: 'es-ES', parla: 'Habla', ascolto: 'Te escucho…' },
  en: { italiano: 'Inglese', nome: 'English', voce: 'en-GB', parla: 'Speak', ascolto: 'Listening…' },
  pl: { italiano: 'Polacco', nome: 'Polski', voce: 'pl-PL', parla: 'Mów', ascolto: 'Słucham…' },
  pt: { italiano: 'Portoghese', nome: 'Português', voce: 'pt-PT', parla: 'Fale', ascolto: 'Estou a ouvir…' },
  bg: { italiano: 'Bulgaro', nome: 'Български', voce: 'bg-BG', parla: 'Говорете', ascolto: 'Слушам…' },
  fr: { italiano: 'Francese', nome: 'Français', voce: 'fr-FR', parla: 'Parlez', ascolto: 'Je vous écoute…' },
}

// Italiano per primo, poi le altre in ordine alfabetico (in italiano).
export const ELENCO_LINGUE = (Object.keys(LINGUE) as Lingua[]).sort((a, b) => (a === 'it' ? -1 : b === 'it' ? 1 : LINGUE[a].italiano.localeCompare(LINGUE[b].italiano, 'it')))

const CHIAVE = 'unicare-interprete-lingue'

/** Le due lingue scelte l'ultima volta su questo telefono. */
export function lingueSalvate(predefinite: { mia: Lingua; altra: Lingua }): { mia: Lingua; altra: Lingua } {
  try {
    const s = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null')
    if (s && s.mia in LINGUE && s.altra in LINGUE && s.mia !== s.altra) return s
  } catch { /* niente */ }
  return predefinite
}

export function salvaLingue(l: { mia: Lingua; altra: Lingua }) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(l)) } catch { /* niente */ }
}

/** Come compare nell'elenco: in italiano, con il nome nella lingua stessa per chi la parla. */
export const nomeLingua = (l: Lingua) => (l === 'it' ? 'Italiano' : `${LINGUE[l].italiano} (${LINGUE[l].nome})`)
