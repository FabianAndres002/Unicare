// Mettere Unicare sulla schermata Home. Su Android (Chrome) il browser ci offre un evento
// per mostrare la sua finestra "Installa"; su iPhone si fa a mano da Condividi.

type EventoInstalla = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

let evento: EventoInstalla | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    evento = e as EventoInstalla
  })
}

/** Già aperta dall'icona sulla Home? */
export function installata(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

export const suIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const puoInstallareSubito = () => evento !== null

/** Apre la finestra "Installa" del browser (solo Android/Chrome). true se accettata. */
export async function installaOra(): Promise<boolean> {
  if (!evento) return false
  const e = evento
  evento = null
  await e.prompt()
  return (await e.userChoice).outcome === 'accepted'
}
