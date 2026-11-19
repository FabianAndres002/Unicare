// Due nonni, un telefono: quale persona sta usando la Senior App adesso.
// Si ricorda sul telefono; una notifica toccata (/senior?persona=12) la cambia da sola.
// Ogni chiamata a /api/senior porta ?persona=<id>, così il server sa per chi è.

const CHIAVE = 'unicare-persona'
let scelta: number | null = null

try {
  const daNotifica = Number(new URLSearchParams(location.search).get('persona'))
  if (daNotifica > 0) localStorage.setItem(CHIAVE, String(daNotifica))
  scelta = Number(localStorage.getItem(CHIAVE)) || null
} catch { /* niente memoria: vale la prima persona */ }

export const personaScelta = () => scelta

export function scegliPersona(id: number) {
  scelta = id
  try { localStorage.setItem(CHIAVE, String(id)) } catch { /* niente */ }
}

/** Aggiunge ?persona= agli indirizzi della Senior App. */
export function conPersona(url: string): string {
  if (!scelta || !url.startsWith('/api/senior')) return url
  return `${url}${url.includes('?') ? '&' : '?'}persona=${scelta}`
}
