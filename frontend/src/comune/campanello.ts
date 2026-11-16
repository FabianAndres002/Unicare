// Il campanello di Unicare: un "din-don" allegro per le medicine e gli appuntamenti imminenti.
//
// Quando arriva una notifica importante (insistente) e l'app è aperta, il service worker
// avvisa la pagina, che suona il campanello e fa vibrare il telefono.
// Ad app chiusa suona il suono di notifica del telefono: una web app non può sceglierne un altro.

let audio: HTMLAudioElement | null = null

export function suonaCampanello(): Promise<void> {
  audio ??= new Audio('/suoni/promemoria.mp3')
  audio.volume = 1
  audio.currentTime = 0
  navigator.vibrate?.([500, 200, 500, 200, 900])
  // Il browser può bloccare il suono se sulla pagina non si è ancora toccato niente.
  return audio.play().catch(() => {})
}

/** Da chiamare una volta all'avvio dell'app. */
export function ascoltaNotifiche() {
  navigator.serviceWorker?.addEventListener('message', (e: MessageEvent) => {
    if (e.data?.tipo === 'notifica' && e.data.insistente) void suonaCampanello()
  })
}
