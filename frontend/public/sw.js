// Service worker di Unicare.
// Rende l'app installabile e riceve le notifiche push anche ad app chiusa.

self.addEventListener('install', () => {
  // Attiva subito la nuova versione senza aspettare la chiusura delle schede.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Notifiche push.
// - tag: una notifica nuova con lo stesso tag sostituisce la vecchia (niente pile),
//   e con renotify suona e vibra di nuovo (es. "te lo ricordo di nuovo" dopo 15 minuti).
// - insistente (medicine, appuntamento tra poco): resta sullo schermo finché non la si tocca
//   e vibra più a lungo. Se l'app è aperta, suona anche il campanello di Unicare.
self.addEventListener('push', (event) => {
  const dati = event.data ? event.data.json() : { titolo: 'Unicare', testo: '' };
  const opzioni = {
    body: dati.testo,
    icon: '/icone/icona-192.png',
    data: { url: dati.url || '/' },
    vibrate: dati.insistente ? [500, 200, 500, 200, 500, 200, 900] : [200, 100, 200],
  };
  if (dati.tag) {
    opzioni.tag = dati.tag;
    opzioni.renotify = true;
  }
  if (dati.insistente) opzioni.requireInteraction = true;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(dati.titolo, opzioni),
      // Le finestre di Unicare aperte suonano il campanello (il service worker non può suonare da solo).
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
        for (const f of finestre) f.postMessage({ tipo: 'notifica', insistente: !!dati.insistente });
      }),
    ]),
  );
});

// Tocco sulla notifica: porta in primo piano l'app se è già aperta, altrimenti la apre.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((finestre) => {
      const aperta = finestre.find((f) => f.url.startsWith(self.location.origin));
      if (aperta) return aperta.focus().then((f) => (f && 'navigate' in f ? f.navigate(url) : f));
      return self.clients.openWindow(url);
    }),
  );
});
