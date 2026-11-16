// Le lingue dell'interprete: nome nella lingua stessa, codice per la voce del telefono,
// e le due parole che servono sul pulsante ("Parla", "Ti ascolto…").

export type Lingua = 'it' | 'ro' | 'uk' | 'ru' | 'es' | 'en' | 'pl' | 'pt' | 'bg' | 'fr'

export const LINGUE: Record<Lingua, { nome: string; voce: string; parla: string; ascolto: string }> = {
  it: { nome: 'Italiano', voce: 'it-IT', parla: 'Parla', ascolto: 'Ti ascolto…' },
  ro: { nome: 'Română', voce: 'ro-RO', parla: 'Vorbește', ascolto: 'Te ascult…' },
  uk: { nome: 'Українська', voce: 'uk-UA', parla: 'Говоріть', ascolto: 'Слухаю…' },
  ru: { nome: 'Русский', voce: 'ru-RU', parla: 'Говорите', ascolto: 'Слушаю…' },
  es: { nome: 'Español', voce: 'es-ES', parla: 'Habla', ascolto: 'Te escucho…' },
  en: { nome: 'English', voce: 'en-GB', parla: 'Speak', ascolto: 'Listening…' },
  pl: { nome: 'Polski', voce: 'pl-PL', parla: 'Mów', ascolto: 'Słucham…' },
  pt: { nome: 'Português', voce: 'pt-PT', parla: 'Fale', ascolto: 'Estou a ouvir…' },
  bg: { nome: 'Български', voce: 'bg-BG', parla: 'Говорете', ascolto: 'Слушам…' },
  fr: { nome: 'Français', voce: 'fr-FR', parla: 'Parlez', ascolto: 'Je vous écoute…' },
}

export const ELENCO_LINGUE = Object.keys(LINGUE) as Lingua[]

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
