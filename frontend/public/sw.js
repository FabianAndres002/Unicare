// Service worker di Unicare.
// È il pezzo che rende l'app installabile e che, dalla settimana 6,
// riceverà le notifiche push anche ad app chiusa.

self.addEventListener('install', () => {
  // Attiva subito la nuova versione senza aspettare la chiusura delle schede.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Notifiche push: per ora mostriamo il testo ricevuto dal backend.
self.addEventListener('push', (event) => {
  const dati = event.data ? event.data.json() : { titolo: 'Unicare', testo: '' };
  event.waitUntil(
    self.registration.showNotification(dati.titolo, {
      body: dati.testo,
      icon: '/icone/icona-192.png',
      data: { url: dati.url || '/' },
    }),
  );
});

// Tocco sulla notifica: apre l'app sulla pagina giusta.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
