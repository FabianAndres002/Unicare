// Notifiche push sul telefono: chiedere il permesso e iscriversi.
//
// Sull'iPhone le notifiche funzionano solo se Unicare è stata aggiunta alla schermata Home
// (Condividi → "Aggiungi alla schermata Home") e con iOS 16.4 o più recente.

import { api, type IscrizionePush } from './api'

export type StatoNotifiche =
  | 'attive' // tutto a posto
  | 'spente' // si possono attivare con un tocco
  | 'negate' // l'utente ha detto "Non consentire": vanno riattivate dalle impostazioni del telefono
  | 'serve-home' // iPhone: prima va aggiunta alla schermata Home
  | 'non-supportate' // browser troppo vecchio

const iPhone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const installata = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export async function statoNotifiche(): Promise<StatoNotifiche> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return iPhone() && !installata() ? 'serve-home' : 'non-supportate'
  }
  if (Notification.permission === 'denied') return 'negate'
  const registrazione = await navigator.serviceWorker.ready
  const iscrizione = await registrazione.pushManager.getSubscription()
  return iscrizione && Notification.permission === 'granted' ? 'attive' : 'spente'
}

/** La chiave del server, nel formato che vuole il browser. */
function chiaveInByte(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const testo = atob(base64)
  const byte = new Uint8Array(new ArrayBuffer(testo.length))
  for (let i = 0; i < testo.length; i++) byte[i] = testo.charCodeAt(i)
  return byte
}

/**
 * Chiede il permesso, iscrive questo browser e manda l'iscrizione al server.
 * salva: dove registrarla (familiare o telefono dell'anziano).
 */
export async function attivaNotifiche(salva: (s: IscrizionePush) => Promise<void>): Promise<StatoNotifiche> {
  const permesso = await Notification.requestPermission()
  if (permesso !== 'granted') return permesso === 'denied' ? 'negate' : 'spente'
  const registrazione = await navigator.serviceWorker.ready
  let iscrizione = await registrazione.pushManager.getSubscription()
  if (!iscrizione) {
    const { chiave } = await api.push.chiave()
    iscrizione = await registrazione.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chiaveInByte(chiave) })
  }
  await salva(iscrizione.toJSON() as IscrizionePush)
  return 'attive'
}

/** Smette di ricevere notifiche su questo browser. */
export async function spegniNotifiche(): Promise<void> {
  const registrazione = await navigator.serviceWorker.ready
  const iscrizione = await registrazione.pushManager.getSubscription()
  if (!iscrizione) return
  await api.push.cancella(iscrizione.endpoint).catch(() => {})
  await iscrizione.unsubscribe()
}

export const SPIEGAZIONE: Record<StatoNotifiche, string> = {
  attive: 'Le notifiche sono attive su questo telefono.',
  spente: 'Attivale per sapere subito quando c’è bisogno di te.',
  negate: 'Le notifiche sono bloccate. Riattivale dalle impostazioni del telefono, alla voce Unicare o del browser.',
  'serve-home': 'Sull’iPhone: tocca Condividi e poi “Aggiungi alla schermata Home”. Poi apri Unicare dall’icona e attiva le notifiche.',
  'non-supportate': 'Questo browser non riceve notifiche. Prova con Chrome, oppure con Safari aggiornato.',
}
